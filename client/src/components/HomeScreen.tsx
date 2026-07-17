import type { PublicProfile } from "@needs-two/shared";
import { Search, UserRound, UsersRound } from "lucide-react";
import { useState } from "react";
import { s } from "../socialI18n";
import { ProfileMenu } from "./social/ProfileMenu";
import { ReputationPill } from "./social/ReputationPill";

interface HomeScreenProps {
  profile: PublicProfile | null;
  onFriend: () => void;
  onSolo: () => void;
  onRandom: () => void;
  onProfile: () => void;
  onAuth: () => void;
  onLogout: () => void;
}

export function HomeScreen({ profile, onFriend, onSolo, onRandom, onProfile, onAuth, onLogout }: HomeScreenProps) {
  const logoUrl = import.meta.env.BASE_URL + "branding/needs-two-logo.png";
  const [guestNotice, setGuestNotice] = useState(false);

  function random() {
    if (profile) onRandom();
    else setGuestNotice(true);
  }

  return (
    <main className="home-screen social-home">
      <div className="home-profile-anchor"><ProfileMenu profile={profile} onProfile={onProfile} onAuth={onAuth} onLogout={onLogout} /></div>
      <div className="home-content social-home-content">
        <h1 className="visually-hidden">Needs Two</h1>
        <img className="home-logo" src={logoUrl} alt="Needs Two" />
        <div className="home-mode-actions">
          <button className="button button-primary home-mode-button" onClick={onFriend}><UsersRound size={21} /><span>{s("friendMode")}</span></button>
          <button className="button button-secondary home-mode-button" onClick={onSolo}><UserRound size={20} /><span>{s("soloMode")}</span></button>
          <button className={"button button-secondary home-mode-button " + (!profile ? "is-locked" : "")} onClick={random}>
            <Search size={20} /><span>{s("randomMode")}</span>{!profile && <small>{s("profileNeeded")}</small>}
          </button>
        </div>
        {guestNotice && <aside className="guest-restriction enter-card" role="status">
          <p>{s("createProfileHint")}</p><button className="button button-primary" onClick={onAuth}>{s("createProfile")}</button>
          <button className="text-button" onClick={() => setGuestNotice(false)}>{s("close")}</button>
        </aside>}
      </div>
      <div className="home-reputation"><ReputationPill profile={profile} onClick={profile ? onProfile : onAuth} /></div>
    </main>
  );
}
