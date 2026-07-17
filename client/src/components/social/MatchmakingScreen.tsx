import { Radio, Search, X } from "lucide-react";
import { useEffect } from "react";
import { MascotPair } from "../Mascot";
import { s } from "../../socialI18n";
import type { MatchmakingState } from "../../hooks/useMatchmaking";

export function MatchmakingScreen({ state, onStart, onCancel }: {
  state: MatchmakingState; onStart: () => void; onCancel: () => void;
}) {
  useEffect(() => { if (state.status === "idle") onStart(); }, [onStart, state.status]);
  const minutes = Math.floor(state.waitSeconds / 60);
  const time = minutes + ":" + String(state.waitSeconds % 60).padStart(2, "0");
  return (
    <main className={"matchmaking-screen " + (state.status === "matched" ? "is-matched" : "")}>
      <button className="icon-button matchmaking-close" onClick={onCancel} aria-label={s("cancelSearch")}><X size={20} /></button>
      <section className="matchmaking-card social-card enter-card">
        <div className="matchmaking-mascots"><MascotPair connected={state.status === "matched"} /></div>
        <span className="matchmaking-icon"><Search size={22} /></span>
        <h1>{state.status === "matched" ? s("matchFound") : s("searching")}</h1>
        <p>{s("searchingHint")}</p>
        <div className="matchmaking-meta">
          <span><b>{time}</b><small>{s("waitTime")}</small></span>
          <span><Radio size={17} /><b>{state.range == null ? s("rangeAny") : s("rangeRep", { value: state.range })}</b><small>{s("connection")}</small></span>
        </div>
        {state.status === "error" && <p className="form-error" role="alert">{state.message}</p>}
        <button className="button button-secondary" onClick={onCancel}>{s("cancelSearch")}</button>
      </section>
    </main>
  );
}
