import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  nightMode: boolean;
  onToggle: () => void;
  floating?: boolean;
}

export function ThemeToggle({ nightMode, onToggle, floating = false }: ThemeToggleProps) {
  const label = nightMode ? "Passa alla modalità giorno" : "Passa alla modalità notte";
  return (
    <button
      className={`icon-button theme-toggle ${floating ? "is-floating" : ""}`}
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      {nightMode ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}