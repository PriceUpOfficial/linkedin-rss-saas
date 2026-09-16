import "server-only";
import OpenAI from "openai";
import { env } from "@/lib/env";
import type { FeedArticle } from "@/lib/rss";
import type { Database } from "@/lib/database.types";

type GenerationSettings = Database["public"]["Tables"]["generation_settings"]["Row"];

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: env.openaiApiKey });
  }
  return client;
}

const REWRITE_SYSTEM_PROMPT =
  "Sei un giornalista esperto di settore con anni di esperienza. Riscrivi l'articolo fornito in modo professionale, autorevole, coinvolgente e chiaro, aggiungendo un'introduzione accattivante e una conclusione incisiva. Inserisci sempre alla fine una sezione \"Fonti\" con il link originale.";

/** Step 1: turn the raw RSS snippet into a properly written short article. */
export async function rewriteArticle(article: FeedArticle): Promise<string> {
  const res = await getClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: REWRITE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Titolo: ${article.title ?? ""}\nAbstract: ${article.contentSnippet ?? ""}\nLink: ${article.link ?? ""}`,
      },
    ],
  });

  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI non ha restituito testo per la riscrittura dell'articolo.");
  return content;
}

function buildPostSystemPrompt(settings: GenerationSettings | null): string {
  const tone = settings?.tone ?? "professionale";
  const language = settings?.language === "en" ? "inglese" : "italiano";
  const customInstructions = settings?.custom_instructions?.trim();

  return `Scrivi un post per LinkedIn **di almeno 500 caratteri** ispirandoti all'articolo seguente.

NON scrivere un riassunto.
NON usare i due punti per introdurre sezioni (es: "Trend:", "Conclusione:").
NON dividere in sezioni.
NON usare toni scolastici o spiegoni.
NON sembrare un'intelligenza artificiale.
NON commettere errori grammaticali.

Scrivi in ${language} naturale, con un tono ${tone}: comunicativo, brillante, autorevole ma mai arrogante.

Il titolo del post deve essere un hook potente: max 6 parole, evocativo, con 1-2 emoji pertinenti.

Il corpo del post deve:
- essere discorsivo e fluido, come una chiacchierata ispirata;
- rendere chiaro fin da subito qual è la notizia o il tema di cui parla;
- alternare frasi brevi e spazi visivi ben dosati;
- esprimere una riflessione autentica, non una semplice descrizione;
- usare punteggiatura corretta;
- inserire emoji nel testo per dare ritmo, quando aiutano;

Se nel contenuto è citata un'azienda o una persona reale, menzionala in modo naturale.

Chiudi con una domanda implicita o una suggestione (mai una call to action banale), seguita da 5-7 hashtag specifici e ben scelti (mai generici come #travel) e dal link all'articolo originale.

${customInstructions ? `Istruzioni aggiuntive da rispettare sempre: ${customInstructions}\n\n` : ""}Ora scrivi il post.`;
}

/** Step 2: turn the rewritten article into the final LinkedIn post text. */
export async function buildFinalPost(
  rewrittenArticle: string,
  settings: GenerationSettings | null
): Promise<string> {
  const res = await getClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: buildPostSystemPrompt(settings) },
      { role: "user", content: rewrittenArticle },
    ],
  });

  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI non ha restituito testo per il post finale.");
  return content;
}

const IMAGE_PROMPT_SYSTEM_PROMPT =
  "Sei un esperto di visual design per social media. Crea un prompt dettagliato per generare un'immagine professionale, accattivante, realistica che sembri una vera fotografia per un post LinkedIn. Lo stile deve essere moderno, pulito, professionale. L'immagine deve riassumere il senso semantico dell'articolo e includere un breve testo (nella stessa lingua dell'articolo) che richiami il titolo, scritto in modo leggibile su una fascia semi-trasparente che lasci visibili i dettagli della foto. Deve essere il più realistica possibile, senza alcun simbolo che la identifichi come generata da IA.";

/** Step 3a: ask GPT to describe the image to generate. */
export async function generateImagePrompt(article: FeedArticle): Promise<string> {
  const res = await getClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: IMAGE_PROMPT_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Articolo: ${article.title ?? ""}\nContenuto: ${article.contentSnippet ?? ""}`,
      },
    ],
  });

  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI non ha restituito un prompt per l'immagine.");
  return content;
}

/** Step 3b: actually generate the image, returning raw PNG bytes. */
export async function generateImage(prompt: string): Promise<Buffer> {
  const res = await getClient().images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024",
  });

  const image = res.data?.[0];
  if (image?.b64_json) {
    return Buffer.from(image.b64_json, "base64");
  }
  if (image?.url) {
    const fetched = await fetch(image.url);
    if (!fetched.ok) throw new Error(`Impossibile scaricare l'immagine generata (${fetched.status}).`);
    return Buffer.from(await fetched.arrayBuffer());
  }
  throw new Error("OpenAI non ha restituito alcuna immagine.");
}
