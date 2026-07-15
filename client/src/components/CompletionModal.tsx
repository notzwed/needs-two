import { Home, RotateCcw } from "lucide-react";

interface CompletionModalProps {
  elapsedMs: number;
  moves: number;
  rematchReady: boolean;
  onRematch: () => void;
  onHome: () => void;
}

function formatTime(milliseconds: number) {
  const totalSeconds = Math.round(milliseconds / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function CompletionModal({ elapsedMs, moves, rematchReady, onRematch, onHome }: CompletionModalProps) {
  return (
    <div className="modal-backdrop">
      <section className="completion-card enter-card" role="dialog" aria-modal="true" aria-labelledby="complete-title">
        <span className="success-mark" aria-hidden="true">✓</span>
        <h2 id="complete-title">Puzzle completato!</h2>
        <div className="result-stats">
          <div><span>Tempo</span><strong>{formatTime(elapsedMs)}</strong></div>
          <div><span>Mosse</span><strong>{moves}</strong></div>
        </div>
        <button className="button button-primary" onClick={onRematch} disabled={rematchReady}>
          <RotateCcw size={18} />{rematchReady ? "In attesa dell'amico..." : "Gioca ancora"}
        </button>
        <button className="button button-secondary" onClick={onHome}><Home size={18} />Torna alla home</button>
      </section>
    </div>
  );
}

