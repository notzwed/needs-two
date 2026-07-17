import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/nunito/latin-500.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-800.css";
import "@fontsource/quicksand/latin-600.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/fredoka/latin-600.css";
import "@fontsource/baloo-2/latin-600.css";
import "@fontsource/manrope/latin-600.css";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthContext";
import "./styles/global.css";
import "./styles/social.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider><App /></AuthProvider>
  </StrictMode>,
);
