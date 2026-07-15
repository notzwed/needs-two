import { Maximize2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface PuzzleReferenceProps {
  puzzleId: string;
}

export function PuzzleReference({ puzzleId }: PuzzleReferenceProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const image = `${import.meta.env.BASE_URL}puzzles/${puzzleId}.png`;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <aside className="puzzle-reference" aria-label="Immagine di riferimento">
      <span className="reference-label">Riferimento</span>
      <button
        ref={triggerRef}
        className="reference-thumbnail"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ingrandisci l'immagine di riferimento"
        aria-haspopup="dialog"
        title="Ingrandisci immagine"
      >
        <img src={image} alt={`Immagine completa del puzzle ${puzzleId}`} />
        <span className="reference-zoom-icon" aria-hidden="true"><Maximize2 size={15} /></span>
      </button>

      {open && (
        <div className="reference-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="reference-modal" role="dialog" aria-modal="true" aria-label="Immagine di riferimento ingrandita">
            <img src={image} alt={`Immagine completa ingrandita del puzzle ${puzzleId}`} />
            <button
              ref={closeRef}
              className="icon-button reference-close"
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Chiudi immagine ingrandita"
              title="Chiudi"
            >
              <X size={20} />
            </button>
          </section>
        </div>
      )}
    </aside>
  );
}