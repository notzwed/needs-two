import { useEffect, useState } from "react";
import { BadgeDefinition } from "@needs-two/shared";
import { s } from "../../socialI18n";
import { avatarUrl, nicknameColor, nicknameFont } from "../../socialUtils";
import { Mascot, MascotPair } from "../Mascot";
import { PixelBadgeIcon } from "./PixelBadge";

export interface IntroProfile {
  id: string | null;
  nickname: string;
  avatarKey: string;
  avatarUrl: string | null;
  nicknameColor: string;
  nicknameFont: string;
  rep: number;
  level: { name: string };
  featuredBadge: string | null;
  stats: { gamesPlayed: number; puzzlesCompleted: number };
}
export interface IntroPlayer {
  playerNumber: 1 | 2;
  isCurrent: boolean;
  profile: IntroProfile;
}
export interface IntroData {
  matchId: string;
  mode: "friend" | "random";
  players: IntroPlayer[];
}

function IntroCard({ player }: { player: IntroPlayer }) {
  const profile = player.profile;
  const mascot = profile.avatarKey === "mascot-blue" || profile.avatarKey === "mascot-red";
  return <article className={"intro-player-card player-" + player.playerNumber}>
    <div className="intro-avatar-wrap">{mascot ? <Mascot player={player.playerNumber} /> : <img src={avatarUrl(profile.avatarKey, profile.avatarUrl)} alt={profile.nickname} />}</div>
    <h2 style={{ color: nicknameColor(profile.nicknameColor), fontFamily: nicknameFont(profile.nicknameFont) }}>{profile.nickname}</h2>
    <p><strong>{profile.level.name}</strong><span>✦ {profile.rep.toLocaleString()} REP</span></p>
    <dl><div><dt>{s("games")}</dt><dd>{profile.stats.gamesPlayed}</dd></div><div><dt>{s("completed")}</dt><dd>{profile.stats.puzzlesCompleted}</dd></div></dl>
    {profile.featuredBadge && <PixelBadgeIcon badgeKey={profile.featuredBadge} size="small" />}
  </article>;
}

export function PlayerIntroScreen({ data, onSkip }: { data: IntroData; onSkip: () => void }) {
  const [canSkip, setCanSkip] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setCanSkip(true), 800); return () => window.clearTimeout(timer); }, []);
  return <main className="player-intro-screen">
    <div className="intro-panel intro-left">{data.players[0] && <IntroCard player={data.players[0]} />}</div>
    <div className="intro-center"><MascotPair connected /><span>&amp;</span><h1>Needs Two</h1><p>{s("letsSolve")}</p></div>
    <div className="intro-panel intro-right">{data.players[1] && <IntroCard player={data.players[1]} />}</div>
    {canSkip && <button className="intro-skip" onClick={onSkip}>{s("skip")}</button>}
  </main>;
}
