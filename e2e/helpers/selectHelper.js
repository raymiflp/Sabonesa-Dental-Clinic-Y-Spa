/**
 * Selects an option from a shadcn/ui Select component (Base UI).
 * The Select uses role="combobox" for the trigger and role="option" for options
 * rendered in a portal (role="listbox").
 */
export async function selectOption(page, triggerLabel, optionText) {
  // Click the trigger button/combobox
  await page.getByRole('combobox', { name: triggerLabel }).click();

  // Wait for the popup/portal to appear and click the option
  const listbox = page.getByRole('listbox');
  await listbox.waitFor();
  await listbox.getByRole('option', { name: optionText }).click();
}
