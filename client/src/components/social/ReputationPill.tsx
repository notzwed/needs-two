import type { PublicProfile } from "@needs-two/shared";
import { Sparkles } from "lucide-react";
import { s } from "../../socialI18n";

export function ReputationPill({ profile, onClick }: { profile: PublicProfile | null; onClick: () => void }) {
  if (!profile) {
    return <button className="reputation-pill is-guest" onClick={onClick}><Sparkles size={16} /><span>{s("rep")} — {s("createProfile")}</span></button>;
  }
  const max = profile.level.progressMax;
  const percent = max ? Math.min(100, profile.level.progress * 100 / max) : 100;
  return (
    <button className="reputation-pill" onClick={onClick} aria-label={s("profile")}>
      <Sparkles size={16} />
      <span><b>{s("rep")} {profile.rep.toLocaleString()}</b><small>{profile.level.name}</small></span>
      <i aria-hidden="true"><i style={{ width: percent + "%" }} /></i>
    </button>
  );
}
