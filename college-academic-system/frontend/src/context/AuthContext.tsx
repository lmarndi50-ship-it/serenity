import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { setAuthFailureHandler, tokenStore } from '@/services/api';
import { authService } from '@/services';
import type { AuthUser, Role } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Landing route for each role, used after login and by the guards. */
export const HOME_ROUTE: Record<Role, string> = {
  STUDENT: '/dashboard',
  TEACHER: '/teacher/dashboard',
  ADMIN: '/admin/dashboard',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!tokenStore.access) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      setUser(await authService.me());
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // When a refresh attempt fails for good, drop the session immediately.
    setAuthFailureHandler(() => setUser(null));
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (identifier: string, password: string, rememberMe = false) => {
    const data = await authService.login(identifier, password, rememberMe);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout, refreshUser }),
    [user, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}
