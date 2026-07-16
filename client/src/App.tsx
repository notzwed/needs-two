import { useEffect, useMemo, useState } from "react";
import { GameScreen } from "./components/GameScreen";
import { HomeScreen } from "./components/HomeScreen";
import { RoomPanel } from "./components/RoomPanel";
import { ThemeToggle } from "./components/ThemeToggle";
import { WaitingRoom } from "./components/WaitingRoom";
import { useGameSocket } from "./hooks/useGameSocket";
import { language, t } from "./i18n";

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

export function App() {
  const sessionId = useMemo(getSessionId, []);
  const [screen, setScreen] = useState<"home" | "room">("home");
  const [nightMode, setNightMode] = useState(getInitialNightMode);
  const game = useGameSocket(sessionId);

  useEffect(() => {
    document.documentElement.lang = language;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = nightMode ? "night" : "day";
    localStorage.setItem("needs-two-theme", nightMode ? "night" : "day");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", nightMode ? "#171916" : "#fafaf8");
  }, [nightMode]);

  async function createRoom() {
    const result = await game.createRoom();
    return result.ok ? null : result.message ?? t("createRoomError");
  }

  async function joinRoom(code: string) {
    const result = await game.joinRoom(code);
    return result.ok ? null : result.message ?? t("joinRoomError");
  }

  function goHome() {
    game.leaveRoom();
    setScreen("home");
  }

  const toggleTheme = () => setNightMode((current) => !current);

  if (game.room) {
    const waiting = game.room.players.length < 2 || ["waiting", "starting"].includes(game.room.game.phase);
    if (waiting) {
      return (
        <>
          <ThemeToggle nightMode={nightMode} onToggle={toggleTheme} floating />
          <WaitingRoom code={game.room.code} found={game.room.players.length === 2} onLeave={goHome} />
        </>
      );
    }
    return (
      <GameScreen
        room={game.room}
        sessionId={sessionId}
        connected={game.connected}
        nightMode={nightMode}
        onToggleTheme={toggleTheme}
        onMove={game.moveTile}
        onRematch={() => void game.requestRematch()}
        onHome={goHome}
      />
    );
  }

  const content = screen === "room"
    ? <RoomPanel onBack={() => setScreen("home")} onCreate={createRoom} onJoin={joinRoom} />
    : <HomeScreen onPlay={() => setScreen("room")} />;

  return (
    <>
      <ThemeToggle nightMode={nightMode} onToggle={toggleTheme} floating />
      {content}
    </>
  );
}
