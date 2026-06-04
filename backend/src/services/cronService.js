import cron from 'node-cron';
import { checkAndSendReminders } from './recordatorioService.js';

let _task = null;

/**
 * Inicia el cron job de recordatorios.
 * Corre cada 30 minutos. La lógica interna de recordatorioService
 * determina si debe enviar o no (según recordatorio_hora y si ya se enviaron hoy).
 */
export function startCronJobs(prisma) {
  if (_task) {
    console.log('[Cron] Ya está corriendo.');
    return;
  }

  console.log('[Cron] Iniciando job de recordatorios (cada 5 min)...');

  _task = cron.schedule('*/5 * * * *', async () => {
    console.log('[Cron] Ejecutando checkAndSendReminders...');
    const result = await checkAndSendReminders(prisma);
    console.log('[Cron] Resultado:', JSON.stringify(result));
  });

  console.log('[Cron] Job iniciado.');
}

/**
 * Detiene el cron job.
 */
export function stopCronJobs() {
  if (_task) {
    _task.stop();
    _task = null;
    console.log('[Cron] Job detenido.');
  }
}
