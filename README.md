# Needs Two

Puzzle cooperativo online per due giocatori. La board, il turno e il timer sono gestiti dal server; i client inviano soltanto richieste di movimento validate dal server.

## Requisiti

- Node.js 20 o successivo
- npm 10 o successivo

## Installazione e avvio

```bash
cd C:\Users\Marco\needs-two
npm install
npm run dev
```

Il comando avvia:

- client Vite: `http://localhost:5173`
- server Socket.IO: `http://localhost:3001`
- health check: `http://localhost:3001/health`

Apri il client in due browser (oppure in una finestra normale e una anonima), crea una stanza nel primo e inserisci il codice nel secondo.

Per avviare i processi separatamente:

```bash
npm run dev -w server
npm run dev -w client
```

Per usare URL o porte differenti:

```powershell
$env:PORT=4001
$env:CLIENT_ORIGIN="http://localhost:4173"
npm run dev -w server

$env:VITE_SERVER_URL="http://localhost:4001"
npm run dev -w client -- --port 4173
```

## Verifica

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e # con client e server gia avviati tramite npm run dev
```

I test includono 250 puzzle generati con verifica di risolvibilità, un test Socket.IO con due client reali e un test Playwright end-to-end in due contesti browser.

## Immagini puzzle

Le 33 immagini sono in `client/public/puzzles`. Le prime tre sono:

- `cottage.png`
- `red-panda.png`
- `pond.png`

Per sostituirle, mantieni immagini quadrate e gli stessi nomi. Per aggiungerne altre, inserisci il file nella stessa cartella e aggiungi il suo nome senza estensione a `PUZZLE_IDS` in `server/src/puzzle.ts`. Il client usa automaticamente l'URL `/puzzles/<puzzleId>.png` e suddivide l'immagine con `background-position`.

## Struttura

```text
needs-two/
├── client/
│   ├── public/puzzles/       # illustrazioni locali
│   └── src/
│       ├── components/       # schermate, board, timer, modali
│       ├── hooks/            # Socket.IO e audio opzionale
│       └── styles/           # stile e animazioni responsive
├── server/
│   ├── src/
│   │   ├── app.ts            # eventi Socket.IO e server HTTP
│   │   ├── roomManager.ts    # stanze, timer, turni e riconnessioni
│   │   └── puzzle.ts         # shuffle risolvibile e validazione mosse
│   └── tests/                # test logica e multiplayer
├── shared/src/               # tipi ed eventi condivisi
└── package.json              # workspace e comandi comuni
```

## Regole implementate

- Stanze da massimo due giocatori con codice di 6 caratteri non ambiguo.
- Puzzle 4×4 sempre risolvibile, creato tramite una lunga sequenza di mosse valide.
- Turni server-side da 7 secondi e transizione bloccante da 800 ms.
- Più mosse valide consentite nello stesso turno.
- Pausa immediata alla disconnessione e finestra di riconnessione di 30 secondi.
- Rivincita quando entrambi i giocatori la richiedono.
- Controlli tastiera, focus visibile e supporto a `prefers-reduced-motion`.

## Pubblicazione

Il comando `npm run deploy:pages` pubblica il client sul ramo `gh-pages`. Il multiplayer richiede anche il server Node persistente: `render.yaml` contiene una configurazione pronta per Render. Dopo il deploy del server, imposta `VITE_SERVER_URL` con l'URL HTTPS del servizio ed esegui di nuovo `npm run deploy:pages`.