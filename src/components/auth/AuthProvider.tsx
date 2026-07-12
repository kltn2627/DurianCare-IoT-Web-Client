"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authClient, ClientAuthError } from "@/lib/auth/client";
import type { AuthSession, LoginRequest } from "@/lib/auth/types";
import { profileClient, ProfileApiError } from "@/lib/profile/client";

interface AuthContextValue {
  user: AuthSession | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<AuthSession>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<AuthSession | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const syncProfile = useCallback(async (session: AuthSession) => {
    try {
      const profile = await profileClient.me();
      const mergedProfile = {
        ...session.profile,
        ...profile,
        fullName: profile.fullName || session.profile.fullName,
        phoneNumber: profile.phoneNumber ?? session.profile.phoneNumber,
        farmAddress:
          profile.address || profile.provinceCity
            ? [profile.address, profile.provinceCity].filter(Boolean).join(", ")
          : session.profile.farmAddress,
      };
      const nextSession = {
        ...session,
        accountStatus: profile.accountStatus ?? session.accountStatus,
        profile: mergedProfile,
      };
      setUser(nextSession);
      return nextSession;
    } catch (error) {
      if (error instanceof ProfileApiError && error.status === 401) {
        setUser(session);
        return session;
      }
      setUser(session);
      return session;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const session = await authClient.session();
      return await syncProfile(session);
    } catch (error) {
      if (error instanceof ClientAuthError && error.status === 401) {
        setUser(null);
        return null;
      }
      throw error;
    }
  }, [syncProfile]);

  useEffect(() => {
    refreshSession()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (credentials) => {
        const session = await authClient.login(credentials);
        return await syncProfile(session);
      },
      logout: async () => {
        try {
          await authClient.logout();
        } finally {
          setUser(null);
        }
      },
      refreshSession,
    }),
    [loading, refreshSession, syncProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
