import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";

interface RoomPanelProps {
  onBack: () => void;
  onCreate: () => Promise<string | null>;
  onJoin: (code: string) => Promise<string | null>;
}

export function RoomPanel({ onBack, onCreate, onJoin }: RoomPanelProps) {
  const [mode, setMode] = useState<"choose" | "join">("choose");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    setError((await onCreate()) ?? "");
    setBusy(false);
  }

  async function join(event: FormEvent) {
    event.preventDefault();
    if (code.length !== 6) return setError("Il codice deve avere 6 caratteri.");
    setBusy(true);
    setError((await onJoin(code)) ?? "");
    setBusy(false);
  }

  return (
    <main className="center-screen">
      <section className="room-card enter-card" aria-labelledby="room-title">
        <button className="icon-button back-button" onClick={mode === "join" ? () => setMode("choose") : onBack} aria-label="Indietro">
          <ArrowLeft aria-hidden="true" size={20} />
        </button>
        <h2 id="room-title">Giochiamo insieme</h2>
        {mode === "choose" ? (
          <div className="room-actions">
            <button className="button button-primary" onClick={create} disabled={busy}>Crea una stanza</button>
            <button className="button button-secondary" onClick={() => setMode("join")}>Entra con un codice</button>
          </div>
        ) : (
          <form onSubmit={join} className="join-form">
            <label htmlFor="room-code">Codice amico</label>
            <input
              id="room-code"
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6));
                setError("");
              }}
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="ABC234"
              aria-describedby={error ? "room-error" : undefined}
              autoFocus
            />
            <button className="button button-primary" disabled={busy || code.length !== 6}>Entra</button>
          </form>
        )}
        {error && <p className="form-error" id="room-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}

