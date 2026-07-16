import { Maximize2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { t } from "../i18n";

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
    <aside className="puzzle-reference" aria-label={t("referenceImage")}>
      <span className="reference-label">{t("reference")}</span>
      <button
        ref={triggerRef}
        className="reference-thumbnail"
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("enlargeReference")}
        aria-haspopup="dialog"
        title={t("enlargeImage")}
      >
        <img src={image} alt={t("fullPuzzleImage", { puzzle: puzzleId })} />
        <span className="reference-zoom-icon" aria-hidden="true"><Maximize2 size={15} /></span>
      </button>

      {open && (
        <div className="reference-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="reference-modal" role="dialog" aria-modal="true" aria-label={t("enlargedReference")}>
            <img src={image} alt={t("enlargedPuzzleImage", { puzzle: puzzleId })} />
            <button
              ref={closeRef}
              className="icon-button reference-close"
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("closeEnlargedImage")}
              title={t("close")}
            >
              <X size={20} />
            </button>
          </section>
        </div>
      )}
    </aside>
  );
}
