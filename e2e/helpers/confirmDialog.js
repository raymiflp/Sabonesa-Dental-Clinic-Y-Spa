/**
 * Handles the password confirmation dialog that appears for destructive actions.
 * The PasswordConfirmDialog component has a form with:
 *   - Password input labeled "Contraseña" (id="confirm-password")
 *   - A submit button with text "Confirmar"
 */
export async function confirmAction(page, password = 'Test1234!') {
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();

  await dialog.getByLabel(/contraseña/i).fill(password);
  await dialog.getByRole('button', { name: /confirmar/i }).click();

  // Wait for the dialog to close
  await dialog.waitFor({ state: 'hidden' });
}
