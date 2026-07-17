import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';

test.describe.serial('Roles Flow', () => {
  test('Admin ve todos los links del sidebar', async ({ page }) => {
    await login(page, 'admin');

    const expectedLinks = [
      /inicio/i,
      /agenda/i,
      /historial clínico/i,
      /historial crediticio/i,
      /procedimientos/i,
      /inventario/i,
      /configuración/i,
    ];
    for (const link of expectedLinks) {
      await expect(page.getByRole('link', { name: link })).toBeVisible();
    }
  });

  test('Doctor no ve Crediticio en sidebar', async ({ page }) => {
    await login(page, 'doctor');

    // Doctor should see these
    await expect(page.getByRole('link', { name: /inicio/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /agenda/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /historial clínico/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /procedimientos/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /inventario/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /configuración/i })).toBeVisible();

    // Doctor should NOT see crediticio
    await expect(page.getByRole('link', { name: /historial crediticio/i })).not.toBeVisible();
  });

  test('Asistente solo ve Inicio, Agenda, Historial, Inventario', async ({ page }) => {
    await login(page, 'asistente');

    // Should see
    await expect(page.getByRole('link', { name: /inicio/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /agenda/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /historial clínico/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /inventario/i })).toBeVisible();

    // Should NOT see
    await expect(page.getByRole('link', { name: /historial crediticio/i })).not.toBeVisible();
    await expect(page.getByRole('link', { name: /procedimientos/i })).not.toBeVisible();
    await expect(page.getByRole('link', { name: /configuración/i })).not.toBeVisible();
  });

  test('Acceder directamente a /crediticio como doctor — ver pantalla "Acceso denegado"', async ({ page }) => {
    await login(page, 'doctor');
    await page.goto('/crediticio');

    // ProtectedRoute renders "Acceso denegado" for non-admin users
    await expect(page.getByText(/acceso denegado/i)).toBeVisible();
    await expect(page.getByText(/no tienes permisos/i)).toBeVisible();
  });
});
