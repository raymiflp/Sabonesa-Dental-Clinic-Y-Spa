import { test, expect } from '@playwright/test';
import { confirmAction } from '../helpers/confirmDialog.js';

test.describe.serial('Procedimientos Flow', () => {
  test('Listar categorías expandidas', async ({ page }) => {
    await page.goto('/procedimientos');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /procedimientos/i })).toBeVisible();

    // Should see the seeded categories
    await expect(page.getByText('Odontología General')).toBeVisible();
    await expect(page.getByText('Cirugía')).toBeVisible();

    // Expand Odontología General
    await page.getByText('Odontología General').click();
    await expect(page.getByText('Consulta general')).toBeVisible();
    await expect(page.getByText('Limpieza dental')).toBeVisible();
  });

  test('Crear categoría nueva', async ({ page }) => {
    await page.goto('/procedimientos');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /nueva categoría/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel(/nombre/i).fill('Odontopediatría E2E');
    await dialog.getByRole('button', { name: /crear/i }).click();

    // Should appear in the list
    await expect(page.getByText('Odontopediatría E2E')).toBeVisible();
  });

  test('Crear procedimiento dentro de categoría', async ({ page }) => {
    await page.goto('/procedimientos');
    await page.waitForLoadState('networkidle');

    // Expand Cirugía and click "Agregar"
    await page.getByText('Cirugía').click();
    await page.getByRole('button', { name: /agregar/i }).filter({ hasText: /agregar/i }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill procedure name
    await dialog.getByLabel(/nombre/i).fill('Cirugía de prueba E2E');
    await dialog.getByLabel(/precio sugerido/i).fill('5000');

    await dialog.getByRole('button', { name: /crear/i }).click();

    // Should appear under Cirugía category
    await expect(page.getByText('Cirugía de prueba E2E')).toBeVisible();
  });

  test('Editar procedimiento', async ({ page }) => {
    await page.goto('/procedimientos');
    await page.waitForLoadState('networkidle');

    // Expand Odontología General
    await page.getByText('Odontología General').click();

    // Find the edit button for "Consulta general"
    const procRow = page.getByText('Consulta general').locator('..');
    await procRow.getByRole('button').filter({ has: page.locator('.lucide-edit-2') }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel(/precio sugerido/i).fill('9999');
    await dialog.getByRole('button', { name: /actualizar/i }).click();

    // Verify toast or updated price
    await expect(page.getByText('9999')).toBeVisible();
  });

  test('Eliminar procedimiento', async ({ page }) => {
    await page.goto('/procedimientos');
    await page.waitForLoadState('networkidle');

    // Expand Cirugía
    await page.getByText('Cirugía').click();

    // Find the delete button for "Cirugía de prueba E2E"
    const procRow = page.getByText('Cirugía de prueba E2E').locator('..');
    await procRow.getByRole('button').filter({ has: page.locator('.lucide-trash-2') }).click();

    await confirmAction(page);

    // Should be gone
    await expect(page.getByText('Cirugía de prueba E2E')).not.toBeVisible();
  });
});
