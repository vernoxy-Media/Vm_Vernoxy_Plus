import { useEffect } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { applyAppTheme, themeCache } from './app-theme';

/** Puts the signed-in employee's theme on the page; signing out brings the default back. */
export const AppThemeSync = (): null => {
  const { user, isLoading } = useAuth();
  const theme = user?.ui_theme ?? null;

  useEffect(() => {
    if (isLoading) return; // the remembered theme stays until the profile arrives
    applyAppTheme(theme);
    themeCache.write(theme);
  }, [theme, isLoading, user === null]);

  return null;
};
