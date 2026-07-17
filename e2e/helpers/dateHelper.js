/**
 * Freezes the clock at a fixed date/time for deterministic date-sensitive tests.
 * @param {import('@playwright/test').Page} page
 * @param {string} isoDate - ISO date string like '2026-06-15T10:00:00'
 */
export async function freezeClock(page, isoDate = '2026-06-15T10:00:00') {
  await page.clock.install();
  await page.clock.setFixedTime(new Date(isoDate));
}
