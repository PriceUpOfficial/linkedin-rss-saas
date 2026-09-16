import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchFeedItems, type FeedArticle } from "@/lib/rss";
import { rewriteArticle, buildFinalPost, generateImagePrompt, generateImage } from "@/lib/openai";
import { uploadGeneratedImage } from "@/lib/storage";

const SCORING_KEYWORDS = [
  "hotel", "travel", "revenue", "strategy", "trend", "ai", "startup", "tip",
  "price", "pricing", "ota", "loyalty", "experience", "expedia", "booking.com", "airbnb",
];

interface ScoredArticle extends FeedArticle {
  feedId: string;
  score: number;
}

function scoreArticles(articles: Array<FeedArticle & { feedId: string }>): ScoredArticle[] {
  return articles
    .map((article) => {
      const content = `${article.title ?? ""} ${article.contentSnippet ?? ""}`.toLowerCase();
      const score = SCORING_KEYWORDS.reduce((total, keyword) => (content.includes(keyword) ? total + 1 : total), 0);
      return { ...article, score };
    })
    .sort((a, b) => b.score - a.score);
}

export type GenerateResult =
  | { status: "created"; postId: string }
  | { status: "no_active_feeds" }
  | { status: "no_new_articles" };

/**
 * The whole "Genera ora" pipeline, run in-process (no n8n): fetch every
 * active feed for this user, pick the best new article, write it up with
 * OpenAI, optionally illustrate it, and save a pending generated_posts row.
 * Uses the service-role client throughout since a cron-triggered run has no
 * logged-in user session to scope queries to.
 */
export async function generatePostForUser(userId: string): Promise<GenerateResult> {
  const supabase = createAdminClient();

  const [{ data: feeds, error: feedsError }, { data: settings }, { data: existingItems }] = await Promise.all([
    supabase.from("rss_feeds").select("id, url").eq("user_id", userId).eq("is_active", true),
    supabase.from("generation_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("feed_items").select("guid").eq("user_id", userId),
  ]);

  if (feedsError) throw new Error(`Impossibile leggere i feed RSS: ${feedsError.message}`);
  if (!feeds || feeds.length === 0) {
    return { status: "no_active_feeds" };
  }

  const existingGuids = new Set((existingItems ?? []).map((item) => item.guid));

  const fetchedByFeed = await Promise.all(
    feeds.map(async (feed) => {
      try {
        const items = await fetchFeedItems(feed.url);
        return items
          .filter((item) => !existingGuids.has(item.guid))
          .map((item) => ({ ...item, feedId: feed.id }));
      } catch (err) {
        // A single unreachable/malformed feed shouldn't block the others.
        console.error(`Feed non raggiungibile (${feed.url}):`, err);
        return [];
      }
    })
  );

  const newArticles = fetchedByFeed.flat();
  if (newArticles.length === 0) {
    return { status: "no_new_articles" };
  }

  const [winner] = scoreArticles(newArticles);

  const generateImageEnabled = settings?.generate_image ?? true;

  const [postText, imageUrl] = await Promise.all([
    rewriteArticle(winner).then((rewritten) => buildFinalPost(rewritten, settings ?? null)),
    generateImageEnabled
      ? generateImagePrompt(winner)
          .then(generateImage)
          .then((bytes) => uploadGeneratedImage(supabase, userId, bytes))
          .catch((err) => {
            // Best-effort: a post without an image is still useful, so don't
            // fail the whole run just because illustration failed.
            console.error("Generazione immagine fallita:", err);
            return null;
          })
      : Promise.resolve(null),
  ]);

  const { data: feedItem, error: feedItemError } = await supabase
    .from("feed_items")
    .insert({
      feed_id: winner.feedId,
      user_id: userId,
      guid: winner.guid,
      title: winner.title ?? null,
      link: winner.link ?? null,
      summary: winner.contentSnippet ?? null,
      published_at: winner.isoDate ?? null,
    })
    .select("id")
    .single();

  if (feedItemError) throw new Error(`Impossibile salvare l'articolo selezionato: ${feedItemError.message}`);

  const { data: post, error: postError } = await supabase
    .from("generated_posts")
    .insert({
      user_id: userId,
      feed_item_id: feedItem.id,
      content: postText,
      image_url: imageUrl,
      status: "pending",
    })
    .select("id")
    .single();

  if (postError) throw new Error(`Impossibile salvare il post generato: ${postError.message}`);

  return { status: "created", postId: post.id };
}
