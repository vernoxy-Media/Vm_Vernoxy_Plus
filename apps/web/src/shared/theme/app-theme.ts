/**
 * The colour theme of the app, chosen by each employee.
 *
 * The app's blue and indigo (buttons, active items, links, badges) read their colours from CSS variables with the
 * original colours as fallback. The default theme sets no variable at all, so nothing changes for it; any other
 * theme sets the variables and every blue / indigo turns into that colour.
 */
export interface AppTheme {
  id: string;
  name: string;
  /** The main colour (the "600" of the scale). */
  accent: string;
}

export const DEFAULT_THEME_ID = 'indigo';

export const APP_THEMES: AppTheme[] = [
  { id: 'indigo', name: 'Indigo (default)', accent: '#4F46E5' },
  { id: 'ocean', name: 'Ocean', accent: '#0284C7' },
  { id: 'emerald', name: 'Emerald', accent: '#059669' },
  { id: 'rose', name: 'Rose', accent: '#E11D48' },
  { id: 'amber', name: 'Sunset', accent: '#D97706' },
  { id: 'violet', name: 'Violet', accent: '#7C3AED' },
  { id: 'teal', name: 'Teal', accent: '#0D9488' },
  { id: 'slate', name: 'Graphite', accent: '#334155' },
];

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
/** How far each shade is from the main colour: positive mixes in white, negative mixes in black. */
const MIX: Record<(typeof SHADES)[number], number> = { 50: 0.94, 100: 0.88, 200: 0.76, 300: 0.58, 400: 0.38, 500: 0.18, 600: 0, 700: -0.15, 800: -0.32, 900: -0.48, 950: -0.64 };

const CACHE_KEY = 'pulse-app-theme';

const rgbOf = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

function shade(accent: string, amount: number): string {
  const [r, g, b] = rgbOf(accent);
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  const mix = (c: number) => Math.round(c + (target - c) * t);
  return `${mix(r)} ${mix(g)} ${mix(b)}`;
}

/** Colours that are written as hex in the code (the Jira-style screens, attendance, ...): how far each is from the main colour. */
const AC: Record<string, number> = { 'ac-main': 0, 'ac-hover': 0.12, 'ac-dark': -0.28, 'ac-50': 0.9, 'ac-200': 0.72, 'ac-400': 0.45 };
const AC_RGB = { 'ac-main-rgb': 0, 'ac-50-rgb': 0.9 } as const;

function hexOf(accent: string, amount: number): string {
  return '#' + shade(accent, amount).split(' ').map((c) => Number(c).toString(16).padStart(2, '0')).join('');
}

const ALL_VARS = ['blue', 'indigo']
  .flatMap((p) => SHADES.map((s) => `--tw-${p}-${s}`))
  .concat(['--brand-primary-rgb', '--brand-primary-hover-rgb', '--primary', '--ring'])
  .concat(Object.keys(AC).map((k) => `--${k}`), Object.keys(AC_RGB).map((k) => `--${k}`));

/** HSL of the accent for the `primary` token (shadcn style: "H S% L%"). */
function hslOf(hex: string): string {
  const [r0, g0, b0] = rgbOf(hex).map((c) => c / 255) as [number, number, number];
  const max = Math.max(r0, g0, b0);
  const min = Math.min(r0, g0, b0);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r0) h = ((g0 - b0) / d) % 6;
    else if (max === g0) h = (b0 - r0) / d + 2;
    else h = (r0 - g0) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const themeById = (id: string | null | undefined): AppTheme => APP_THEMES.find((t) => t.id === id) ?? APP_THEMES[0]!;

/** Puts the theme on the page. The default removes every override. */
export function applyAppTheme(id: string | null | undefined): void {
  const root = document.documentElement;
  for (const v of ALL_VARS) root.style.removeProperty(v);
  const theme = themeById(id);
  if (theme.id !== DEFAULT_THEME_ID) {
    for (const p of ['blue', 'indigo']) for (const s of SHADES) root.style.setProperty(`--tw-${p}-${s}`, shade(theme.accent, MIX[s]));
    root.style.setProperty('--brand-primary-rgb', shade(theme.accent, 0));
    root.style.setProperty('--brand-primary-hover-rgb', shade(theme.accent, -0.15));
    root.style.setProperty('--primary', hslOf(theme.accent));
    root.style.setProperty('--ring', hslOf(theme.accent));
    for (const [name, amount] of Object.entries(AC)) root.style.setProperty(`--${name}`, hexOf(theme.accent, amount));
    for (const [name, amount] of Object.entries(AC_RGB)) root.style.setProperty(`--${name}`, shade(theme.accent, amount));
  }
  root.dataset.appTheme = theme.id;
}

/** Remembered only so the page does not flash the default colour before the profile arrives; the database is the truth. */
export const themeCache = {
  read: (): string | null => {
    try {
      return localStorage.getItem(CACHE_KEY);
    } catch {
      return null;
    }
  },
  write: (id: string | null) => {
    try {
      if (id && id !== DEFAULT_THEME_ID) localStorage.setItem(CACHE_KEY, id);
      else localStorage.removeItem(CACHE_KEY);
    } catch {
      /* private mode */
    }
  },
};
