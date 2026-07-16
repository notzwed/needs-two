import { useCallback, useRef, useState } from "react";

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

function playWoodKnock(context: AudioContext, start: number) {
  const master = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 820;
  master.gain.setValueAtTime(0.055, start);
  master.gain.exponentialRampToValueAtTime(0.0001, start + 0.085);
  master.connect(filter).connect(context.destination);

  for (const [frequency, type] of [[128, "triangle"], [214, "sine"]] as const) {
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, start + 0.08);
    oscillator.connect(master);
    oscillator.start(start);
    oscillator.stop(start + 0.09);
  }
}

function playWoodSlide(context: AudioContext) {
  const start = context.currentTime;
  const duration = 0.2;
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const samples = buffer.getChannelData(0);
  let smoothedNoise = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const progress = index / samples.length;
    smoothedNoise = smoothedNoise * 0.86 + (Math.random() * 2 - 1) * 0.14;
    const grain = 0.78 + Math.sin(progress * Math.PI * 18) * 0.12;
    samples[index] = smoothedNoise * 2.8 * grain * Math.pow(1 - progress, 0.45);
  }

  const source = context.createBufferSource();
  const highPass = context.createBiquadFilter();
  const bodyFilter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  highPass.type = "highpass";
  highPass.frequency.value = 95;
  bodyFilter.type = "lowpass";
  bodyFilter.frequency.setValueAtTime(1_050, start);
  bodyFilter.frequency.exponentialRampToValueAtTime(520, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.035, start + 0.012);
  gain.gain.setValueAtTime(0.025, start + duration * 0.55);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(highPass).connect(bodyFilter).connect(gain).connect(context.destination);
  source.start(start);
  playWoodKnock(context, start + duration - 0.025);
}

export function useSound() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem("needs-two-sound") !== "off");
  const enabledRef = useRef(enabled);

  const toggle = useCallback(() => setEnabled((current) => {
    const next = !current;
    enabledRef.current = next;
    localStorage.setItem("needs-two-sound", next ? "on" : "off");
    return next;
  }), []);

  const play = useCallback((name: SoundName) => {
    if (!enabledRef.current) return;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const now = context.currentTime;
    if (name === "move") playWoodSlide(context);
    if (name === "turn") {
      playTone(context, 294, now, 0.18, 0.022);
      playTone(context, 392, now + 0.1, 0.24, 0.018);
    }
    if (name === "complete") {
      playTone(context, 330, now, 0.3, 0.024);
      playTone(context, 440, now + 0.11, 0.34, 0.022);
      playTone(context, 554, now + 0.22, 0.4, 0.019);
    }
    window.setTimeout(() => void context.close(), name === "complete" ? 800 : 550);
  }, []);

  return { enabled, toggle, play };
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
