# Needs Two

Puzzle cooperativo online per due giocatori. Il database Supabase gestisce in modo autoritativo stanze, board, turni da 7 secondi, partita da 7 minuti, timer, mosse, pause e rivincite; il client React invia soltanto richieste validate da funzioni PostgreSQL.

Gioco pubblico: <https://notzwed.github.io/needs-two/>

## Requisiti

- Node.js 20 o successivo
- npm 10 o successivo
- un progetto Supabase per il multiplayer pubblico

## Installazione

```powershell
cd C:\Users\Marco\needs-two
npm install
Copy-Item client/.env.example client/.env.local
```

Configura `client/.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Le chiavi `sb_publishable_...` sono destinate al browser. La sicurezza non dipende dal segreto della chiave: le tabelle hanno RLS attivo, non sono leggibili direttamente e tutte le modifiche passano dalle RPC validate.

## Database Supabase

Dopo il login CLI, collega il progetto e applica le migration:

```powershell
npx supabase login
npm run supabase:link
npm run supabase:push
```

La migration principale è in `supabase/migrations/20260715213353_needs_two_multiplayer.sql`. Implementa codici stanza, massimo due giocatori, heartbeat, riconnessione, shuffle risolvibile, mosse e timer autoritativi.

## Avvio locale

```powershell
npm run dev
```

Apri <http://localhost:5173> in due browser, oppure in una finestra normale e una anonima. Crea una stanza nel primo browser e inserisci il codice nel secondo.

Il server Node/Socket.IO originale resta disponibile come implementazione locale separata:

```powershell
npm run dev:server
```

## Verifica

```powershell
npm run typecheck
npm test
npm run build
npm run test:e2e
```

I test server verificano anche centinaia di puzzle generati tramite sequenze di mosse valide. Il test Playwright apre due contesti browser e controlla stanza condivisa, blocco del giocatore non attivo, sincronizzazione della mossa, timer, maschera del turno e layout mobile.

## Immagini puzzle

Le 33 illustrazioni quadrate sono in `client/public/puzzles`. Per sostituirle, mantieni gli stessi nomi e preferibilmente il formato PNG quadrato.

Per aggiungere una nuova immagine:

1. Inserisci il file in `client/public/puzzles`.
2. Aggiungi il nome senza estensione a `PUZZLE_IDS` in `server/src/puzzle.ts`.
3. Aggiungi lo stesso ID all'array della funzione `needs_two_puzzle_id` nella migration Supabase.

Il client suddivide automaticamente ogni immagine 4x4 tramite `background-position`.

## Struttura

```text
needs-two/
|-- client/
|   |-- public/puzzles/       # 33 illustrazioni locali
|   `-- src/
|       |-- components/       # schermate, board, timer e modali
|       |-- hooks/            # Supabase Realtime e audio opzionale
|       `-- styles/           # stile e animazioni responsive
|-- server/
|   |-- src/                  # backend Node/Socket.IO locale
|   `-- tests/                # logica puzzle e multiplayer
|-- shared/src/               # tipi condivisi
|-- supabase/
|   `-- migrations/           # schema e RPC autoritative
|-- e2e/                      # test Playwright con due browser
`-- package.json
```

## Pubblicazione GitHub Pages

Con le variabili Supabase presenti in `client/.env.local`:

```powershell
npm run deploy:pages
```

Il comando crea la build con base `/needs-two/` e pubblica `client/dist` sul ramo `gh-pages`. Nessuna password PostgreSQL o chiave privata viene inclusa nella build.