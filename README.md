# linkedin-rss-saas

App Next.js 15 (App Router) + Supabase + Tailwind, tutto in un unico extranet:
l'utente accede via email, seleziona a menu le proprie fonti RSS, il tono e la
lingua dei post, quando generarli e se illustrarli, collega LinkedIn con un
OAuth 2.0 personalizzato, e approva/scarta i post generati.

## Architettura

- **Auth**: Supabase Auth, accesso via magic link email (nessuna password).
- **Database**: Supabase Postgres, schema in `supabase/migrations/`, RLS attiva
  su tutte le tabelle.
- **Fetch RSS + generazione testo/immagine**: eseguiti **in-process da questa
  stessa app** (`src/lib/generatePost.ts`), niente servizi esterni da
  orchestrare a mano: `rss-parser` per i feed, l'SDK `openai` per riscrittura,
  post finale e immagine (`gpt-image-1`), upload su Supabase Storage. Si
  attiva cliccando "Genera ora" (`/api/generate`) oppure in automatico via
  cron Vercel (`/api/cron/generate`, orari scelti a menu in Impostazioni).
- **LinkedIn**: OAuth 2.0 custom (non il provider LinkedIn integrato in
  Supabase, che non permette di richiedere lo scope `w_member_social`).
  Vedi `src/lib/linkedin.ts` e `src/app/api/linkedin/*`.
- **Approvazione post**: "Approva" pubblica subito il post su LinkedIn
  (`POST /rest/posts`, con upload preventivo dell'eventuale immagine via
  `POST /rest/images`) usando il token salvato per l'utente, letto
  esclusivamente server-side. Esito: `posted` + `linkedin_post_urn`, oppure
  `failed` + `error_message`. "Scarta" imposta `status = 'rejected'`.

> `n8n/` contiene un adattamento precedente basato su un workflow n8n
> esterno: non è più il percorso attivo (l'app non lo chiama più), ma resta
> come riferimento per un'eventuale futura versione multi-tenant su larga
> scala. Vedi `n8n/README.md`.

## Struttura del progetto

```
src/
  app/
    login/                    pagina di login (magic link)
    auth/callback/route.ts    scambio codice -> sessione Supabase
    api/linkedin/connect/     step 1 OAuth LinkedIn (redirect ad authorize)
    api/linkedin/callback/    step 2 OAuth LinkedIn (scambio code -> token)
    api/generate/route.ts     "Genera ora": esegue la pipeline per l'utente loggato
    api/cron/generate/route.ts  cron orario: esegue la pipeline per gli utenti in schedule_hours
    dashboard/
      feeds/                  CRUD feed RSS (con fonti predefinite a menu)
      linkedin/               stato connessione LinkedIn
      posts/                  lista post generati, Genera ora / Approva / Scarta
      settings/               tono, lingua, orari di generazione, immagine on/off, istruzioni custom
  lib/
    supabase/{server,client,admin}.ts
    linkedin.ts                helper OAuth + pubblicazione post (+ upload immagine)
    rss.ts                     parsing feed RSS/Atom
    openai.ts                  riscrittura articolo, post finale, prompt e generazione immagine
    generatePost.ts            orchestrazione dell'intera pipeline di generazione
    storage.ts                 upload immagine su Supabase Storage
    database.types.ts          tipi TypeScript per le tabelle
supabase/migrations/           schema SQL (RLS inclusa)
vercel.json                    cron orario per la generazione automatica
n8n/                            (legacy, non piu' collegato) adattamento su workflow n8n esterno
```

## Setup

1. **Supabase**
   - Crea un progetto Supabase.
   - Applica le migration in ordine: `supabase db push` (con Supabase CLI
     collegata al progetto) oppure incolla il contenuto dei file in
     `supabase/migrations/` (in ordine di data) nello SQL Editor.
   - In *Authentication → URL Configuration* aggiungi come Redirect URL:
     `http://localhost:3000/auth/callback` (e l'equivalente in produzione).

2. **App LinkedIn**
   - Crea un'app su [LinkedIn Developers](https://www.linkedin.com/developers/apps).
   - Prodotti richiesti: *Sign In with LinkedIn using OpenID Connect* e
     *Share on LinkedIn* (per lo scope `w_member_social`).
   - Redirect URL autorizzato: deve combaciare esattamente con
     `LINKEDIN_REDIRECT_URI` (es. `http://localhost:3000/api/linkedin/callback`).

3. **OpenAI**
   - Crea una API key su [platform.openai.com](https://platform.openai.com/api-keys).
   - Serve accesso a `gpt-4o` (testo) e `gpt-image-1` (immagini); su un
     account nuovo potrebbe servire completare la verifica organizzazione
     per sbloccare `gpt-image-1`.

4. **Variabili d'ambiente**

   Copia `.env.example` in `.env.local` e compila tutti i valori (incluso
   `CRON_SECRET`: una stringa a caso generata da te, va impostata identica
   anche su Vercel).

5. **Installazione e avvio**

   ```bash
   npm install
   npm run dev
   ```

6. **Cron di produzione**: `vercel.json` registra `/api/cron/generate` ogni
   ora; Vercel invia automaticamente `Authorization: Bearer $CRON_SECRET` se
   la env var `CRON_SECRET` è impostata sul progetto. Sul piano **Hobby**
   Vercel limita i cron a 1 esecuzione al giorno: per generare più volte al
   giorno come da Impostazioni serve il piano **Pro**.

## Nota sulla versione di Next.js

Il progetto è stato aggiornato da Next.js 14 a **Next.js 15** (`15.5.25`,
l'ultima patch stabile), che include le fix per le CVE critiche rilasciate
ad agosto 2026 (RCE nell'Image Optimization API con file AVIF, RCE su
Windows) — sulla serie 14.x non esiste una patch per queste.

Breaking change dell'App Router sistemati durante la migrazione:
- `cookies()` (in `src/lib/supabase/server.ts`) è ora asincrono: `createClient()`
  lato server è diventato `async` e ogni chiamata nel codice usa
  `await createClient()`.
- `searchParams` nelle pagine (`/login`, `/dashboard/linkedin`) è ora una
  `Promise` invece di un oggetto sincrono: entrambe le pagine fanno
  `await searchParams` prima di leggerne i campi.
- Il progetto non ha route dinamiche (`[id]`), quindi non è stato necessario
  aggiornare `params`.
- React resta sulla 18.3 (Next 15 supporta sia React 18 che 19 in App
  Router); nessuna modifica necessaria lato componenti per questo.

## Note di sicurezza

- Il service role key non viene mai usato lato client; l'unico client
  browser (`src/lib/supabase/client.ts`) usa esclusivamente l'anon key.
- I token LinkedIn (`linkedin_accounts.access_token` / `refresh_token`)
  vengono letti solo in Server Actions / Route Handler, mai esposti al
  browser.
- Ogni tabella ha RLS attiva; le policy di update usano sia `USING` che
  `WITH CHECK (auth.uid() = user_id)` per impedire il cambio di proprietario
  di una riga durante un update.
