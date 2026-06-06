/**
 * Convierte una hora en formato 24h (HH:MM) a formato 12h (h:MM AM/PM).
 * - "08:00" → "8:00 AM"
 * - "14:30" → "2:30 PM"
 * - "00:15" → "12:15 AM"
 * - "12:00" → "12:00 PM"
 * - null/undefined/vacío → "—"
 * - Si no coincide con el patrón HH:MM, se devuelve tal cual.
 */
export function to12h(hora) {
  if (!hora) return '—';
  const match = String(hora).match(/^(\d{2}):(\d{2})$/);
  if (!match) return hora;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}
