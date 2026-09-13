# linkedin-rss-saas

App Next.js 14 (App Router) + Supabase + Tailwind: gli utenti accedono via email,
gestiscono una lista di feed RSS, collegano LinkedIn con un flusso OAuth 2.0
personalizzato (scope `openid profile w_member_social`) e approvano/scartano i
post generati da un workflow n8n esterno.

## Architettura

- **Auth**: Supabase Auth, accesso via magic link email (nessuna password).
- **Database**: Supabase Postgres, schema in `supabase/migrations/`, RLS attiva
  su tutte le tabelle.
- **Fetch RSS + generazione testo**: gestiti interamente da un workflow **n8n
  esterno**, che legge/scrive su Supabase con la service role key. Questa app
  non fa parsing di feed né chiamate LLM: si limita a chiamare il webhook n8n
  (`N8N_GENERATE_WEBHOOK_URL`) quando l'utente clicca "Genera ora".
- **LinkedIn**: OAuth 2.0 custom (non il provider LinkedIn integrato in
  Supabase, che non permette di richiedere lo scope `w_member_social`).
  Vedi `src/lib/linkedin.ts` e `src/app/api/linkedin/*`.
- **Approvazione post**: "Approva" pubblica subito il post su LinkedIn
  (`POST /rest/posts`) usando il token salvato per l'utente, letto
  esclusivamente server-side. Esito: `posted` + `linkedin_post_urn`, oppure
  `failed` + `error_message`. "Scarta" imposta `status = 'rejected'`.

## Struttura del progetto

```
src/
  app/
    login/                    pagina di login (magic link)
    auth/callback/route.ts    scambio codice -> sessione Supabase
    api/linkedin/connect/     step 1 OAuth LinkedIn (redirect ad authorize)
    api/linkedin/callback/    step 2 OAuth LinkedIn (scambio code -> token)
    api/generate/route.ts     chiama il webhook n8n
    dashboard/
      feeds/                  CRUD feed RSS
      linkedin/               stato connessione LinkedIn
      posts/                  lista post generati, Genera ora / Approva / Scarta
      settings/               tono, lingua, post/giorno, istruzioni custom
  lib/
    supabase/{server,client,admin}.ts
    linkedin.ts                helper OAuth + pubblicazione post
    database.types.ts          tipi TypeScript per le tabelle
supabase/migrations/           schema SQL (RLS inclusa)
```

## Setup

1. **Supabase**
   - Crea un progetto Supabase.
   - Applica la migration: `supabase db push` (con Supabase CLI collegata al
     progetto) oppure incolla il contenuto di
     `supabase/migrations/20260913000000_init_schema.sql` nello SQL Editor.
   - In *Authentication → URL Configuration* aggiungi come Redirect URL:
     `http://localhost:3000/auth/callback` (e l'equivalente in produzione).

2. **App LinkedIn**
   - Crea un'app su [LinkedIn Developers](https://www.linkedin.com/developers/apps).
   - Prodotti richiesti: *Sign In with LinkedIn using OpenID Connect* e
     *Share on LinkedIn* (per lo scope `w_member_social`).
   - Redirect URL autorizzato: deve combaciare esattamente con
     `LINKEDIN_REDIRECT_URI` (es. `http://localhost:3000/api/linkedin/callback`).

3. **n8n**
   - Il workflow deve esporre un webhook che accetta `POST { user_id }` e, in
     modo asincrono, scrive righe in `feed_items` e `generated_posts` per
     quell'utente usando la service role key di Supabase.

4. **Variabili d'ambiente**

   Copia `.env.example` in `.env.local` e compila tutti i valori.

5. **Installazione e avvio**

   ```bash
   npm install
   npm run dev
   ```

## Nota sulla versione di Next.js

Il progetto usa la serie **Next.js 14** (`14.2.35`, l'ultima patch disponibile
su questa major) come richiesto. Ad agosto 2026 Vercel ha rilasciato fix per
due CVE critiche (RCE nell'Image Optimization API con file AVIF, RCE su
Windows) solo per le serie 15.5.24+ e 16.3.3+: sulla 14.x non esiste una
patch. Questa app non usa `next/image` né la route `/next/image`, quindi la
superficie d'attacco specifica (Image Optimization API) non è esposta; se in
futuro si introduce `next/image` o si serve pubblicamente questa build,
valutare la migrazione a Next.js 15/16.

## Note di sicurezza

- Il service role key non viene mai usato lato client; l'unico client
  browser (`src/lib/supabase/client.ts`) usa esclusivamente l'anon key.
- I token LinkedIn (`linkedin_accounts.access_token` / `refresh_token`)
  vengono letti solo in Server Actions / Route Handler, mai esposti al
  browser.
- Ogni tabella ha RLS attiva; le policy di update usano sia `USING` che
  `WITH CHECK (auth.uid() = user_id)` per impedire il cambio di proprietario
  di una riga durante un update.
