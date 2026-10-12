let currentAccessToken: string | null = null;

// Multi-tab logout sync
const authChannel =
  typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('pulse_auth_sync')
    : null;

type AuthEvent = { type: 'LOGOUT' } | { type: 'LOGIN'; token: string };

let listeners: Array<(event: AuthEvent) => void> = [];

if (authChannel) {
  authChannel.onmessage = (event: MessageEvent<AuthEvent>) => {
    if (event.data?.type === 'LOGOUT') {
      currentAccessToken = null;
    }
    listeners.forEach((listener) => listener(event.data));
  };
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

export function broadcastLogout() {
  currentAccessToken = null;
  authChannel?.postMessage({ type: 'LOGOUT' });
  listeners.forEach((listener) => listener({ type: 'LOGOUT' }));
}

export function subscribeAuthEvents(callback: (event: AuthEvent) => void): () => void {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}
