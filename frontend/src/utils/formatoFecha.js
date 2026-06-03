/**
 * Convierte una fecha en formato ISO (YYYY-MM-DD) a DD/MM/YYYY para visualización.
 * Si la fecha es inválida o está vacía, devuelve '—'.
 */
export function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return '—';
  // Si ya está en formato DD/MM/YYYY, devolverlo igual
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateStr;
  const [, , mes, dia] = match;
  return `${dia}/${mes}/${match[1]}`;
}

/**
 * Convierte una fecha ISO a formato legible localizado: "1 de junio de 2026"
 */
export function formatDateLong(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(String(dateStr).includes('T') ? dateStr : dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
