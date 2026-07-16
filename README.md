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

I test server verificano anche centinaia di puzzle generati tramite sequenze di mosse valide. Il test Playwright apre due contesti browser e controlla stanza condivisa, chat testuale, voce WebRTC, blocco del giocatore non attivo, sincronizzazione della mossa, timer, maschera del turno e layout mobile.

## Immagini e layout puzzle

Le 53 illustrazioni locali sono in client/public/puzzles: 33 puzzle quadrati 4×4 originali, 10 quadrati 8×8 e 10 rettangolari in formato WebP.

Il prefisso dell'ID determina automaticamente il layout:

- square8-: board quadrata 8×8, 64 celle.
- rect-: board 3:2 con griglia 5×4 e tasselli rettangolari.
- Senza prefisso: board quadrata 4×4 originale.

Il server e Supabase scelgono sempre casualmente l'immagine e il layout; non esiste un selettore client. Ogni configurazione viene mescolata partendo dalla soluzione e applicando soltanto mosse valide.

Per aggiungere un'immagine, inserisci il file in client/public/puzzles, registra l'ID in PUZZLE_IDS e nella funzione needs_two_puzzle_id della migrazione Supabase.
## Struttura

```text
needs-two/
|-- client/
|   |-- public/puzzles/       # 73 illustrazioni locali
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


## Tema, audio e lingua

La modalità notturna è disponibile in tutte le schermate e viene ricordata nel browser. Il controllo audio durante la partita attiva o disattiva soltanto gli effetti sonori di movimento, cambio turno e completamento; non è presente musica di sottofondo.

L'interfaccia rileva automaticamente navigator.languages. Italiano e inglese sono completi, con fallback inglese per le altre lingue. Tutte le stringhe visibili, i messaggi di errore e le etichette accessibili sono centralizzati in client/src/i18n.ts, dove si possono aggiungere altre lingue senza modificare i componenti.
## Pubblicazione GitHub Pages

Con le variabili Supabase presenti in `client/.env.local`:

```powershell
npm run deploy:pages
```

Il comando crea la build con base `/needs-two/` e pubblica `client/dist` sul ramo `gh-pages`. Nessuna password PostgreSQL o chiave privata viene inclusa nella build.