import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';

// ─── Mock localStorage ────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

// ─── Mock API module ──────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  authApi: { login: vi.fn() },
  getToken: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));

import { authApi, getToken, setToken, clearToken } from '@/lib/api';

const mockUser = {
  id: 'u1',
  name: 'Juan',
  lastName: 'Perez',
  email: 'juan@test.com',
  role: 'VECINO' as const,
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    (getToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  // ─── Initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('should start unauthenticated when no token in storage', async () => {
      (getToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await act(async () => {});

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should restore session when valid token and user in localStorage', async () => {
      (getToken as ReturnType<typeof vi.fn>).mockReturnValue('saved-token');
      localStorageMock.setItem('privadas_auth_user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await act(async () => {});

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('juan@test.com');
      expect(result.current.token).toBe('saved-token');
    });

    it('should clear corrupt stored user and remain unauthenticated', async () => {
      (getToken as ReturnType<typeof vi.fn>).mockReturnValue('saved-token');
      localStorageMock.setItem('privadas_auth_user', '{invalid json');

      const { result } = renderHook(() => useAuth(), { wrapper });
      await act(async () => {});

      expect(result.current.isAuthenticated).toBe(false);
      expect(clearToken).toHaveBeenCalled();
    });
  });

  // ─── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should authenticate and store token on success', async () => {
      (getToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        access_token: 'new-token',
        user: mockUser,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await act(async () => {});

      let response!: { success: boolean; error?: string };
      await act(async () => {
        response = await result.current.login('juan@test.com', 'pass');
      });

      expect(response.success).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('juan@test.com');
      expect(setToken).toHaveBeenCalledWith('new-token');
    });

    it('should return error on failed login', async () => {
      (getToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (authApi.login as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Credenciales incorrectas'),
      );

      const { result } = renderHook(() => useAuth(), { wrapper });
      await act(async () => {});

      let response!: { success: boolean; error?: string };
      await act(async () => {
        response = await result.current.login('bad@test.com', 'wrong');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Credenciales incorrectas');
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  // ─── logout ─────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should clear auth state on logout', async () => {
      (getToken as ReturnType<typeof vi.fn>).mockReturnValue('saved-token');
      localStorageMock.setItem('privadas_auth_user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await act(async () => {});

      expect(result.current.isAuthenticated).toBe(true);

      act(() => result.current.logout());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(clearToken).toHaveBeenCalled();
    });
  });

  // ─── useAuth guard ──────────────────────────────────────────────────────────

  describe('useAuth outside provider', () => {
    it('should throw when used outside AuthProvider', () => {
      expect(() => renderHook(() => useAuth())).toThrow(
        'useAuth must be used within an AuthProvider',
      );
    });
  });
});
