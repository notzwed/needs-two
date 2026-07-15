import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface WaitingRoomProps {
  code: string;
  found: boolean;
  onLeave: () => void;
}

export function WaitingRoom({ code, found, onLeave }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);
  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }
  return (
    <main className="center-screen">
      <section className="room-card waiting-card" aria-live="polite">
        {found ? (
          <div className="found-state">
            <span className="found-mark"><Check aria-hidden="true" /></span>
            <h2>Giocatore trovato!</h2>
          </div>
        ) : (
          <>
            <p className="eyebrow">Invia questo codice al tuo amico</p>
            <strong className="room-code">{code}</strong>
            <button className="button button-secondary copy-button" onClick={copyCode}>
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? "Copiato" : "Copia codice"}
            </button>
            <div className="waiting-status"><span aria-hidden="true" />In attesa del secondo giocatore...</div>
            <button className="text-button" onClick={onLeave}>Torna alla home</button>
          </>
        )}
      </section>
    </main>
  );
}

