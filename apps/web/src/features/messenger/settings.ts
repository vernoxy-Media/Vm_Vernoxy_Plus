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
/** A short soft "ping" for a new message, made in the browser so no sound file is needed. */
export function playPing() {
  if (!current.sound) return;
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.18);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  } catch {
    /* the browser has not allowed sound yet */
  }
}
