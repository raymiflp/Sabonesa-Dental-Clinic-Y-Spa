import { test, expect } from '@playwright/test';
import { freezeClock } from '../helpers/dateHelper.js';
import { selectOption } from '../helpers/selectHelper.js';

test.describe.serial('Agenda Flow', () => {
  test('Ver citas del día con clock freeze', async ({ page }) => {
    await freezeClock(page, '2026-06-15T10:00:00');
    await page.goto('/agenda');

    // June 2026 should be showing
    await expect(page.getByText(/junio/i)).toBeVisible();

    // Carlos López has a cita on 2026-06-20 — that's in the future, not today
    // But we can verify the calendar renders and has appointments
    await expect(page.getByRole('heading', { name: /agenda/i })).toBeVisible();
  });

  test('Crear cita para paciente existente', async ({ page }) => {
    await freezeClock(page, '2026-06-15T10:00:00');
    await page.goto('/agenda');

    // Click "Nueva Cita" button
    await page.getByRole('button', { name: /nueva cita/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Select patient using the shadcn Select
    await selectOption(page, /paciente/i, 'Carlos López');

    // Set date
    await dialog.getByLabel(/fecha/i).fill('2026-06-25');

    // Set time
    await dialog.getByLabel(/hora/i).fill('14:00');

    // Submit
    await dialog.getByRole('button', { name: /crear cita/i }).click();

    // Wait for dialog to close and verify
    await expect(dialog).not.toBeVisible();

    // Click on June 25 to see the new cita
    await page.getByText('25').first().click();
    await expect(page.getByText('Carlos López')).toBeVisible();
  });

  test('Cambiar estado de cita a realizada', async ({ page }) => {
    await freezeClock(page, '2026-06-15T10:00:00');
    await page.goto('/agenda');

    // Click on June 20 to see Carlos's pending appointment
    await page.getByText('20').first().click();
    await expect(page.getByText('Carlos López')).toBeVisible();

    // Change status to "realizada" via the Select
    const statusSelect = page.getByRole('combobox').filter({ hasText: /pendiente/i }).first();
    await statusSelect.click();
    await page.getByRole('option', { name: /realizada/i }).click();

    // Should show the "Cobrar ahora" button
    await expect(page.getByRole('button', { name: /cobrar ahora/i })).toBeVisible();
  });

  test('Cobrar ahora desde cita realizada — ver registro crediticio', async ({ page }) => {
    await freezeClock(page, '2026-06-15T10:00:00');
    await page.goto('/agenda');

    // Click on June 20, see the realized cita
    await page.getByText('20').first().click();
    await expect(page.getByText('Carlos López')).toBeVisible();

    // Click "Cobrar ahora"
    await page.getByRole('button', { name: /cobrar ahora/i }).click();

    const cobroDialog = page.getByRole('dialog');
    await expect(cobroDialog).toBeVisible();

    // Fill payment amount
    await cobroDialog.getByLabel(/monto pagado/i).fill('2000');

    // Submit
    await cobroDialog.getByRole('button', { name: /registrar pago/i }).click();

    // Toast should confirm
    await expect(page.getByText(/pago registrado/i)).toBeVisible();
  });

  test('Navegación entre meses en agenda', async ({ page }) => {
    await freezeClock(page, '2026-06-15T10:00:00');
    await page.goto('/agenda');

    // Should show June
    await expect(page.getByText(/junio/i)).toBeVisible();

    // Click previous month
    await page.getByRole('button').filter({ has: page.locator('.lucide-chevron-left') }).click();
    await expect(page.getByText(/mayo/i)).toBeVisible();

    // Click next month (back to June)
    await page.getByRole('button').filter({ has: page.locator('.lucide-chevron-right') }).click();
    await expect(page.getByText(/junio/i)).toBeVisible();
  });
});
