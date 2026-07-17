import type { DifficultyKey } from "@needs-two/shared";
import { ArrowLeft, Play, Shuffle } from "lucide-react";
import { useState } from "react";
import { s } from "../../socialI18n";
import { puzzleImageUrl } from "../../puzzleAssets";

const puzzles = ["cottage","red-panda","pond","mountain-lake","seaside-cove","autumn-forest","snowy-village","flower-field","waterfall","balloon-valley","sleepy-fox","cozy-cat"];

export function SoloModeSetup({ registered, onBack, onStart }: {
  registered: boolean; onBack: () => void; onStart: (difficulty: DifficultyKey, puzzleId: string | null) => Promise<void>;
}) {
  const [difficulty, setDifficulty] = useState<DifficultyKey>("normal");
  const [puzzle, setPuzzle] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function start() { setBusy(true); await onStart(difficulty, puzzle); setBusy(false); }
  return (
    <main className="solo-setup-screen">
      <header><button className="icon-button" onClick={onBack} aria-label={s("back")}><ArrowLeft size={20} /></button><span>Needs Two · {s("soloMode")}</span></header>
      <section className="solo-setup-card social-card enter-card">
        <div><span className="section-eyebrow">{s("soloMode")}</span><h1>{s("soloSetup")}</h1></div>
        {!registered && <p className="guest-solo-notice">{s("soloGuest")}</p>}
        <fieldset className="difficulty-picker"><legend>{s("difficulty")}</legend><div>
          {(["easy","normal","hard","expert"] as DifficultyKey[]).map((key) => <button key={key} className={difficulty === key ? "is-selected" : ""}
            onClick={() => setDifficulty(key)} aria-pressed={difficulty === key}><strong>{s(key)}</strong></button>)}
        </div></fieldset>
        <fieldset className="solo-image-picker"><legend>{s("image")}</legend><div>
          <button className={"solo-image-option is-random " + (puzzle === null ? "is-selected" : "")} onClick={() => setPuzzle(null)} aria-pressed={puzzle === null}><Shuffle size={22} /><span>{s("randomImage")}</span></button>
          {puzzles.map((id) => <button key={id} className={"solo-image-option " + (puzzle === id ? "is-selected" : "")} onClick={() => setPuzzle(id)} aria-label={id} aria-pressed={puzzle === id}>
            <img src={puzzleImageUrl(id)} alt="" /></button>)}
        </div></fieldset>
        <button className="button button-primary solo-start-button" onClick={() => void start()} disabled={busy}><Play size={20} />{s("start")}</button>
      </section>
    </main>
  );
}
