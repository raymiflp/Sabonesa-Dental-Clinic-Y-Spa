import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { selectOption } from '../helpers/selectHelper.js';

test.describe.serial('Crediticio Flow', () => {
  test('Listar registros crediticios como admin', async ({ page }) => {
    await page.goto('/crediticio');
    await expect(page.getByRole('heading', { name: /historial crediticio/i })).toBeVisible();

    // Should show the calendar and stats cards
    await expect(page.getByText(/total pagado/i)).toBeVisible();
    await expect(page.getByText(/total abonado/i)).toBeVisible();
  });

  test('Crear nuevo abono/pago', async ({ page }) => {
    await page.goto('/crediticio');

    // Click "Nuevo Movimiento"
    await page.getByRole('button', { name: /nuevo movimiento/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Select patient
    await selectOption(page, /paciente/i, 'Juan Pérez');

    // Fill amounts
    await dialog.getByLabel(/monto pagado/i).fill('1000');
    await dialog.getByLabel(/monto abonado/i).fill('500');

    // Submit
    await dialog.getByRole('button', { name: /agregar/i }).click();

    // Toast confirmation
    await expect(page.getByText(/registro/i).or(page.getByText(/creado/i))).toBeVisible();
  });

  test('Ver totales calculados', async ({ page }) => {
    await page.goto('/crediticio');

    // Stats cards should show computed totals
    const pagadoText = await page.getByText(/total pagado/i).textContent();
    expect(pagadoText).toContain('RD$');

    const abonadoText = await page.getByText(/total abonado/i).textContent();
    expect(abonadoText).toContain('RD$');
  });

  test('Descargar exportación XLSX', async ({ page }) => {
    await page.goto('/crediticio');

    // Click the export button
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /exportar excel/i }).click(),
    ]);

    expect(download.suggestedFilename()).toContain('.xlsx');
  });

  test('Verificar acceso denegado para rol no-admin', async ({ page }) => {
    // Login as doctor (which has no crediticio access)
    await login(page, 'doctor');
    await page.goto('/crediticio');

    // Should see "Acceso denegado" message
    await expect(page.getByText(/acceso denegado/i)).toBeVisible();
    await expect(page.getByText(/no tienes permisos/i)).toBeVisible();
  });
});
