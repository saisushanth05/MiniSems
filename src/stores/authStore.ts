// Mini Sems — Auth Store (Zustand)
// Manages authentication state, language preference, device info

import {create} from 'zustand';
import {MMKV} from 'react-native-mmkv';
import type {AuthUser} from '@apptypes/user.types';
import type {UserRole} from '@apptypes/database.types';

const storage = new MMKV({id: 'auth-store'});

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  language: 'en' | 'te';
  deviceId: string;
  // Actions
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setLanguage: (lang: 'en' | 'te') => void;
  setDeviceId: (id: string) => void;
  logout: () => void;
  updateTokens: (accessToken: string, refreshToken: string, expiresAt: number) => void;
  hasRole: (role: UserRole) => boolean;
  isTokenExpired: () => boolean;
}

// Load persisted state from MMKV
const getPersistedUser = (): AuthUser | null => {
  try {
    const raw = storage.getString('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getPersistedLanguage = (): 'en' | 'te' => {
  return (storage.getString('language') as 'en' | 'te') || 'en';
};

const getPersistedDeviceId = (): string => {
  return storage.getString('device_id') || '';
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getPersistedUser(),
  isAuthenticated: !!getPersistedUser(),
  isLoading: false,
  language: getPersistedLanguage(),
  deviceId: getPersistedDeviceId(),

  setUser: (user) => {
    if (user) {
      storage.set('auth_user', JSON.stringify(user));
    } else {
      storage.delete('auth_user');
    }
    set({user, isAuthenticated: !!user});
  },

  setLoading: (isLoading) => set({isLoading}),

  setLanguage: (language) => {
    storage.set('language', language);
    set({language});
  },

  setDeviceId: (deviceId) => {
    storage.set('device_id', deviceId);
    set({deviceId});
  },

  logout: () => {
    storage.delete('auth_user');
    set({user: null, isAuthenticated: false});
  },

  updateTokens: (accessToken, refreshToken, expiresAt) => {
    const user = get().user;
    if (!user) return;
    const updated = {...user, accessToken, refreshToken, expiresAt};
    storage.set('auth_user', JSON.stringify(updated));
    set({user: updated});
  },

  hasRole: (role: UserRole) => {
    return get().user?.role === role;
  },

  isTokenExpired: () => {
    const user = get().user;
    if (!user) return true;
    return Date.now() > user.expiresAt;
  },
}));
