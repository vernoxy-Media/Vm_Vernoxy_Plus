import { useState, useCallback } from 'react';
import { getAccessToken } from '@vernoxy-pulse/api-client';

export function useAuthenticatedDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async (url: string, fallbackFilename = 'download') => {
    setIsDownloading(true);
    setError(null);

    try {
      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
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
    } catch (err: any) {
      setError(err?.message || 'Download failed');
      throw err;
    } finally {
      setIsDownloading(false);
    }
  }, []);

  return { download, isDownloading, error };
}
