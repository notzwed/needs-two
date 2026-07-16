import { Mic, X } from "lucide-react";
import { t } from "../i18n";

interface VoiceInviteProps {
  chatOpen: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}

export function VoiceInvite({ chatOpen, onAccept, onDismiss }: VoiceInviteProps) {
  return (
    <aside
      className={`voice-invite ${chatOpen ? "with-chat-open" : ""}`}
      aria-label={t("voiceInviteTitle")}
      aria-live="polite"
    >
      <div className="voice-invite-icon" aria-hidden="true"><Mic size={20} /></div>
      <div className="voice-invite-copy">
        <strong>{t("voiceInviteTitle")}</strong>
        <span>{t("voiceInviteText")}</span>
      </div>
      <button className="voice-invite-accept" onClick={onAccept}>
        <Mic size={16} />
        <span>{t("acceptVoiceInvite")}</span>
      </button>
      <button
        className="voice-invite-dismiss"
        onClick={onDismiss}
        aria-label={t("dismissVoiceInvite")}
        title={t("dismissVoiceInvite")}
      >
        <X size={16} />
      </button>
    </aside>
  );
}