import { useSyncExternalStore } from 'react';

export interface ChatTheme {
  id: string;
  name: string;
  /** Send button, links, highlights. */
  accent: string;
  accentDark: string;
  /** My message bubbles. */
  mine: string;
  /** The wallpaper behind the messages. */
  bg: string;
  /** A second, slightly darker tone for the wallpaper pattern. */
  dot: string;
}

export const CHAT_THEMES: ChatTheme[] = [
  { id: 'indigo', name: 'Indigo', accent: '#4F46E5', accentDark: '#4338CA', mine: '#e0e7ff', bg: '#eef1f8', dot: '#dfe5f3' },
  { id: 'ocean', name: 'Ocean', accent: '#0284C7', accentDark: '#0369A1', mine: '#d6efff', bg: '#e9f4fb', dot: '#d3e8f5' },
  { id: 'emerald', name: 'Emerald', accent: '#059669', accentDark: '#047857', mine: '#d4f5e4', bg: '#eaf6f0', dot: '#d3ebdf' },
  { id: 'rose', name: 'Rose', accent: '#E11D48', accentDark: '#BE123C', mine: '#ffdce5', bg: '#fbeef1', dot: '#f4dae0' },
  { id: 'amber', name: 'Sunset', accent: '#D97706', accentDark: '#B45309', mine: '#ffecc7', bg: '#fbf4e6', dot: '#f3e6c9' },
  { id: 'violet', name: 'Violet', accent: '#7C3AED', accentDark: '#6D28D9', mine: '#eadcff', bg: '#f2edfb', dot: '#e4dbf5' },
  { id: 'teal', name: 'Teal', accent: '#0D9488', accentDark: '#0F766E', mine: '#cdf4ef', bg: '#e8f5f3', dot: '#d1e9e6' },
  { id: 'slate', name: 'Graphite', accent: '#334155', accentDark: '#1E293B', mine: '#dde3ec', bg: '#eceff3', dot: '#dde1e8' },
];

const DEFAULT_ID = 'indigo';

interface Stored {
  /** Used by every chat that has no theme of its own. */
  all: string;
  chats: Record<string, string>;
}

const keyOf = (empId: number) => `messenger-chat-themes:${empId}`;
const cache = new Map<string, Stored>();
const listeners = new Set<() => void>();

function read(empId: number): Stored {
  const key = keyOf(empId);
  const hit = cache.get(key);
  if (hit) return hit;
  let value: Stored = { all: DEFAULT_ID, chats: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (saved && typeof saved === 'object') value = { all: typeof saved.all === 'string' ? saved.all : DEFAULT_ID, chats: saved.chats && typeof saved.chats === 'object' ? saved.chats : {} };
  } catch {
    /* keep the default */
  }
  cache.set(key, value);
  return value;
}

function write(empId: number, value: Stored) {
  cache.set(keyOf(empId), value);
  try {
    localStorage.setItem(keyOf(empId), JSON.stringify(value));
  } catch {
    /* private mode: kept for this visit only */
  }
  listeners.forEach((l) => l());
}

const find = (id: string | undefined) => CHAT_THEMES.find((t) => t.id === id);

export function themeFor(empId: number, conversationId: number): ChatTheme {
  const s = read(empId);
  return find(s.chats[String(conversationId)]) ?? find(s.all) ?? CHAT_THEMES[0]!;
}

/** The theme chosen for this chat, or the one for all chats. It is personal: only the person who picked it sees it. */
export function useChatTheme(empId: number, conversationId: number): { theme: ChatTheme; ownTheme: boolean; allTheme: ChatTheme } {
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };
  const stored = useSyncExternalStore(subscribe, () => read(empId));
  const own = find(stored.chats[String(conversationId)]);
  const allTheme = find(stored.all) ?? CHAT_THEMES[0]!;
  return { theme: own ?? allTheme, ownTheme: Boolean(own), allTheme };
}

export function setChatTheme(empId: number, conversationId: number, themeId: string | null) {
  const s = read(empId);
  const chats = { ...s.chats };
  if (themeId) chats[String(conversationId)] = themeId;
  else delete chats[String(conversationId)];
  write(empId, { ...s, chats });
}

/** Every chat that has no theme of its own switches to this one. */
export function setAllChatsTheme(empId: number, themeId: string) {
  write(empId, { ...read(empId), all: themeId });
}

/** The CSS variables the chat reads, so one component set can wear any theme. */
export function themeVars(t: ChatTheme): Record<string, string> {
  return { '--chat-accent': t.accent, '--chat-accent-dark': t.accentDark, '--chat-mine': t.mine, '--chat-bg': t.bg, '--chat-dot': t.dot };
}
