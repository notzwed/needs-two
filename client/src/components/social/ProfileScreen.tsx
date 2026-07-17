import { ArrowLeft, Award, CalendarDays, Clock3, Gamepad2, Medal, Pencil, Trophy } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { s } from "../../socialI18n";
import { avatarUrl, completionPercent, formatDuration, nicknameColor, nicknameFont } from "../../socialUtils";
import { BadgeGrid, PixelBadgeIcon } from "./PixelBadge";
import { ProfileEditor } from "./ProfileEditor";

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { profile, profileLoading, updateBadges } = useAuth();
  const [tab, setTab] = useState<"overview" | "edit" | "badges">("overview");
  if (!profile || profileLoading) return <main className="center-screen"><p>{s("accountLoading")}</p></main>;
  const progressMax = profile.level.progressMax;
  const percent = progressMax ? Math.min(100, profile.level.progress * 100 / progressMax) : 100;
  const stats = [
    [s("games"), profile.stats.gamesPlayed, <Gamepad2 />],
    [s("completed"), profile.stats.puzzlesCompleted, <Award />],
    [s("wins"), profile.stats.victories, <Trophy />],
    [s("losses"), profile.stats.losses, <Medal />],
    [s("bestTime"), formatDuration(profile.stats.bestTimeMs), <Clock3 />],
    [s("averageTime"), formatDuration(profile.stats.averageTimeMs), <Clock3 />],
    [s("completionRate"), completionPercent(profile) + "%", <Award />],
    [s("averageMoves"), profile.stats.averageMoves ?? 0, <Gamepad2 />],
  ] as const;

  return (
    <main className="profile-screen">
      <header className="profile-page-top">
        <button className="icon-button" onClick={onBack} aria-label={s("back")}><ArrowLeft size={20} /></button>
        <span>Needs Two</span>
      </header>
      <section className="profile-hero">
        <img src={avatarUrl(profile.avatarKey, profile.avatarUrl)} alt={profile.nickname} />
        <div>
          <h1 style={{ color: nicknameColor(profile.nicknameColor), fontFamily: nicknameFont(profile.nicknameFont) }}>{profile.nickname}</h1>
          <p><strong>{profile.level.name}</strong><span>✦ {s("rep")} {profile.rep.toLocaleString()}</span></p>
          <div className="profile-level-progress"><i><i style={{ width: percent + "%" }} /></i>
            <small>{progressMax ? profile.level.progress + " / " + progressMax + " " + s("nextLevel") : s("maxLevel")}</small></div>
          <div className="featured-badges">
            {profile.displayedBadges.map((key) => <PixelBadgeIcon key={key} badgeKey={key} size="small" />)}
          </div>
        </div>
      </section>
      <nav className="profile-tabs" aria-label={s("profile")}>
        <button className={tab === "overview" ? "is-active" : ""} onClick={() => setTab("overview")}><Gamepad2 size={18} />{s("overview")}</button>
        <button className={tab === "edit" ? "is-active" : ""} onClick={() => setTab("edit")}><Pencil size={18} />{s("editProfile")}</button>
        <button className={tab === "badges" ? "is-active" : ""} onClick={() => setTab("badges")}><Medal size={18} />{s("medals")}</button>
      </nav>
      {tab === "overview" && <div className="profile-content">
        <section className="stats-grid">{stats.map(([label, value, icon]) => <article className="stat-card" key={label}>{icon}<span>{label}</span><strong>{value}</strong></article>)}</section>
        <section className="recent-card social-card"><h2>{s("recent")}</h2>
          {profile.recentMatches.length ? <div className="recent-list">{profile.recentMatches.map((match) => <article key={match.id}>
            <span className={"match-mode-dot mode-" + match.mode} /><div><strong>{match.mode === "solo" ? s("soloMode") : match.mode === "random" ? s("randomMode") : s("friendMode")}</strong>
            <small>{match.difficulty} · {formatDuration(match.elapsedMs)} · {match.moves} {s("moves")}</small></div><b>{match.rep > 0 ? "+" + match.rep + " REP" : "—"}</b></article>)}</div>
          : <p className="empty-state">{s("noRecent")}</p>}
          <p className="member-since"><CalendarDays size={16} />{s("memberSince")} {new Date(profile.createdAt).toLocaleDateString()}</p>
        </section>
      </div>}
      {tab === "edit" && <div className="profile-content"><ProfileEditor /></div>}
      {tab === "badges" && <div className="profile-content"><section className="medals-card social-card"><h2>{s("medals")}</h2>
        <BadgeGrid badges={profile.badges} displayed={profile.displayedBadges} featured={profile.featuredBadge} onSave={updateBadges} /></section></div>}
    </main>
  );
}
