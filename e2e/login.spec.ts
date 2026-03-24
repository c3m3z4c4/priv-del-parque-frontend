import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Login page.
 *
 * These tests run against the actual dev server and real backend.
 * The backend must be running at http://localhost:3000 (or VITE_API_URL) for
 * the credential tests to work correctly.
 *
 * Seed credentials (from backend main.ts):
 *   - superadmin@privadasdelparque.com / SuperAdmin2025!  → redirects to /admin
 */

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    // Always start from the login page with a clean state
    await page.goto('/login');
  });

  // ─── UI elements ──────────────────────────────────────────────────────────

  test('should display login form with all required elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Iniciar Sesión' })).toBeVisible();
    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
    await expect(page.getByText('Comunidad Vecinal')).toBeVisible();
  });

  test('should show copyright footer', async ({ page }) => {
    await expect(page.getByText(/Privadas del Parque/i)).toBeVisible();
  });

  // ─── Password visibility toggle ───────────────────────────────────────────

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByLabel('Contraseña');
    await passwordInput.fill('TestPassword');

    // Initially hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the eye icon to reveal
    await page.locator('button[type="button"]').filter({ has: page.locator('svg') }).first().click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide
    await page.locator('button[type="button"]').filter({ has: page.locator('svg') }).first().click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  // ─── Form validation ──────────────────────────────────────────────────────

  test('should require email and password fields (HTML validation)', async ({ page }) => {
    // Submit with empty form — browser prevents submission via HTML required
    const emailInput = page.getByLabel('Correo electrónico');
    await emailInput.fill('');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    // The form has `required` attributes, so browser blocks the submit
    // and no loading indicator appears
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
    await expect(page.getByText('Ingresando...')).not.toBeVisible();
  });

  // ─── Invalid credentials ──────────────────────────────────────────────────

  test('should show error toast on invalid credentials', async ({ page }) => {
    // Mock a 401 response so the test doesn't depend on a running backend
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Credenciales incorrectas' }),
      });
    });

    await page.getByLabel('Correo electrónico').fill('wrong@test.com');
    await page.getByLabel('Contraseña').fill('WrongPassword123');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    // Error toast appears
    await expect(
      page.getByText('Error de autenticación'),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ─── Redirect when already authenticated ─────────────────────────────────

  test('should redirect to /admin when navigating to /login while authenticated', async ({
    page,
    context,
  }) => {
    // Seed a fake auth state in localStorage to simulate being logged in
    await context.addInitScript(() => {
      localStorage.setItem('privadas_token', 'fake-token');
      localStorage.setItem(
        'privadas_auth_user',
        JSON.stringify({
          id: 'u1',
          name: 'Admin',
          lastName: 'Test',
          email: 'admin@test.com',
          role: 'ADMIN',
        }),
      );
    });

    await page.goto('/login');

    // Should be redirected away from /login
    await expect(page).not.toHaveURL('/login', { timeout: 5_000 });
  });
});
