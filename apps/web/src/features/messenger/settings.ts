import { useSyncExternalStore } from 'react';

export interface MessengerSettings {
  /** true: Enter sends, Shift+Enter is a new line. false: Ctrl/Cmd+Enter sends, Enter is a new line. */
  enterToSend: boolean;
  sound: boolean;
  /** Show the text of a message in notifications. Off: only "New message from …". */
  preview: boolean;
  textSize: 'small' | 'medium' | 'large';
}

const KEY = 'messenger-settings';
const DEFAULTS: MessengerSettings = { enterToSend: true, sound: true, preview: true, textSize: 'medium' };

let current: MessengerSettings = load();
const listeners = new Set<() => void>();

function load(): MessengerSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return {
      enterToSend: typeof saved.enterToSend === 'boolean' ? saved.enterToSend : DEFAULTS.enterToSend,
      sound: typeof saved.sound === 'boolean' ? saved.sound : DEFAULTS.sound,
      preview: typeof saved.preview === 'boolean' ? saved.preview : DEFAULTS.preview,
      textSize: ['small', 'medium', 'large'].includes(saved.textSize) ? saved.textSize : DEFAULTS.textSize,
    };
  } catch {
    return DEFAULTS;
  }
}

export const getSettings = () => current;

export function updateSettings(patch: Partial<MessengerSettings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* private mode: kept for this visit only */
  }
  listeners.forEach((l) => l());
}

export const resetSettings = () => updateSettings(DEFAULTS);

export function useSettings(): MessengerSettings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSettings,
  );
}

export const TEXT_SIZE_PX: Record<MessengerSettings['textSize'], number> = { small: 13, medium: 14.5, large: 16.5 };

let audio: AudioContext | null = null;

function context(): AudioContext | null {
  try {
    audio ??= new AudioContext();
    return audio;
  } catch {
    return null;
  }
}

// Browsers keep sound switched off until the person has clicked or typed on the page. Wake the audio up on the
// first interaction, so the very first message already rings.
if (typeof window !== 'undefined') {
  const unlock = () => {
    const ctx = context();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

/** One soft bell-like note: a pure tone with a quiet octave above it, a quick soft attack and a smooth fade. */
function note(ctx: AudioContext, out: AudioNode, freq: number, start: number, length: number, level: number) {
  const body = ctx.createOscillator();
  const shimmer = ctx.createOscillator();
  const gain = ctx.createGain();
  body.type = 'sine';
  shimmer.type = 'sine';
  body.frequency.setValueAtTime(freq, start);
  shimmer.frequency.setValueAtTime(freq * 2, start);
  const shimmerGain = ctx.createGain();
  shimmerGain.gain.value = 0.22;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(level, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(level * 0.45, start + length * 0.35);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  body.connect(gain);
  shimmer.connect(shimmerGain).connect(gain);
  gain.connect(out);
  body.start(start);
  shimmer.start(start);
  body.stop(start + length + 0.05);
  shimmer.stop(start + length + 0.05);
}

/**
 * The sound of a new message: a friendly two-note "pop-ding" (a short low note, then a higher one), like a chat app.
 * Made in the browser, so no sound file is needed.
 */
export function playPing() {
  if (!current.sound) return;
  try {
    const ctx = context();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime + 0.01;

    // A gentle low-pass and a faint echo take the harshness off the sine tones and give it a little room
    const master = ctx.createGain();
    master.gain.value = 0.9;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 5200;
    const echo = ctx.createDelay(0.5);
    echo.delayTime.value = 0.16;
    const echoGain = ctx.createGain();
    echoGain.gain.value = 0.2;
    master.connect(tone);
    tone.connect(ctx.destination);
    tone.connect(echo).connect(echoGain).connect(ctx.destination);

    note(ctx, master, 987.77, t, 0.22, 0.2); // B5
    note(ctx, master, 1318.51, t + 0.11, 0.5, 0.24); // E6
  } catch {
    /* the browser has not allowed sound yet */
  }
}
