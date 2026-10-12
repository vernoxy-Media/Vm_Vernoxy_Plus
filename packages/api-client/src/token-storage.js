let currentAccessToken = null;
// Multi-tab logout sync
const authChannel = typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('pulse_auth_sync')
    : null;
let listeners = [];
if (authChannel) {
    authChannel.onmessage = (event) => {
        if (event.data?.type === 'LOGOUT') {
            currentAccessToken = null;
        }
        listeners.forEach((listener) => listener(event.data));
    };
}
export function getAccessToken() {
    return currentAccessToken;
}
export function setAccessToken(token) {
    currentAccessToken = token;
}
export function broadcastLogout() {
    currentAccessToken = null;
    authChannel?.postMessage({ type: 'LOGOUT' });
    listeners.forEach((listener) => listener({ type: 'LOGOUT' }));
}
export function subscribeAuthEvents(callback) {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((l) => l !== callback);
    };
}
