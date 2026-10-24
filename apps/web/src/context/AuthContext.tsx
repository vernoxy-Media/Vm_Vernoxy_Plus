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
    } catch (err) {
      console.error('[FETCH_PROFILE_ERROR]', err);
      setUser(null);
      setAccessToken(null);
      return null;
    }
  }, []);

  // Initialize session on app load
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const token = await restoreSession();
        if (token && isMounted) {
          await fetchProfile();
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
  }, [fetchProfile, queryClient]);

  const handleLoginSuccess = async (data: VerifyLoginResponseDto) => {
    setAccessToken(data.access_token);
    await fetchProfile();
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
