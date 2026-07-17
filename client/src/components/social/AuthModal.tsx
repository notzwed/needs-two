import { AVATARS, validateNickname } from "@needs-two/shared";
import { LogIn, UserPlus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "../../auth/AuthContext";
import { s } from "../../socialI18n";
import { avatarUrl, nicknameColor, nicknameFont } from "../../socialUtils";

interface AuthModalProps {
  initialMode?: "login" | "register";
  onClose: () => void;
}

const colors = ["sage", "coral", "powder-blue", "warm-yellow", "soft-lilac", "peach", "soft-night", "deep-cream"];
const fonts = ["nunito", "quicksand", "dm-sans", "fredoka", "baloo-2", "manrope"];

export function AuthModal({ initialMode = "login", onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatarKey, setAvatarKey] = useState("cozy-cat");
  const [color, setColor] = useState("sage");
  const [font, setFont] = useState("nunito");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(s("invalidEmail"));
    if (password.length < 8 || !/[a-z]/i.test(password) || !/\d/.test(password)) return setError(s("passwordRule"));
    if (mode === "register") {
      if (password !== confirmation) return setError(s("passwordMismatch"));
      if (validateNickname(nickname)) return setError(s("nicknameLength"));
    }
    setBusy(true);
    const message = mode === "login"
      ? await signIn(email, password)
      : await signUp({ email, password, nickname, avatarKey, nicknameColor: color, nicknameFont: font });
    setBusy(false);
    if (message) setError(message);
    else onClose();
  }

  return (
    <div className="modal-backdrop auth-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="auth-modal social-card enter-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="icon-button modal-close" onClick={onClose} aria-label={s("close")}><X size={19} /></button>
        <div className="auth-heading">
          <span className="auth-heading-icon">{mode === "login" ? <LogIn size={22} /> : <UserPlus size={22} />}</span>
          <h2 id="auth-title">{mode === "login" ? s("login") : s("createProfile")}</h2>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && (
            <>
              <label>{s("nickname")}<input value={nickname} onChange={(event) => setNickname(event.target.value.slice(0, 16))} autoComplete="nickname" required /></label>
              <fieldset className="avatar-picker">
                <legend>{s("avatar")}</legend>
                <div className="avatar-grid compact">
                  {AVATARS.map((avatar) => (
                    <button key={avatar.key} type="button" className={"avatar-option " + (avatarKey === avatar.key ? "is-selected" : "")}
                      onClick={() => setAvatarKey(avatar.key)} aria-label={avatar.label} aria-pressed={avatarKey === avatar.key}>
                      <img src={avatarUrl(avatar.key)} alt="" />
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="style-picker-row">
                <fieldset className="swatch-picker">
                  <legend>{s("nicknameColor")}</legend>
                  <div>{colors.map((item) => <button type="button" key={item} className={"color-swatch " + (color === item ? "is-selected" : "")}
                    style={{ "--swatch": nicknameColor(item) } as React.CSSProperties} onClick={() => setColor(item)} aria-label={item} aria-pressed={color === item} />)}</div>
                </fieldset>
                <label>{s("nicknameFont")}
                  <select value={font} onChange={(event) => setFont(event.target.value)} style={{ fontFamily: nicknameFont(font) }}>
                    {fonts.map((item) => <option key={item} value={item}>{item.replace("-", " ")}</option>)}
                  </select>
                </label>
              </div>
              <div className="profile-mini-preview">
                <img src={avatarUrl(avatarKey)} alt="" />
                <strong style={{ color: nicknameColor(color), fontFamily: nicknameFont(font) }}>{nickname || s("nickname")}</strong>
              </div>
            </>
          )}
          <label>{s("email")}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <label>{s("password")}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"} required /></label>
          {mode === "register" && <label>{s("confirmPassword")}<input type="password" value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required /></label>}
          {mode === "register" && <p className="form-hint">{s("passwordRule")}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary auth-submit" disabled={busy}>{busy ? "…" : mode === "login" ? s("login") : s("register")}</button>
        </form>
        <button className="auth-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? s("noAccount") + " " + s("createProfile") : s("haveAccount") + " " + s("login")}
        </button>
      </section>
    </div>
  );
}
