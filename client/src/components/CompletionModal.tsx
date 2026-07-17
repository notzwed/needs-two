import { Clock3, Home, RotateCcw } from "lucide-react";
import type { CompletionReason } from "@needs-two/shared";
import { t } from "../i18n";
import { MascotPair } from "./Mascot";

interface CompletionModalProps {
  elapsedMs: number;
  moves: number;
  rematchReady: boolean;
  completionReason: CompletionReason;
  onRematch: () => void;
  onHome: () => void;
}

function formatTime(milliseconds: number) {
  const totalSeconds = Math.round(milliseconds / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ":" + seconds.toString().padStart(2, "0");
}

export function CompletionModal({ elapsedMs, moves, rematchReady, completionReason, onRematch, onHome }: CompletionModalProps) {
  const timedOut = completionReason === "timeout";
  const title = timedOut ? t("timeExpired") : t("puzzleCompleted");

  return (
    <div className="modal-backdrop completion-backdrop">
      <section className="completion-card enter-card" role="dialog" aria-modal="true" aria-labelledby="complete-title">
        {timedOut ? (
          <span className="success-mark is-timeout" aria-hidden="true"><Clock3 size={27} /></span>
        ) : (
          <MascotPair celebrating />
        )}
        <h2 id="complete-title">{title}</h2>
        <div className="result-stats">
          <div><span>{t("time")}</span><strong>{formatTime(elapsedMs)}</strong></div>
          <div><span>{t("moves")}</span><strong>{moves}</strong></div>
        </div>
        <button className="button button-primary" onClick={onRematch} disabled={rematchReady}>
          <RotateCcw size={18} />{rematchReady ? t("waitingFriend") : t("playAgain")}
        </button>
        <button className="button button-secondary" onClick={onHome}><Home size={18} />{t("backHome")}</button>
      </section>
    </div>
  );
}
