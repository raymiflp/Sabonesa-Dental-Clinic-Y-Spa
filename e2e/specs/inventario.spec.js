import { test, expect } from '@playwright/test';
import { confirmAction } from '../helpers/confirmDialog.js';

test.describe.serial('Inventario Flow', () => {
  test('Listar insumos con colores de stock', async ({ page }) => {
    await page.goto('/inventario');
    await expect(page.getByRole('heading', { name: /inventario/i })).toBeVisible();

    // Should see all 3 seeded insumos
    await expect(page.getByText('Guantes')).toBeVisible();
    await expect(page.getByText('Mascarillas')).toBeVisible();
    await expect(page.getByText('Anestesia')).toBeVisible();

    // Stock badges: Anestesia has 0 => red
    const anestesiaRow = page.getByRole('row').filter({ hasText: 'Anestesia' });
    await expect(anestesiaRow.locator('td').filter({ hasText: '0' })).toBeVisible();
  });

  test('Crear insumo nuevo', async ({ page }) => {
    await page.goto('/inventario');

    await page.getByRole('button', { name: /nuevo insumo/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel(/nombre/i).fill('Batas desechables');
    await dialog.getByLabel(/cantidad/i).fill('30');
    await dialog.getByLabel(/precio unitario/i).fill('250');

    await dialog.getByRole('button', { name: /guardar/i }).click();

    // Should appear in the table
    await expect(page.getByText('Batas desechables')).toBeVisible();
  });

  test('Editar cantidad/precio de insumo', async ({ page }) => {
    await page.goto('/inventario');

    // Find edit button for "Guantes"
    const guantesRow = page.getByRole('row').filter({ hasText: 'Guantes' });
    await guantesRow.getByRole('button').filter({ has: page.locator('.lucide-pencil') }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel(/cantidad/i).fill('100');
    await dialog.getByRole('button', { name: /guardar/i }).click();

    // Verify the updated quantity is visible
    await expect(page.getByText('100')).toBeVisible();
  });

  test('Eliminar insumo', async ({ page }) => {
    await page.goto('/inventario');

    // Find delete button for "Batas desechables"
    const batasRow = page.getByRole('row').filter({ hasText: 'Batas desechables' });
    await batasRow.getByRole('button').filter({ has: page.locator('.lucide-trash-2') }).click();

    await confirmAction(page);

    // Should be gone
    await expect(page.getByText('Batas desechables')).not.toBeVisible();
  });
});
