interface HomeScreenProps {
  onPlay: () => void;
}

export function HomeScreen({ onPlay }: HomeScreenProps) {
  return (
    <main className="home-screen">
      <div className="home-content">
        <h1>Needs Two</h1>
        <button className="button button-primary play-button" onClick={onPlay}>Play</button>
      </div>
    </main>
  );
}

