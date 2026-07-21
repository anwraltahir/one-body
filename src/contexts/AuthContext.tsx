import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  authApi,
  setTokens,
  clearTokens,
  getAccessToken,
  AuthUser,
} from '../lib/api';
import { UserProfile } from '../types';

const OAUTH_STATE_KEY = 'google_oauth_state';
const OAUTH_NEXT_KEY = 'google_oauth_next';
const OAUTH_ERROR_KEY = 'google_oauth_error';

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  startGoogleLogin: (nextPath?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  consumeGoogleOAuthError: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toProfile(user: AuthUser): UserProfile {
  return {
    uid: String(user.uid),
    displayName: user.displayName || 'متبرع',
    email: user.email || '',
    photoURL: user.photoURL || '',
    role: user.role || 'user',
    createdAt: user.createdAt,
    phone: user.phone,
    isSuperuser: user.isSuperuser,
    isStaff: user.isStaff,
  };
}

function clearOAuthQueryFromUrl() {
  const url = new URL(window.location.href);
  ['code', 'state', 'scope', 'authuser', 'prompt', 'hd', 'error', 'error_description'].forEach((k) =>
    url.searchParams.delete(k),
  );
  const clean = url.pathname + (url.search ? url.search : '') + url.hash;
  window.history.replaceState({}, document.title, clean || '/');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAuth = useCallback((authUser: AuthUser) => {
    setUser(authUser);
    setProfile(toProfile(authUser));
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setProfile(null);
      return;
    }
    try {
      const me = await authApi.profile();
      applyAuth(me);
    } catch {
      clearTokens();
      setUser(null);
      setProfile(null);
    }
  }, [applyAuth]);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const oauthError = params.get('error');
        const code = params.get('code');
        const state = params.get('state');

        if (oauthError) {
          sessionStorage.setItem(
            OAUTH_ERROR_KEY,
            params.get('error_description') || oauthError || 'google_oauth_error',
          );
          clearOAuthQueryFromUrl();
          if (getAccessToken()) await refreshProfile();
          return;
        }

        if (code) {
          const savedState = sessionStorage.getItem(OAUTH_STATE_KEY);
          if (savedState && state && savedState !== state) {
            sessionStorage.setItem(OAUTH_ERROR_KEY, 'فشل التحقق من أمان تسجيل الدخول (state).');
            clearOAuthQueryFromUrl();
            return;
          }

          const redirectUri = window.location.origin;
          const data = await authApi.google({ code, redirect_uri: redirectUri });
          setTokens(data.access, data.refresh);
          applyAuth(data.user);
          sessionStorage.removeItem(OAUTH_STATE_KEY);
          const next = sessionStorage.getItem(OAUTH_NEXT_KEY) || '/dashboard';
          sessionStorage.removeItem(OAUTH_NEXT_KEY);
          clearOAuthQueryFromUrl();
          // Full navigation so protected routes remount with tokens
          if (window.location.pathname !== next) {
            window.location.replace(next);
            return;
          }
          return;
        }

        if (getAccessToken()) {
          await refreshProfile();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل تسجيل الدخول عبر Google';
        sessionStorage.setItem(OAUTH_ERROR_KEY, msg);
        clearOAuthQueryFromUrl();
      } finally {
        setLoading(false);
      }
    })();
  }, [applyAuth, refreshProfile]);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setTokens(data.access, data.refresh);
    applyAuth(data.user);
  };

  const register = async (email: string, password: string, displayName?: string) => {
    const data = await authApi.register({
      email,
      password,
      password_confirm: password,
      displayName,
    });
    setTokens(data.access, data.refresh);
    applyAuth(data.user);
  };

  const loginWithGoogle = async (credential: string) => {
    const data = await authApi.google({ credential });
    setTokens(data.access, data.refresh);
    applyAuth(data.user);
  };

  const startGoogleLogin = async (nextPath = '/dashboard') => {
    const config = await authApi.googleConfig();
    if (!config.googleEnabled || !config.googleClientId) {
      throw new Error('تسجيل الدخول عبر Google غير مفعّل حالياً.');
    }

    const state =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    sessionStorage.setItem(OAUTH_STATE_KEY, state);
    sessionStorage.setItem(OAUTH_NEXT_KEY, nextPath);

    // Must match an Authorized redirect URI in Google Cloud exactly (no trailing slash).
    const redirectUri = window.location.origin;
    const params = new URLSearchParams({
      client_id: config.googleClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      include_granted_scopes: 'true',
      state,
      prompt: 'select_account',
    });

    window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  };

  const consumeGoogleOAuthError = () => {
    const msg = sessionStorage.getItem(OAUTH_ERROR_KEY);
    if (msg) sessionStorage.removeItem(OAUTH_ERROR_KEY);
    return msg;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    clearTokens();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        register,
        loginWithGoogle,
        startGoogleLogin,
        logout,
        refreshProfile,
        consumeGoogleOAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
