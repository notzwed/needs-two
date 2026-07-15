import { useCallback, useState } from "react";

type SoundName = "move" | "turn" | "complete";

function playTone(context: AudioContext, frequency: number, start: number, duration: number, volume: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.92, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function playSoftSlide(context: AudioContext) {
  const start = context.currentTime;
  const duration = 0.11;
  const oscillator = context.createOscillator();
  const oscillatorGain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(165, start);
  oscillator.frequency.exponentialRampToValueAtTime(105, start + duration);
  oscillatorGain.gain.setValueAtTime(0.028, start);
  oscillatorGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(oscillatorGain).connect(context.destination);

  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = (Math.random() * 2 - 1) * (1 - index / samples.length);
  }
  const noise = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const noiseGain = context.createGain();
  filter.type = "lowpass";
  filter.frequency.value = 720;
  noise.buffer = buffer;
  noiseGain.gain.setValueAtTime(0.012, start);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  noise.connect(filter).connect(noiseGain).connect(context.destination);
  oscillator.start(start);
  noise.start(start);
  oscillator.stop(start + duration);
}

export function useSound() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem("needs-two-sound") !== "off");
  const toggle = useCallback(() => setEnabled((current) => {
    const next = !current;
    localStorage.setItem("needs-two-sound", next ? "on" : "off");
    return next;
  }), []);

  const play = useCallback((name: SoundName) => {
    if (!enabled) return;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const now = context.currentTime;
    if (name === "move") playSoftSlide(context);
    if (name === "turn") {
      playTone(context, 294, now, 0.18, 0.022);
      playTone(context, 392, now + 0.1, 0.24, 0.018);
    }
    if (name === "complete") {
      playTone(context, 330, now, 0.3, 0.024);
      playTone(context, 440, now + 0.11, 0.34, 0.022);
      playTone(context, 554, now + 0.22, 0.4, 0.019);
    }
    window.setTimeout(() => void context.close(), name === "complete" ? 800 : 500);
  }, [enabled]);

  return { enabled, toggle, play };
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}