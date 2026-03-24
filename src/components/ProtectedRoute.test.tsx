import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';
import { ProtectedRoute } from './ProtectedRoute';

// ─── Mock AuthContext ─────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/contexts/AuthContext';

function renderRoute(
  authState: ReturnType<typeof useAuth>,
  allowedRoles?: Parameters<typeof ProtectedRoute>[0]['allowedRoles'],
) {
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(authState);

  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/admin" element={<div>Admin Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  // ─── Loading state ──────────────────────────────────────────────────────────

  it('should show loading spinner while auth is loading', () => {
    renderRoute({ isLoading: true, isAuthenticated: false, user: null, token: null });

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  // ─── Unauthenticated ────────────────────────────────────────────────────────

  it('should redirect to /login when not authenticated', () => {
    renderRoute({ isLoading: false, isAuthenticated: false, user: null, token: null });

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  // ─── Authenticated, no role restriction ─────────────────────────────────────

  it('should render children when authenticated and no allowedRoles', () => {
    renderRoute({
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'u1', name: 'Juan', lastName: 'P', email: 'juan@test.com', role: 'VECINO' },
      token: 'tok',
    });

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  // ─── Role restriction ───────────────────────────────────────────────────────

  it('should render children when user role is in allowedRoles', () => {
    renderRoute(
      {
        isLoading: false,
        isAuthenticated: true,
        user: { id: 'u1', name: 'Juan', lastName: 'P', email: 'juan@test.com', role: 'VECINO' },
        token: 'tok',
      },
      ['VECINO'],
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect VECINO to / when accessing admin-only route', () => {
    renderRoute(
      {
        isLoading: false,
        isAuthenticated: true,
        user: { id: 'u1', name: 'Juan', lastName: 'P', email: 'juan@test.com', role: 'VECINO' },
        token: 'tok',
      },
      ['ADMIN', 'SUPER_ADMIN'],
    );

    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should redirect ADMIN to /admin when accessing vecino-only route', () => {
    renderRoute(
      {
        isLoading: false,
        isAuthenticated: true,
        user: { id: 'u2', name: 'Admin', lastName: 'A', email: 'admin@test.com', role: 'ADMIN' },
        token: 'tok',
      },
      ['VECINO'],
    );

    expect(screen.getByText('Admin Page')).toBeInTheDocument();
  });

  it('should redirect PRESIDENTE to /admin when accessing vecino-only route', () => {
    renderRoute(
      {
        isLoading: false,
        isAuthenticated: true,
        user: { id: 'u3', name: 'Pres', lastName: 'P', email: 'pres@test.com', role: 'PRESIDENTE' },
        token: 'tok',
      },
      ['VECINO'],
    );

    expect(screen.getByText('Admin Page')).toBeInTheDocument();
  });
});
