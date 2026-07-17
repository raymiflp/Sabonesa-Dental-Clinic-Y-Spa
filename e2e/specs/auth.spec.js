import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { USERS } from '../fixtures/users.js';

test.describe.serial('Auth Flow', () => {
  test('Login válido como admin — redirect a dashboard, ver sidebar', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/correo electrónico/i).fill(USERS.admin.email);
    await page.getByLabel(/contraseña/i).fill(USERS.admin.password);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await page.waitForURL('/');

    // Should show the dashboard and sidebar with user info
    await expect(page.getByText(USERS.admin.nombre, { exact: true })).toBeVisible();
    await expect(page.getByText(USERS.admin.rol, { exact: true })).toBeVisible();
    // Admin sees all nav items including crediticio
    await expect(page.getByRole('link', { name: /historial crediticio/i })).toBeVisible();
  });

  test('Login con credenciales inválidas — ver mensaje de error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/correo electrónico/i).fill(USERS.admin.email);
    await page.getByLabel(/contraseña/i).fill('wrongpassword');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // Error message in the red box
    await expect(page.getByText(/credenciales inválidas/i)).toBeVisible();
    // Should still be on login page
    await expect(page).toHaveURL('/login');
  });

  test('Logout — limpia token, redirect a /login', async ({ page }) => {
    await login(page, 'admin');

    // Click logout button (LogOut icon button in the sidebar footer)
    await page.getByTitle('Cerrar sesión').click();

    // Should redirect to login
    await page.waitForURL('/login');
    // LocalStorage token should be gone
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('Acceder a ruta protegida sin auth — redirect a /login', async ({ page }) => {
    // Clear any existing auth
    await page.goto('/');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('Sidebar items varían según rol — admin', async ({ page }) => {
    await login(page, 'admin');
    const sidebarLinks = [
      'Inicio',
      'Agenda',
      'Historial Clínico',
      'Historial Crediticio',
      'Procedimientos',
      'Inventario',
      'Configuración',
    ];
    for (const label of sidebarLinks) {
      await expect(page.getByRole('link', { name: new RegExp(label, 'i') })).toBeVisible();
    }
  });

  test('Sidebar items varían según rol — doctor (sin Crediticio)', async ({ page }) => {
    await login(page, 'doctor');
    // Doctor sees Inicio, Agenda, Historial, Procedimientos, Inventario, Configuración
    await expect(page.getByRole('link', { name: /inicio/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /agenda/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /historial clínico/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /procedimientos/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /inventario/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /configuración/i })).toBeVisible();
    // Doctor should NOT see crediticio
    await expect(page.getByRole('link', { name: /historial crediticio/i })).not.toBeVisible();
  });

  test('Sidebar items varían según rol — asistente (mínimo)', async ({ page }) => {
    await login(page, 'asistente');
    // Asistente sees Inicio, Agenda, Historial, Inventario
    await expect(page.getByRole('link', { name: /inicio/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /agenda/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /historial clínico/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /inventario/i })).toBeVisible();
    // Should NOT see crediticio, procedimientos, configuración
    await expect(page.getByRole('link', { name: /historial crediticio/i })).not.toBeVisible();
    await expect(page.getByRole('link', { name: /procedimientos/i })).not.toBeVisible();
    await expect(page.getByRole('link', { name: /configuración/i })).not.toBeVisible();
  });
});
