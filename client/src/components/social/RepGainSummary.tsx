import type { ReputationAward } from "@needs-two/shared";
import { Sparkles } from "lucide-react";
import { s } from "../../socialI18n";

export function RepGainSummary({ reward }: { reward: ReputationAward }) {
  const breakdown = reward.breakdown;
  return <section className="rep-gain-summary">
    <header><Sparkles size={18} /><span>{s("repEarned")}</span><strong>+{reward.earned} REP</strong></header>
    <div>{breakdown.base != null && <p><span>{s("completion")}</span><b>+{breakdown.base}</b></p>}
      {!!breakdown.speedBonus && <p><span>{s("speedBonus")}</span><b>+{breakdown.speedBonus}</b></p>}
      {!!breakdown.collaborationBonus && <p><span>{s("collaborationBonus")}</span><b>+{breakdown.collaborationBonus}</b></p>}</div>
    <footer><span>{s("totalRep")}</span><b>{reward.totalRep.toLocaleString()}</b></footer>
  </section>;
}
