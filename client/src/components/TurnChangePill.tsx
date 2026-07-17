import type { PlayerNumber } from "@needs-two/shared";
import { t } from "../i18n";
import { Mascot } from "./Mascot";

interface TurnChangePillProps {
  activePlayer: PlayerNumber;
  playerNumber: PlayerNumber;
}

export function TurnChangePill({ activePlayer, playerNumber }: TurnChangePillProps) {
  const isMine = activePlayer === playerNumber;
  const classes = "turn-pill " + (isMine ? "is-local" : "is-friend");

  return (
    <div className={classes} role="status" aria-live="polite">
      <Mascot player={activePlayer} />
      <span>{isMine ? t("yourTurnPrompt") : t("friendPlaying")}</span>
    </div>
  );
}
