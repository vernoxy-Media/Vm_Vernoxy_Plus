import { getAccessToken } from '@vernoxy-pulse/api-client';

/** Desktop notifications (Web Push) for when the app is not open. Everything here is best effort. */

export type PushState = 'unsupported' | 'blocked' | 'off' | 'on' | 'unavailable';

interface PushConfig {
  enabled: boolean;
  public_key: string | null;
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  const h: Record<string, string> = { 'X-Requested-With': 'pulse-web', 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function loadConfig(): Promise<PushConfig | null> {
  try {
    const res = await fetch('/api/v1/push/config', { headers: authHeaders(), credentials: 'include' });
    if (!res.ok) return null;
    return (await res.json()) as PushConfig;
  } catch {
    return null;
  }
}

function keyToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64Url.length / 4) * 4, '=');
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function toBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return '';
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  return existing ?? navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

/** Tells the server about this browser (safe to repeat; it refreshes the stored keys). */
async function sendToServer(sub: PushSubscription): Promise<boolean> {
  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh ?? toBase64Url(sub.getKey('p256dh'));
  const auth = json.keys?.auth ?? toBase64Url(sub.getKey('auth'));
  try {
    const res = await fetch('/api/v1/push/subscriptions', {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ endpoint: sub.endpoint, p256dh, auth }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function currentPushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = await reg?.pushManager.getSubscription();
    if (sub && Notification.permission === 'granted') return 'on';
  } catch {
    /* treated as off */
  }
  return 'off';
}

/** Asks for permission (must come from a click) and subscribes this browser. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const config = await loadConfig();
  if (!config?.enabled || !config.public_key) return 'unavailable';
  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'blocked';
  if (permission !== 'granted') return 'off';
  try {
    const reg = await registration();
    await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(config.public_key) }));
    return (await sendToServer(sub)) ? 'on' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export async function disablePush(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch('/api/v1/push/subscriptions', {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => undefined);
      await sub.unsubscribe();
    }
  } catch {
    /* already off */
  }
  return 'off';
}

/** On every sign-in: if the person already allowed notifications, quietly keep this browser registered (and tied to them). */
export async function syncPushSilently(): Promise<void> {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  const config = await loadConfig();
  if (!config?.enabled || !config.public_key) return;
  try {
    const reg = await registration();
    await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(config.public_key) }));
    await sendToServer(sub);
  } catch {
    /* try again next time */
  }
}
