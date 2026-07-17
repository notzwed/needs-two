# Needs Two

Needs Two è una piattaforma puzzle sociale cozy con React, TypeScript, Vite e Supabase. Offre stanze amico per ospiti o account, matchmaking casuale, modalità Solo, profili personalizzabili, REP, statistiche e medaglie. Board, timer, risultati e ricompense multiplayer restano autoritativi sul database.

Gioco pubblico: https://notzwed.github.io/needs-two/

## Requisiti

- Node.js 20 o successivo
- npm 10 o successivo
- un progetto Supabase
- Supabase CLI

## Installazione

~~~powershell
cd C:\Users\Marco\needs-two
npm install
Copy-Item client/.env.example client/.env.local
~~~

Configura client/.env.local:

~~~env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
~~~

La chiave publishable è prevista nel browser. Non inserire password PostgreSQL o service-role key nel client.

## Database e Auth

~~~powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --linked
npx supabase config push --project-ref YOUR_PROJECT_REF
~~~

Le migration creano profili pubblici senza email, statistiche separate, match Solo/Friend/Random, storico REP univoco, 12 badge, coda matchmaking, Storage avatar e RPC autoritative.

supabase/config.toml imposta password di almeno 8 caratteri con lettere e numeri, redirect localhost/GitHub Pages e registrazione senza conferma email. Per richiedere la verifica email, abilita auth.email.enable_confirmations e aggiungi una schermata di conferma.

## Avvio locale

~~~powershell
npm run dev
~~~

Apri http://localhost:5173. Per stanze o matchmaking usa due profili browser distinti.

Il server Node/Socket.IO storico resta disponibile per test locali:

~~~powershell
npm run dev:server
~~~

Il client pubblico usa Supabase RPC e Realtime.

## Modalità

- Gioca con un amico: ospiti e account possono creare o entrare tramite codice.
- Solo: Easy 3×3, Normal 4×4, Hard 5×5, Expert 6×6; immagine selezionabile o casuale; pausa e timer da 10 minuti.
- Trova un giocatore: solo account; range ±150 REP, ±400 dopo 20 secondi, senza limite rigido dopo 35 secondi.

I turni multiplayer durano 10 secondi e la partita 10 minuti.

## REP

Il database calcola:

~~~text
(base difficoltà + bonus velocità + bonus collaborazione)
x moltiplicatore modalità
x protezione farming
~~~

Base: Easy 10, Normal 18, Hard 28, Expert 40. Velocità: +30%, +20%, +10% o 0%. Moltiplicatori: Solo 0,8; Friend 1,0; Random 1,15. Dopo tre ricompense sullo stesso puzzle in 24 ore il farming scende a 0,25. Partite incomplete o abbandonate non assegnano REP.

Livelli: Beginner, Solver, Partner, Linker, Master Pair e Twofold.

## Badge

First Piece, Perfect Pair, Speedy Solver, Random Friend, Solo Mind, Hundred Club, Thousand Club, No Mistakes, Night Solver, Comeback, Loyal Partner e Puzzle Master.

Ogni badge ha requisito, progresso server-side, data di sblocco e silhouette bloccata. Il profilo può mostrarne tre e sceglierne uno principale.

## Avatar e puzzle

- Avatar preimpostati: shared/src/social.ts
- Upload custom: bucket needs-two-avatars
- Puzzle locali: client/public/puzzles
- Catalogo Solo: client/src/components/social/SoloModeSetup.tsx
- URL puzzle: client/src/puzzleAssets.ts

L’upload accetta PNG/JPG/WebP fino a 5 MB, applica crop quadrato, resize 512×512, conversione WebP e rimozione metadata tramite ricodifica.

## Struttura

~~~text
needs-two/
|-- client/src/
|   |-- auth/AuthContext.tsx
|   |-- components/social/   # auth, profilo, badge, intro, Solo, matchmaking
|   |-- hooks/               # multiplayer, Solo e matchmaking
|   |-- socialI18n.ts
|   |-- socialUtils.ts
|   +-- styles/social.css
|-- shared/src/social.ts
|-- supabase/migrations/
|-- server/tests/social.test.ts
+-- e2e/social.spec.ts
~~~

## Verifica

~~~powershell
npm run typecheck
npm test
npm run build
npm run test:e2e
npx supabase db lint --linked --level warning
~~~

I test coprono nickname, REP, farming, livelli, badge, matchmaking, shuffle risolvibile 3×3–6×6, vincoli database, ospiti, registrazione, sessione, upload avatar, logout/login, responsive, due account in random pairing, intro cooperativa e un Solo Easy completato realmente via UI con REP/statistiche/badge.

## Pubblicazione GitHub Pages

~~~powershell
npm run deploy:pages
~~~

Il comando pubblica client/dist sul ramo gh-pages. Supabase ospita Auth, database, Storage, RPC e Realtime; GitHub Pages ospita soltanto gli asset statici.
