import "server-only";
import Parser from "rss-parser";

export interface FeedArticle {
  guid: string;
  title?: string;
  link?: string;
  contentSnippet?: string;
  isoDate?: string;
}

const parser = new Parser({ timeout: 15_000 });

/**
 * Fetches and parses one RSS/Atom feed. Returns a normalized list of
 * articles; a feed that's down or malformed throws — callers should catch
 * per-feed so one bad source doesn't stop generation for the others.
 */
export async function fetchFeedItems(feedUrl: string): Promise<FeedArticle[]> {
  const feed = await parser.parseURL(feedUrl);

  return (feed.items ?? [])
    .filter((item) => Boolean(item.guid || item.link || item.id))
    .map(
      (item): FeedArticle => ({
        guid: (item.guid || item.link || item.id) as string,
        title: item.title,
        link: item.link,
        contentSnippet: item.contentSnippet || item.content,
        isoDate: item.isoDate,
      })
    );
}
