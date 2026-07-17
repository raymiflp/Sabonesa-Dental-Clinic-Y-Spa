import { test, expect } from '@playwright/test';
import { confirmAction } from '../helpers/confirmDialog.js';

test.describe.serial('Patients Flow', () => {
  test('Listar pacientes en /historial', async ({ page }) => {
    await page.goto('/historial');
    await expect(page.getByRole('heading', { name: /historial clínico/i })).toBeVisible();
    // Should see the 3 seeded patients in the table
    await expect(page.getByText('Juan')).toBeVisible();
    await expect(page.getByText('María')).toBeVisible();
    await expect(page.getByText('Carlos')).toBeVisible();
  });

  test('Buscar paciente por nombre', async ({ page }) => {
    await page.goto('/historial');
    const searchInput = page.getByPlaceholder(/buscar paciente por nombre/i);
    await searchInput.fill('Juan');

    // Should only see Juan in the filtered results
    await expect(page.getByText('Juan')).toBeVisible();
    await expect(page.getByText('María')).not.toBeVisible();
  });

  test('Crear paciente nuevo con datos mínimos', async ({ page }) => {
    await page.goto('/historial');
    await page.getByRole('button', { name: /nuevo paciente/i }).click();

    // Fill required fields
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/nombres/i).fill('Pedro');
    await dialog.getByLabel(/apellidos/i).fill('Prueba');

    // Submit
    await dialog.getByRole('button', { name: /crear paciente/i }).click();

    // Should appear in the table
    await expect(page.getByText('Pedro')).toBeVisible();
    await expect(page.getByText('Prueba')).toBeVisible();
  });

  test('Editar paciente existente', async ({ page }) => {
    await page.goto('/historial');

    // Find the edit button for Juan Pérez and click it
    const juanRow = page.getByRole('row').filter({ hasText: 'Juan' });
    await juanRow.getByRole('button').filter({ has: page.locator('.lucide-pencil') }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/teléfono/i).fill('809-555-9999');
    await dialog.getByRole('button', { name: /guardar cambios/i }).click();

    // Verify the update via toast or re-appearance
    await expect(page.getByText('809-555-9999')).toBeVisible();
  });

  test('Eliminar paciente', async ({ page }) => {
    await page.goto('/historial');

    // Find the delete button for the newly created Pedro Prueba
    const pedroRow = page.getByRole('row').filter({ hasText: 'Pedro' });
    await pedroRow.getByRole('button').filter({ has: page.locator('.lucide-trash-2') }).click();

    await confirmAction(page);

    // Pedro should no longer be in the table
    await expect(page.getByText('Pedro')).not.toBeVisible();
  });
});
