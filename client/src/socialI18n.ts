type SocialLanguage = "it" | "en";

const it = {
  friendMode: "Gioca con un amico", soloMode: "Solo", randomMode: "Trova un giocatore",
  profileNeeded: "Serve un profilo", createProfileHint: "Crea un profilo per giocare con persone casuali e salvare i tuoi progressi.",
  createProfile: "Crea profilo", login: "Accedi", logout: "Esci", profile: "Profilo", guest: "Ospite",
  email: "Email", password: "Password", confirmPassword: "Conferma password", nickname: "Nickname",
  avatar: "Avatar", nicknameColor: "Colore nickname", nicknameFont: "Font nickname",
  register: "Registrati", haveAccount: "Hai già un profilo?", noAccount: "Non hai ancora un profilo?",
  passwordRule: "Almeno 8 caratteri, con lettera e numero.", passwordMismatch: "Le password non coincidono.",
  nicknameLength: "Il nickname deve avere tra 3 e 16 caratteri.", invalidEmail: "Inserisci un'email valida.",
  close: "Chiudi", back: "Indietro", save: "Salva", saving: "Salvataggio...", profileUpdated: "Profilo aggiornato!",
  editProfile: "Personalizza", overview: "Panoramica", medals: "Medaglie", recent: "Attività recente",
  rep: "REP", level: "Livello", nextLevel: "al prossimo livello", maxLevel: "Livello massimo",
  games: "Partite", completed: "Completati", wins: "Vittorie", losses: "Sconfitte",
  bestTime: "Miglior tempo", averageTime: "Tempo medio", completionRate: "Completamento", averageMoves: "Media mosse",
  memberSince: "Profilo creato il", displayedBadges: "Medaglie mostrate", featuredBadge: "Medaglia principale",
  locked: "Da sbloccare", unlocked: "Sbloccata", progress: "Progresso", requirement: "Come ottenerla",
  chooseUpToThree: "Scegli fino a 3 medaglie da mostrare.", noRecent: "Le tue prossime partite appariranno qui.",
  uploadImage: "Carica immagine", removeCustomImage: "Usa avatar predefinito", imageRules: "PNG, JPG o WebP, massimo 5 MB.",
  imageInvalid: "Scegli un'immagine PNG, JPG o WebP entro 5 MB.", preview: "Anteprima profilo",
  searching: "Cerchiamo qualcuno per te...", searchingHint: "La ricerca si amplia con calma mentre aspetti.",
  cancelSearch: "Annulla ricerca", waitTime: "Tempo di attesa", connection: "Connessione attiva", matchFound: "Compagno trovato!",
  rangeAny: "Qualsiasi REP", rangeRep: "±{value} REP", soloSetup: "Scegli il tuo puzzle", difficulty: "Difficoltà",
  image: "Immagine", randomImage: "Casuale", start: "Inizia", pause: "Pausa", resume: "Riprendi",
  soloGuest: "Puoi giocare come ospite. REP, badge e statistiche non verranno salvati.",
  easy: "Easy · 3×3", normal: "Normal · 4×4", hard: "Hard · 5×5", expert: "Expert · 6×6",
  soloTitle: "Solo", time: "Tempo", moves: "Mosse", timeUp: "Tempo scaduto",
  together: "Insieme", letsSolve: "Risolviamo insieme", skip: "Salta",
  repEarned: "REP ottenuta", totalRep: "REP totali", completion: "Completamento", speedBonus: "Bonus velocità",
  collaborationBonus: "Bonus collaborazione", modeBonus: "Modalità", badgesUnlocked: "Nuove medaglie",
  uploadFailed: "Non riesco a caricare l'immagine.", accountLoading: "Caricamento profilo...",
} as const;

type Key = keyof typeof it;
type Dict = Record<Key, string>;

const en: Dict = {
  friendMode: "Play with a friend", soloMode: "Solo", randomMode: "Find a player",
  profileNeeded: "Profile required", createProfileHint: "Create a profile to play with new people and save your progress.",
  createProfile: "Create profile", login: "Sign in", logout: "Sign out", profile: "Profile", guest: "Guest",
  email: "Email", password: "Password", confirmPassword: "Confirm password", nickname: "Nickname",
  avatar: "Avatar", nicknameColor: "Nickname color", nicknameFont: "Nickname font",
  register: "Register", haveAccount: "Already have a profile?", noAccount: "Don't have a profile yet?",
  passwordRule: "At least 8 characters, with a letter and a number.", passwordMismatch: "Passwords do not match.",
  nicknameLength: "Nickname must be between 3 and 16 characters.", invalidEmail: "Enter a valid email.",
  close: "Close", back: "Back", save: "Save", saving: "Saving...", profileUpdated: "Profile updated!",
  editProfile: "Customize", overview: "Overview", medals: "Medals", recent: "Recent activity",
  rep: "REP", level: "Level", nextLevel: "to the next level", maxLevel: "Maximum level",
  games: "Games", completed: "Completed", wins: "Wins", losses: "Losses",
  bestTime: "Best time", averageTime: "Average time", completionRate: "Completion", averageMoves: "Average moves",
  memberSince: "Profile created on", displayedBadges: "Displayed medals", featuredBadge: "Main medal",
  locked: "Locked", unlocked: "Unlocked", progress: "Progress", requirement: "How to earn it",
  chooseUpToThree: "Choose up to 3 medals to display.", noRecent: "Your next games will appear here.",
  uploadImage: "Upload image", removeCustomImage: "Use preset avatar", imageRules: "PNG, JPG or WebP, maximum 5 MB.",
  imageInvalid: "Choose a PNG, JPG or WebP image under 5 MB.", preview: "Profile preview",
  searching: "Looking for someone for you...", searchingHint: "The search gently widens while you wait.",
  cancelSearch: "Cancel search", waitTime: "Wait time", connection: "Connection active", matchFound: "Partner found!",
  rangeAny: "Any REP", rangeRep: "±{value} REP", soloSetup: "Choose your puzzle", difficulty: "Difficulty",
  image: "Image", randomImage: "Random", start: "Start", pause: "Pause", resume: "Resume",
  soloGuest: "You can play as a guest. REP, badges and statistics will not be saved.",
  easy: "Easy · 3×3", normal: "Normal · 4×4", hard: "Hard · 5×5", expert: "Expert · 6×6",
  soloTitle: "Solo", time: "Time", moves: "Moves", timeUp: "Time's up",
  together: "Together", letsSolve: "Let's solve", skip: "Skip",
  repEarned: "REP earned", totalRep: "Total REP", completion: "Completion", speedBonus: "Speed bonus",
  collaborationBonus: "Collaboration bonus", modeBonus: "Mode", badgesUnlocked: "New medals",
  uploadFailed: "I couldn't upload the image.", accountLoading: "Loading profile...",
};

const locale: SocialLanguage = typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("it") ? "it" : "en";
export function s(key: Key, values: Record<string, string | number> = {}) {
  return Object.entries(values).reduce((text, entry) => text.replaceAll("{" + entry[0] + "}", String(entry[1])), (locale === "it" ? it : en)[key]);
}
