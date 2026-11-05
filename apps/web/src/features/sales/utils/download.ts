import { getAccessToken } from '@vernoxy-pulse/api-client';

export interface DownloadOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  fallbackFilename?: string;
}

/**
 * Downloads a binary file with auth headers and extracts the filename from Content-Disposition.
 */
export async function downloadSalesFile(
  url: string,
  options: DownloadOptions = {},
): Promise<void> {
  const { method = 'GET', body, fallbackFilename = 'sales-export' } = options;
  const token = getAccessToken();

  const headers: Record<string, string> = {
    'X-Requested-With': 'pulse-web',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let requestBody: string | undefined = undefined;
  if (body) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method,
    headers,
    body: requestBody,
    credentials: 'include',
  });

  if (!response.ok) {
    let errMessage = `Download failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.detail) errMessage = errJson.detail;
      else if (errJson?.message) errMessage = errJson.message;
    } catch {
      // not json
    }
    throw new Error(errMessage);
  }

  // Parse filename from Content-Disposition header
  let filename = fallbackFilename;
  const disposition = response.headers.get('Content-Disposition');
  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match && utf8Match[1]) {
      filename = decodeURIComponent(utf8Match[1]);
    } else {
      const simpleMatch = disposition.match(/filename="?([^";]+)"?/i);
      if (simpleMatch && simpleMatch[1]) {
        filename = simpleMatch[1];
      }
    }
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}
