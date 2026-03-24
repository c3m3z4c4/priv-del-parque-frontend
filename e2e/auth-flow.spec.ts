import { test, expect } from '@playwright/test';

/**
 * E2E tests for the complete authentication flow.
 *
 * NOTE: The "successful login" tests below require the backend to be running.
 * They use the seed credentials defined in backend/src/main.ts.
 */

test.describe('Authentication flow', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveTitle(/Privadas|Vite/i);
    await expect(page.getByRole('heading', { name: 'Iniciar Sesión' })).toBeVisible();
  });

  test('should fill and submit login form', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Correo electrónico').fill('superadmin@privadasdelparque.com');
    await page.getByLabel('Contraseña').fill('SuperAdmin2025!');

    // Intercept the API call to avoid needing a real backend
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-jwt-token',
          user: {
            id: 'u-super',
            name: 'Super',
            lastName: 'Admin',
            email: 'superadmin@privadasdelparque.com',
            role: 'SUPER_ADMIN',
          },
        }),
      });
    });

    await page.getByRole('button', { name: 'Ingresar' }).click();

    // After redirect, should be on admin dashboard
    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 });
  });

  test('should handle login API error gracefully', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Correo electrónico').fill('wrong@test.com');
    await page.getByLabel('Contraseña').fill('WrongPassword');

    // Mock a 401 response
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Credenciales incorrectas' }),
      });
    });

    await page.getByRole('button', { name: 'Ingresar' }).click();

    // Error toast should appear
    await expect(
      page.getByText('Error de autenticación'),
    ).toBeVisible({ timeout: 5_000 });

    // Should remain on login page
    await expect(page).toHaveURL('/login');
  });

  test('should redirect authenticated ADMIN to /admin after login', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Correo electrónico').fill('admin@test.com');
    await page.getByLabel('Contraseña').fill('AdminPass!');

    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'admin-jwt',
          user: {
            id: 'u-admin',
            name: 'Ana',
            lastName: 'Admin',
            email: 'admin@test.com',
            role: 'ADMIN',
          },
        }),
      });
    });

    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 });
  });

  test('should redirect authenticated VECINO to / after login', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Correo electrónico').fill('vecino@test.com');
    await page.getByLabel('Contraseña').fill('VecinoPass!');

    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'vecino-jwt',
          user: {
            id: 'u-vecino',
            name: 'Juan',
            lastName: 'Vecino',
            email: 'vecino@test.com',
            role: 'VECINO',
          },
        }),
      });
    });

    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL('/', { timeout: 10_000 });
  });
});
