import { Moon, Sun } from "lucide-react";
import { t } from "../i18n";

interface ThemeToggleProps {
  nightMode: boolean;
  onToggle: () => void;
  floating?: boolean;
}

export function ThemeToggle({ nightMode, onToggle, floating = false }: ThemeToggleProps) {
  const label = nightMode ? t("dayMode") : t("nightMode");
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
