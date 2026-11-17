import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getAccessToken,
  setAccessToken,
  broadcastLogout,
  subscribeAuthEvents,
  restoreSession,
  customFetch,
  MeResponseDto,
  VerifyLoginResponseDto,
} from '@vernoxy-pulse/api-client';

interface AuthContextType {
  user: MeResponseDto | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  handleLoginSuccess: (data: VerifyLoginResponseDto) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<MeResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const fetchProfile = useCallback(async (): Promise<MeResponseDto | null> => {
    try {
      const profile = await customFetch<MeResponseDto>('/api/v1/auth/me');
      setUser(profile);
      return profile;
    } catch {
      setUser(null);
      setAccessToken(null);
      return null;
    }
  }, []);

  /**
   * Auto clock-in: the first time the employee opens Pulse each day (fresh login
   * or a restored session), punch in through the normal attendance endpoint so
   * leave rules apply (no check-in on a full-day leave, or before the second half
   * on a first-half leave). The API ignores a second punch-in the same day.
   */
  const autoClockIn = useCallback(
    async (empId: number | undefined) => {
      if (!empId) return;
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
      const key = `pulse_auto_clock_in_${empId}`;
      try {
        if (localStorage.getItem(key) === today) return;
      } catch {
        /* storage unavailable: just try */
      }
      try {
        await customFetch('/api/v1/attendance/check-in', { method: 'POST' });
      } catch (err: any) {
        // Only "already checked in / out today" (409) settles the day. Leave
        // blocks (e.g. a first-half leave before the second half starts),
        // network or server errors are tried again on the next app load.
        if (Number(err?.status) !== 409) return;
      }
      try {
        localStorage.setItem(key, today);
      } catch {
        /* ignore */
      }
      queryClient.invalidateQueries({ queryKey: ['attendance_dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['attendance_day_detail'] });
    },
    [queryClient],
  );

  // Initialize session on app load
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const token = await restoreSession();
        if (token && isMounted) {
          const profile = await fetchProfile();
          void autoClockIn(profile?.emp_id);
        }
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    // BroadcastChannel sync across tabs
    const unsubscribe = subscribeAuthEvents((event) => {
      if (event.type === 'LOGOUT') {
        setUser(null);
        setAccessToken(null);
        queryClient.clear();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [fetchProfile, queryClient, autoClockIn]);

  const handleLoginSuccess = async (data: VerifyLoginResponseDto) => {
    setAccessToken(data.access_token);
    const profile = await fetchProfile();
    // Auto punch-in on login; never blocks the login itself.
    await autoClockIn(profile?.emp_id ?? data.user?.emp_id);
  };

  const logout = async () => {
    try {
      await customFetch<void>('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Ignored
    } finally {
      setUser(null);
      setAccessToken(null);
      queryClient.clear();
      broadcastLogout();
    }
  };

  const logoutAll = async () => {
    try {
      await customFetch<void>('/api/v1/auth/logout-all', { method: 'POST' });
    } catch {
      // Ignored
    } finally {
      setUser(null);
      setAccessToken(null);
      queryClient.clear();
      broadcastLogout();
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user && getAccessToken()),
        handleLoginSuccess,
        logout,
        logoutAll,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
