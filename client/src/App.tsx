import { useMemo, useState } from "react";
import { GameScreen } from "./components/GameScreen";
import { HomeScreen } from "./components/HomeScreen";
import { RoomPanel } from "./components/RoomPanel";
import { WaitingRoom } from "./components/WaitingRoom";
import { useGameSocket } from "./hooks/useGameSocket";

function getSessionId() {
  const existing = localStorage.getItem("needs-two-session");
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem("needs-two-session", created);
  return created;
}

export function App() {
  const sessionId = useMemo(getSessionId, []);
  const [screen, setScreen] = useState<"home" | "room">("home");
  const game = useGameSocket(sessionId);

  async function createRoom() {
    const result = await game.createRoom();
    return result.ok ? null : result.message ?? "Non riesco a creare la stanza.";
  }

  async function joinRoom(code: string) {
    const result = await game.joinRoom(code);
    return result.ok ? null : result.message ?? "Non riesco a entrare nella stanza.";
  }

  function goHome() {
    game.leaveRoom();
    setScreen("home");
  }

  if (game.room) {
    const waiting = game.room.players.length < 2 || ["waiting", "starting"].includes(game.room.game.phase);
    if (waiting) {
      return <WaitingRoom code={game.room.code} found={game.room.players.length === 2} onLeave={goHome} />;
    }
    return (
      <GameScreen
        room={game.room}
        sessionId={sessionId}
        connected={game.connected}
        onMove={game.moveTile}
        onRematch={() => void game.requestRematch()}
        onHome={goHome}
      />
    );
  }

  if (screen === "room") return <RoomPanel onBack={() => setScreen("home")} onCreate={createRoom} onJoin={joinRoom} />;
  return <HomeScreen onPlay={() => setScreen("room")} />;
}
