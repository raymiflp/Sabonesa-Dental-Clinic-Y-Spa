import { test, expect } from '@playwright/test';

test.describe.serial('Configuracion Flow', () => {
  test('Cargar página de configuración', async ({ page }) => {
    await page.goto('/configuracion');
    // Wait for async data to load (component has loading state via api.getConfiguracion + getWhatsappStatus)
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /configuración/i })).toBeVisible();

    // Should see the WhatsApp card
    await expect(page.getByText('WhatsApp')).toBeVisible();
    // Should see the Recordatorios card
    await expect(page.getByText(/recordatorios automáticos/i)).toBeVisible();
  });

  test('Cambiar modo de proveedor WhatsApp', async ({ page }) => {
    await page.goto('/configuracion');

    // Find the WhatsApp provider Select
    const providerSelect = page.getByRole('combobox').filter({ hasText: /wa|whatsapp|link/i }).first();
    await providerSelect.click();

    // Select "Manual" option
    await page.getByRole('option', { name: /manual/i }).click();

    // Toast should confirm the change
    await expect(page.getByText(/manual/i).or(page.getByText(/modo cambiado/i))).toBeVisible();
  });

  test('Activar/desactivar notificaciones', async ({ page }) => {
    await page.goto('/configuracion');

    // Find the toggle button for recordatorios
    const toggleButton = page.getByRole('button', { name: /activado|desactivado/i });
    const currentText = await toggleButton.textContent();

    // Click the toggle
    await toggleButton.click();

    // The text should change
    if (currentText?.includes('Activado')) {
      await expect(page.getByRole('button', { name: /desactivado/i })).toBeVisible();
    } else {
      await expect(page.getByRole('button', { name: /activado/i })).toBeVisible();
    }
  });

  test('Guardar configuración', async ({ page }) => {
    await page.goto('/configuracion');

    // Click "Guardar configuración" button
    await page.getByRole('button', { name: /guardar configuración/i }).click();

    // Toast should confirm
    await expect(page.getByText(/configuración guardada/i)).toBeVisible();
  });
});
