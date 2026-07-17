import { BADGES, type ProfileBadge } from "@needs-two/shared";
import { Lock, Star } from "lucide-react";
import { useState } from "react";
import { s } from "../../socialI18n";

export function PixelBadgeIcon({ badgeKey, locked = false, size = "normal" }: { badgeKey: string; locked?: boolean; size?: "small" | "normal" }) {
  const definition = BADGES.find((item) => item.key === badgeKey) ?? BADGES[0];
  const pixels = definition.pattern.join("").split("");
  return (
    <span className={"pixel-badge-icon " + (locked ? "is-locked " : "") + (size === "small" ? "is-small" : "")}
      style={{ "--pixel-dark": definition.palette[0], "--pixel-main": definition.palette[1], "--pixel-light": definition.palette[2] } as React.CSSProperties}
      aria-hidden="true">
      {pixels.map((pixel, index) => <i key={index} data-pixel={pixel} />)}
      {locked && <Lock size={size === "small" ? 12 : 17} />}
    </span>
  );
}

export function BadgeGrid({ badges, displayed, featured, onSave }: {
  badges: ProfileBadge[]; displayed: string[]; featured: string | null;
  onSave: (displayed: string[], featured: string | null) => Promise<string | null>;
}) {
  const [selected, setSelected] = useState(displayed);
  const [main, setMain] = useState(featured);
  const [details, setDetails] = useState<ProfileBadge | null>(null);
  const [message, setMessage] = useState("");
  const changed = selected.join("|") !== displayed.join("|") || main !== featured;

  function toggle(badge: ProfileBadge) {
    if (!badge.unlockedAt) return setDetails(badge);
    setSelected((current) => current.includes(badge.key) ? current.filter((key) => key !== badge.key) : current.length < 3 ? [...current, badge.key] : current);
  }

  async function save() {
    const error = await onSave(selected, main && selected.includes(main) ? main : selected[0] ?? null);
    setMessage(error ?? s("profileUpdated"));
  }

  return (
    <>
      <div className="badge-section-head"><p>{s("chooseUpToThree")}</p>{changed && <button className="button button-primary compact-button" onClick={() => void save()}>{s("save")}</button>}</div>
      {message && <p className="save-feedback" role="status">{message}</p>}
      <div className="badge-grid">
        {badges.map((badge) => {
          const unlocked = Boolean(badge.unlockedAt);
          const isSelected = selected.includes(badge.key);
          return (
            <article key={badge.key} className={"badge-slot " + (unlocked ? "is-unlocked " : "is-locked ") + (isSelected ? "is-selected" : "")}>
              <button className="badge-slot-main" onClick={() => toggle(badge)} aria-label={badge.name} aria-pressed={isSelected}>
                <PixelBadgeIcon badgeKey={badge.key} locked={!unlocked} />
                <span><strong>{badge.name}</strong><small>{unlocked ? s("unlocked") : s("locked")}</small></span>
              </button>
              {unlocked && isSelected && <button className={"badge-feature " + (main === badge.key ? "is-main" : "")}
                onClick={() => setMain(badge.key)} aria-label={s("featuredBadge")} title={s("featuredBadge")}><Star size={16} fill={main === badge.key ? "currentColor" : "none"} /></button>}
              <button className="badge-info-button" onClick={() => setDetails(badge)} aria-label={s("requirement")}>i</button>
            </article>
          );
        })}
      </div>
      {details && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDetails(null)}>
        <section className="badge-details social-card" role="dialog" aria-modal="true">
          <PixelBadgeIcon badgeKey={details.key} locked={!details.unlockedAt} />
          <h3>{details.name}</h3><p>{details.description}</p>
          <div><strong>{s("requirement")}</strong><span>{details.requirement}</span></div>
          <div><strong>{s("progress")}</strong><span>{details.progress} / {details.target}</span>
            <i className="badge-progress"><i style={{ width: Math.min(100, details.progress * 100 / details.target) + "%" }} /></i>
          </div>
          <button className="button button-secondary" onClick={() => setDetails(null)}>{s("close")}</button>
        </section>
      </div>}
    </>
  );
}
