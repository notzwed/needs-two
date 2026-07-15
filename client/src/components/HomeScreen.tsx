interface HomeScreenProps {
  onPlay: () => void;
}

export function HomeScreen({ onPlay }: HomeScreenProps) {
  const logoUrl = `${import.meta.env.BASE_URL}branding/needs-two-logo.png`;

  return (
    <main className="home-screen">
      <div className="home-content">
        <h1 className="visually-hidden">Needs Two</h1>
        <img className="home-logo" src={logoUrl} alt="" aria-hidden="true" />
        <button className="button button-primary play-button" onClick={onPlay}>Play</button>
      </div>
    </main>
  );
}
