import { useCallback, useEffect, useMemo, useState } from "react";
import type { DifficultyKey } from "@needs-two/shared";
import { useAuth } from "./auth/AuthContext";
import { GameScreen } from "./components/GameScreen";
import { HomeScreen } from "./components/HomeScreen";
import { RoomPanel } from "./components/RoomPanel";
import { ThemeToggle } from "./components/ThemeToggle";
import { WaitingRoom } from "./components/WaitingRoom";
import { AuthModal } from "./components/social/AuthModal";
import { MatchmakingScreen } from "./components/social/MatchmakingScreen";
import { PlayerIntroScreen, type IntroData } from "./components/social/PlayerIntroScreen";
import { ProfileScreen } from "./components/social/ProfileScreen";
import { SoloGameScreen } from "./components/social/SoloGameScreen";
import { SoloModeSetup } from "./components/social/SoloModeSetup";
import { useGameSocket } from "./hooks/useGameSocket";
import { useMatchmaking } from "./hooks/useMatchmaking";
import { useSoloGame } from "./hooks/useSoloGame";
import { useSound } from "./hooks/useSound";
import { language, t } from "./i18n";
import { supabase } from "./supabaseClient";

function getSessionId() {
  const existing = localStorage.getItem("needs-two-session");
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem("needs-two-session", created);
  return created;
}

function getInitialNightMode() {
  const saved = localStorage.getItem("needs-two-theme");
  if (saved) return saved === "night";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

type Screen = "home" | "room" | "profile" | "solo-setup" | "solo-game" | "matchmaking";

export function App() {
  const sessionId = useMemo(getSessionId, []);
  const [screen, setScreen] = useState<Screen>("home");
  const [nightMode, setNightMode] = useState(getInitialNightMode);
  const [authOpen, setAuthOpen] = useState(false);
  const [roomMode, setRoomMode] = useState<"friend" | "random">("friend");
  const [intro, setIntro] = useState<IntroData | null>(null);
  const [introDismissed, setIntroDismissed] = useState(false);
  const { profile, signOut, refreshProfile } = useAuth();
  const game = useGameSocket(sessionId);
  const matchmaking = useMatchmaking(sessionId, nightMode);
  const solo = useSoloGame(sessionId, nightMode);
  const sound = useSound();

  useEffect(() => { document.documentElement.lang = language; }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = nightMode ? "night" : "day";
    localStorage.setItem("needs-two-theme", nightMode ? "night" : "day");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", nightMode ? "#171916" : "#fafaf8");
  }, [nightMode]);

  const registerRoom = useCallback(async (code: string, mode: "friend" | "random" = "friend") => {
    await supabase?.rpc("needs_two_register_room_match", {
      p_code: code, p_session_id: sessionId, p_mode: mode, p_dark_mode: nightMode,
    });
  }, [nightMode, sessionId]);

  async function createRoom() {
    setRoomMode("friend");
    const result = await game.createRoom();
    if (result.ok && result.state) await registerRoom(result.state.code);
    return result.ok ? null : result.message ?? t("createRoomError");
  }

  async function joinRoom(code: string) {
    setRoomMode("friend");
    const result = await game.joinRoom(code);
    if (result.ok && result.state) await registerRoom(result.state.code);
    return result.ok ? null : result.message ?? t("joinRoomError");
  }

  const goHome = useCallback(() => {
    game.leaveRoom();
    if (matchmaking.state.status === "waiting") void matchmaking.cancel();
    if (solo.game) void solo.cancel();
    setIntro(null);
    setIntroDismissed(false);
    setScreen("home");
  }, [game, matchmaking, solo]);

  useEffect(() => {
    if (matchmaking.state.status !== "matched" || !matchmaking.state.roomCode) return;
    let active = true;
    void game.joinRoom(matchmaking.state.roomCode).then((result) => {
      if (active && result.ok) {
        setRoomMode("random");
        sound.play("match");
        setScreen("room");
      }
    });
    return () => { active = false; };
  }, [game.joinRoom, matchmaking.state.roomCode, matchmaking.state.status, sound.play]);

  useEffect(() => {
    const room = game.room;
    const client = supabase;
    if (!room || room.players.length < 2 || room.game.phase !== "starting" || introDismissed || !client) return;
    let active = true;
    void (async () => {
      await registerRoom(room.code, roomMode);
      const { data } = await client.rpc("needs_two_match_intro", { p_code: room.code, p_session_id: sessionId });
      if (active && data) setIntro(data as IntroData);
    })();
    return () => { active = false; };
  }, [game.room?.code, game.room?.game.phase, game.room?.players.length, introDismissed, registerRoom, roomMode, sessionId]);

  useEffect(() => {
    setIntro(null);
    setIntroDismissed(false);
  }, [game.room?.game.puzzleId]);
  useEffect(() => {
    if (solo.reward) {
      void refreshProfile();
      sound.play(solo.reward.breakdown.badgesUnlocked?.length ? "badge" : "rep");
    }
  }, [refreshProfile, solo.reward, sound.play]);

  async function startSolo(difficulty: DifficultyKey, puzzleId: string | null) {
    const started = await solo.start(difficulty, puzzleId);
    if (started) {
      sound.play("start");
      setScreen("solo-game");
    }
  }

  const toggleTheme = () => setNightMode((current) => !current);

  let content: React.ReactNode;
  if (screen === "profile" && profile) {
    content = <ProfileScreen onBack={() => setScreen("home")} />;
  } else if (screen === "matchmaking") {
    content = <MatchmakingScreen state={matchmaking.state} onStart={matchmaking.start} onCancel={() => { void matchmaking.cancel(); setScreen("home"); }} />;
  } else if (screen === "solo-setup") {
    content = <SoloModeSetup registered={Boolean(profile)} onBack={() => setScreen("home")} onStart={startSolo} />;
  } else if (screen === "solo-game" && solo.game) {
    content = <SoloGameScreen game={solo.game} tiles={solo.board} reward={solo.reward} soundEnabled={sound.enabled}
      onToggleSound={sound.toggle} onMove={solo.move} onPause={solo.pause} onHome={goHome}
      onAgain={() => { void solo.cancel(); setScreen("solo-setup"); }} />;
  } else if (game.room && screen === "room") {
    if (game.room.players.length < 2) {
      content = <WaitingRoom code={game.room.code} found={false} onLeave={goHome} />;
    } else if (game.room.game.phase === "starting" && !introDismissed) {
      content = intro ? <PlayerIntroScreen data={intro} onSkip={() => setIntroDismissed(true)} />
        : <WaitingRoom code={game.room.code} found onLeave={goHome} />;
    } else {
      content = <GameScreen room={game.room} sessionId={sessionId} connected={game.connected} nightMode={nightMode}
        onToggleTheme={toggleTheme} onMove={game.moveTile} onRematch={() => void game.requestRematch()} onHome={goHome}
        onProfileRefresh={refreshProfile} />;
    }
  } else if (screen === "room") {
    content = <RoomPanel onBack={() => setScreen("home")} onCreate={createRoom} onJoin={joinRoom} />;
  } else {
    content = <HomeScreen profile={profile} onFriend={() => { setRoomMode("friend"); setScreen("room"); }} onSolo={() => setScreen("solo-setup")}
      onRandom={() => setScreen("matchmaking")} onProfile={() => setScreen("profile")} onAuth={() => setAuthOpen(true)}
      onLogout={() => void signOut()} />;
  }

  const floatingTheme = !["solo-game"].includes(screen) && !(game.room && screen === "room" && game.room.players.length >= 2);

  return <>
    {floatingTheme && <ThemeToggle nightMode={nightMode} onToggle={toggleTheme} floating />}
    {content}
    {authOpen && <AuthModal initialMode="login" onClose={() => setAuthOpen(false)} />}
  </>;
}
