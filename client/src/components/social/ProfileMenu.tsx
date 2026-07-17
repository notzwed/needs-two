import type { PublicProfile } from "@needs-two/shared";
import { ChevronDown, LogIn, LogOut, UserRound } from "lucide-react";
import { useState } from "react";
import { s } from "../../socialI18n";
import { avatarUrl, nicknameColor, nicknameFont } from "../../socialUtils";

export function ProfileMenu({ profile, onProfile, onAuth, onLogout }: {
  profile: PublicProfile | null; onProfile: () => void; onAuth: () => void; onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!profile) return <button className="home-account-button" onClick={onAuth}><LogIn size={18} /><span>{s("login")}</span></button>;
  return (
    <div className="profile-menu">
      <button className="profile-menu-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <img src={avatarUrl(profile.avatarKey, profile.avatarUrl)} alt="" />
        <span style={{ color: nicknameColor(profile.nicknameColor), fontFamily: nicknameFont(profile.nicknameFont) }}>{profile.nickname}</span>
        <ChevronDown size={16} />
      </button>
      {open && <div className="profile-menu-popover">
        <button onClick={() => { setOpen(false); onProfile(); }}><UserRound size={17} />{s("profile")}</button>
        <button onClick={() => { setOpen(false); onLogout(); }}><LogOut size={17} />{s("logout")}</button>
      </div>}
    </div>
  );
}
