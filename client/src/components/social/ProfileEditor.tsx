import { AVATARS } from "@needs-two/shared";
import { ImagePlus, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { s } from "../../socialI18n";
import { avatarUrl, nicknameColor, nicknameFont, prepareAvatarFile } from "../../socialUtils";
import { supabase } from "../../supabaseClient";

const colors = ["sage", "coral", "powder-blue", "warm-yellow", "soft-lilac", "peach", "soft-night", "deep-cream"];
const fonts = ["nunito", "quicksand", "dm-sans", "fredoka", "baloo-2", "manrope"];

export function ProfileEditor() {
  const { user, profile, updateProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [avatarKey, setAvatarKey] = useState(profile?.avatarKey ?? "cozy-cat");
  const [avatarCustom, setAvatarCustom] = useState<string | null>(profile?.avatarUrl ?? null);
  const [color, setColor] = useState(profile?.nicknameColor ?? "sage");
  const [font, setFont] = useState(profile?.nicknameFont ?? "nunito");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  if (!profile || !user) return null;

  async function upload(file?: File) {
    if (!file || !supabase) return;
    setMessage("");
    setUploading(true);
    try {
      const blob = await prepareAvatarFile(file);
      const path = user!.id + "/avatar.webp";
      const { error } = await supabase.storage.from("needs-two-avatars").upload(path, blob, {
        contentType: "image/webp", upsert: true, cacheControl: "3600",
      });
      if (error) throw error;
      const { data } = supabase.storage.from("needs-two-avatars").getPublicUrl(path);
      setAvatarCustom(data.publicUrl + "?v=" + Date.now());
    } catch {
      setMessage(s("imageInvalid"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    setMessage("");
    const error = await updateProfile({ nickname, avatarKey, avatarUrl: avatarCustom, nicknameColor: color, nicknameFont: font });
    setMessage(error ?? s("profileUpdated"));
  }

  return (
    <section className="profile-editor social-card">
      <div className="profile-editor-preview">
        <span>{s("preview")}</span>
        <img src={avatarUrl(avatarKey, avatarCustom)} alt="" />
        <strong style={{ color: nicknameColor(color), fontFamily: nicknameFont(font) }}>{nickname || profile.nickname}</strong>
      </div>
      <div className="profile-editor-controls">
        <label>{s("nickname")}<input value={nickname} onChange={(event) => setNickname(event.target.value.slice(0, 16))} /></label>
        <fieldset className="avatar-picker">
          <legend>{s("avatar")}</legend>
          <div className="avatar-grid">
            {AVATARS.map((avatar) => <button key={avatar.key} type="button"
              className={"avatar-option " + (!avatarCustom && avatarKey === avatar.key ? "is-selected" : "")}
              onClick={() => { setAvatarKey(avatar.key); setAvatarCustom(null); }} aria-label={avatar.label}>
              <img src={avatarUrl(avatar.key)} alt="" />
            </button>)}
          </div>
        </fieldset>
        <div className="upload-row">
          <input ref={fileRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp"
            onChange={(event) => void upload(event.target.files?.[0])} />
          <button className="button button-secondary" onClick={() => fileRef.current?.click()} disabled={uploading}><ImagePlus size={18} />{s("uploadImage")}</button>
          {avatarCustom && <button className="button button-secondary" onClick={() => setAvatarCustom(null)}><RotateCcw size={18} />{s("removeCustomImage")}</button>}
        </div>
        <p className="form-hint">{s("imageRules")}</p>
        <fieldset className="swatch-picker profile-swatches">
          <legend>{s("nicknameColor")}</legend><div>{colors.map((item) => <button key={item} type="button"
            className={"color-swatch " + (color === item ? "is-selected" : "")}
            style={{ "--swatch": nicknameColor(item) } as React.CSSProperties} onClick={() => setColor(item)} aria-label={item} />)}</div>
        </fieldset>
        <label>{s("nicknameFont")}<select value={font} onChange={(event) => setFont(event.target.value)} style={{ fontFamily: nicknameFont(font) }}>
          {fonts.map((item) => <option key={item} value={item}>{item.replace("-", " ")}</option>)}
        </select></label>
        {message && <p className="save-feedback" role="status">{message}</p>}
        <button className="button button-primary" onClick={() => void save()}>{s("save")}</button>
      </div>
    </section>
  );
}
