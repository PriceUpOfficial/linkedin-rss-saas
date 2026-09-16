# Workflow n8n: generazione post da RSS

`rss-to-linkedin-generate.json` è l'adattamento del workflow originale
"Post Linkedin Pietro Tommasi": legge i feed RSS **per utente** da Supabase,
seleziona il miglior articolo nuovo, genera testo (GPT-4o + GPT-4) e
immagine (gpt-image-1), carica l'immagine su Supabase Storage e scrive il
risultato in `generated_posts` con `status = 'pending'`. **Non pubblica più
nulla direttamente su LinkedIn**: la pubblicazione avviene dall'app Next.js
solo dopo che l'utente clicca "Approva".

> ⚠️ Questo JSON non è stato eseguito su un'istanza n8n reale in questa
> sessione (non ne avevo una disponibile). È un adattamento fedele e
> ragionato del vostro export, ma **va importato e verificato nell'editor
> prima di attivarlo** — vedi la checklist in fondo.

## Cosa cambia rispetto all'originale

| Prima | Ora |
|---|---|
| 2 feed RSS hardcoded (`Edit Fields`) | Letti da `rss_feeds` per `user_id`, solo quelli `is_active = true` |
| "Remove Duplicates" (bug: cancellava lo storico invece di controllarlo) | Confronto reale contro `feed_items.guid` per quell'utente |
| Solo Schedule Trigger (5x/giorno, workflow unico) | Schedule Trigger (gira per **tutti** gli utenti con feed attivi) **+** Webhook per il bottone "Genera ora" (un utente alla volta) |
| `Create a post` pubblica direttamente su LinkedIn | Scrive in `generated_posts` (`status: 'pending'`); pubblica l'app dopo l'approvazione |
| Persona "Pietro Tommasi" fissa | Prompt invariato; `generation_settings` (tono, lingua, istruzioni custom) è già letto da Supabase ma **non ancora iniettato** nel prompt (vedi nota nel canvas) |

## Setup nell'istanza n8n

1. **Importa** `rss-to-linkedin-generate.json` (Import from File / paste JSON).
2. **Variabili d'ambiente** (self-hosted: file `.env` di n8n; n8n Cloud: Settings → Variables):
   - `SUPABASE_URL` — es. `https://xxxx.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` — la service role key del progetto (mai l'anon key: deve bypassare le RLS per scrivere per conto di qualunque utente)
   - Su **n8n Cloud**, se `$env` non è abilitato per il tuo piano, sostituisci `$env.SUPABASE_URL` / `$env.SUPABASE_SERVICE_ROLE_KEY` con `$vars.SUPABASE_URL` / `$vars.SUPABASE_SERVICE_ROLE_KEY` in tutti i nodi HTTP Request (sono 8: cercali con "Supabase" nell'URL).
3. **Credenziale OpenAI**: riusa quella già collegata (`OpenAi account`), oppure ricollegala se l'ID credenziale non esiste su questa istanza.
4. **Attiva il nodo Webhook** (`Webhook: Genera Ora`), copia la sua **Production URL** e impostala come `N8N_GENERATE_WEBHOOK_URL` nel `.env` dell'app Next.js.
5. **Attiva il workflow.**

## Checklist da verificare nell'editor prima di attivare

Non avendo potuto testarlo dal vivo, questi sono i punti con più incertezza — apri ogni nodo e conferma:

- **Tutti i nodi HTTP Request verso Supabase** (`Get Feeds For Schedule`, `Get Generation Settings`, `Get Active Feeds`, `Get Existing Guids`, `Upload Image To Storage`, `Insert Feed Item`, `Insert Generated Post`): URL corretto, header `apikey`/`Authorization`, e per i due `Insert *` controlla che il campo **"Specify Body" sia impostato su JSON** con l'espressione già presente — a seconda della versione di n8n il nome del campo interno potrebbe non essere popolato automaticamente all'import.
- **`Upload Image To Storage`**: verifica che "Send Binary Data" / "Input Data Field Name" punti al campo binario in uscita da `Crop Watermark Area` (di norma si chiama `data`).
- **`Tag Feed Source`**: usa `$('Split Feeds').item` per recuperare `feed_id`/`url`/`user_id` dell'articolo corrente — dipende dal tracciamento `pairedItem` del nodo RSS Feed Read. Esegui un test con un solo feed attivo e controlla che i tre campi non risultino vuoti.
- **`Score And Filter New Articles`**: referenzia `$('Get Existing Guids')` da un ramo parallelo (non un antenato diretto) — in n8n è supportato, ma verificalo con un'esecuzione di test.
- **`Merge Text and Image`**: indice 0 = testo (`Message a model1`), indice 1 = immagine caricata (`Upload Image To Storage`); se l'ordine risulta invertito nell'editor, correggilo.
- **Bucket Storage `post-images`**: creato dalla migration `supabase/migrations/20260916000000_add_post_images.sql` — se non l'hai ancora applicata su Supabase, l'upload immagine fallirà con 404/400.

## Personalizzazione non ancora collegata

`Get Generation Settings` interroga già `generation_settings` per l'utente
(tono, lingua, `posts_per_day`, `custom_instructions`), ma il risultato non è
ancora iniettato nel prompt di `Message a model1` — il testo del post resta
quello della persona "Pietro Tommasi" originale per tutti gli utenti. Se
vuoi renderlo davvero multi-tenant, il prossimo passo è aggiungere
un'espressione nel system message che appenda `custom_instructions` (e
adatti tono/lingua) leggendo `$('Get Generation Settings').item.json`.
