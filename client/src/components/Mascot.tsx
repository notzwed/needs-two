import type { PlayerNumber } from "@needs-two/shared";

interface MascotProps {
  player: PlayerNumber;
  muted?: boolean;
  className?: string;
}

interface MascotPairProps {
  connected?: boolean;
  celebrating?: boolean;
}

const logoUrl = import.meta.env.BASE_URL + "branding/needs-two-logo.png";

export function Mascot({ player, muted = false, className = "" }: MascotProps) {
  const classes = "mascot mascot-player-" + player + (muted ? " is-muted" : "") + (className ? " " + className : "");
  return (
    <span className={classes} aria-hidden="true">
      <img src={logoUrl} alt="" />
    </span>
  );
}

export function MascotPair({ connected = true, celebrating = false }: MascotPairProps) {
  const classes = "mascot-pair " + (connected ? "is-connected" : "is-waiting") + (celebrating ? " is-celebrating" : "");
  return (
    <span className={classes} aria-hidden="true">
      <Mascot player={1} />
      <Mascot player={2} muted={!connected} />
    </span>
  );
}
