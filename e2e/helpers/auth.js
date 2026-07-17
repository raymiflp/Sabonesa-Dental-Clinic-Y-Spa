import { USERS } from '../fixtures/users.js';

/**
 * Logs in with the specified role by filling the login form and submitting.
 * Assumes the user is on the login page or navigates to /login.
 * Returns the page after successful login.
 */
export async function login(page, role) {
  const user = USERS[role];
  if (!user) throw new Error(`Unknown role: ${role}`);

  await page.goto('/login');
  await page.getByLabel(/correo electrónico/i).fill(user.email);
  await page.getByLabel(/contraseña/i).fill(user.password);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await page.waitForURL('/');
  return page;
}
