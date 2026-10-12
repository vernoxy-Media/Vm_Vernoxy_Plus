import { getAccessToken, setAccessToken, broadcastLogout } from './token-storage';

let refreshPromise: Promise<string | null> | null = null;

export async function restoreSession(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'pulse-web',
        },
        credentials: 'include',
      });

      if (!res.ok) {
        setAccessToken(null);
        return null;
      }

      const data = await res.json();
      if (data.access_token) {
        setAccessToken(data.access_token);
        return data.access_token;
      }
      return null;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function customFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();

  const headers = new Headers(options.headers || {});
  headers.set('X-Requested-With', 'pulse-web');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Single-flight refresh on 401 (excluding public endpoints)
  const isAuthRoute =
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/password/forgot') ||
    url.includes('/auth/password/reset');

  if (response.status === 401 && !isAuthRoute) {
    const newToken = await restoreSession();
    if (newToken) {
      // Retry once with new token
      headers.set('Authorization', `Bearer ${newToken}`);
      const retryResponse = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      if (retryResponse.status === 204) {
        return undefined as unknown as T;
      }

      if (!retryResponse.ok) {
        let errorData;
        try {
          errorData = await retryResponse.json();
        } catch {
          errorData = { message: retryResponse.statusText };
        }
        throw errorData;
      }

      return (await retryResponse.json()) as T;
    } else {
      broadcastLogout();
    }
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText, status: response.status };
    }
    throw errorData;
  }

  return (await response.json()) as T;
}
