import { test, expect } from '@playwright/test';

/**
 * E2E tests for routing and navigation guards.
 *
 * These tests verify that ProtectedRoute correctly redirects unauthenticated
 * users and that authenticated users with the correct role can access protected
 * pages.
 */

test.describe('Navigation guards (unauthenticated)', () => {
  test('should redirect / to /login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login', { timeout: 5_000 });
  });

  test('should redirect /admin to /login when not authenticated', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL('/login', { timeout: 5_000 });
  });

  test('should redirect /admin/usuarios to /login when not authenticated', async ({ page }) => {
    await page.goto('/admin/usuarios');
    await expect(page).toHaveURL('/login', { timeout: 5_000 });
  });

  test('should redirect /perfil to /login when not authenticated', async ({ page }) => {
    await page.goto('/perfil');
    await expect(page).toHaveURL('/login', { timeout: 5_000 });
  });

  test('should redirect /cuotas to /login when not authenticated', async ({ page }) => {
    await page.goto('/cuotas');
    await expect(page).toHaveURL('/login', { timeout: 5_000 });
  });
});

test.describe('Navigation guards (vecino role)', () => {
  test.beforeEach(async ({ context }) => {
    // Inject a VECINO auth session
    await context.addInitScript(() => {
      localStorage.setItem('privadas_token', 'fake-vecino-token');
      localStorage.setItem(
        'privadas_auth_user',
        JSON.stringify({
          id: 'u1',
          name: 'Juan',
          lastName: 'Vecino',
          email: 'juan@test.com',
          role: 'VECINO',
        }),
      );
    });
  });

  test('should access vecino home (/)', async ({ page }) => {
    await page.goto('/');
    // Should NOT redirect to login
    await expect(page).not.toHaveURL('/login', { timeout: 5_000 });
  });

  test('should redirect /admin to vecino home when role is VECINO', async ({ page }) => {
    await page.goto('/admin');
    // ProtectedRoute should kick VECINO out of /admin routes → redirect to /
    await expect(page).not.toHaveURL('/admin', { timeout: 5_000 });
  });
});

test.describe('Navigation guards (admin role)', () => {
  test.beforeEach(async ({ context }) => {
    // Inject an ADMIN auth session
    await context.addInitScript(() => {
      localStorage.setItem('privadas_token', 'fake-admin-token');
      localStorage.setItem(
        'privadas_auth_user',
        JSON.stringify({
          id: 'u2',
          name: 'Ana',
          lastName: 'Admin',
          email: 'admin@test.com',
          role: 'ADMIN',
        }),
      );
    });
  });

  test('should access /admin when role is ADMIN', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).not.toHaveURL('/login', { timeout: 5_000 });
    await expect(page).toHaveURL(/\/admin/, { timeout: 5_000 });
  });

  test('should redirect ADMIN from vecino-only routes to /admin', async ({ page }) => {
    await page.goto('/cuotas');
    // Admin accessing vecino route → redirected to /admin
    await expect(page).not.toHaveURL('/cuotas', { timeout: 5_000 });
  });
});

test.describe('Not Found page', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      localStorage.setItem('privadas_token', 'fake-token');
      localStorage.setItem(
        'privadas_auth_user',
        JSON.stringify({
          id: 'u1',
          name: 'Juan',
          lastName: 'Vecino',
          email: 'juan@test.com',
          role: 'VECINO',
        }),
      );
    });
  });

  test('should show 404 page for unknown route', async ({ page }) => {
    await page.goto('/ruta-que-no-existe');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible({
      timeout: 5_000,
    });
  });
});
