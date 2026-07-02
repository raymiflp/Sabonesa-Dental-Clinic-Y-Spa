import { ProviderResolver } from '../whatsapp/provider.js';

const DELAY_MS = 1500; // 1.5s entre mensajes para evitar rate limiting

/**
 * Retorna la fecha actual en YYYY-MM-DD (zona horaria del servidor)
 */
function hoy() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Retorna fecha futura: hoy + n días
 */
function fechaMasDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

/**
 * Reemplaza variables en una plantilla
 * {nombre}, {clinica}, {fecha}, {hora}, {procedimiento}
 */
function renderMensaje(template, vars) {
  return template
    .replace(/\{nombre\}/g, vars.nombre || '')
    .replace(/\{clinica\}/g, vars.clinica || 'la clínica')
    .replace(/\{fecha\}/g, vars.fecha || '')
    .replace(/\{hora\}/g, vars.hora || '')
    .replace(/\{procedimiento\}/g, vars.procedimiento || '');
}

/** Formatea fecha como DD/MM/YYYY. Acepta Date (Prisma) o string ISO/YYYY-MM-DD. */
function formatFecha(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (isNaN(d)) return '';
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${d.getUTCFullYear()}`;
}

/**
 * Espera N ms (promise)
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Envía recordatorios de citas para el día siguiente (o según anticipacion_dias).
 * Diseñado para ser ejecutado por un cron.
 */
export async function checkAndSendReminders(prisma) {
  try {
    // 1. Leer configuraciones
    const configs = await prisma.configuracion.findMany({
      where: {
        clave: {
          in: [
            'recordatorio_habilitado',
            'recordatorio_anticipacion_dias',
            'recordatorio_hora',
            'clinica_nombre',
            'plantilla_recordatorio',
            'whatsapp_provider_mode',
          ]
        }
      }
    });
    const cfg = {};
    configs.forEach(c => { cfg[c.clave] = c.valor; });

    // 2. Validar que esté habilitado
    if (cfg.recordatorio_habilitado !== 'true') {
      console.log('[Recordatorio] Deshabilitado, saltando.');
      return { enviados: 0, fallidos: 0, motivo: 'deshabilitado' };
    }

    // 3. Validar la hora — solo enviar si ya pasó recordatorio_hora
    const ahora = new Date();
    const horaActual = String(ahora.getHours()).padStart(2, '0') + ':' + String(ahora.getMinutes()).padStart(2, '0');
    const horaEnvio = cfg.recordatorio_hora || '08:00';
    if (horaActual < horaEnvio) {
      console.log(`[Recordatorio] Aún no es hora (${horaActual} < ${horaEnvio}), saltando.`);
      return { enviados: 0, fallidos: 0, motivo: `esperando hora ${horaEnvio}` };
    }

    // 4. Calcular fecha objetivo
    const anticipacion = parseInt(cfg.recordatorio_anticipacion_dias || '1', 10);
    const fechaTarget = fechaMasDias(anticipacion);
    const clinicaNombre = cfg.clinica_nombre || 'Sabonesa Dental Clinic Y Spa';
    const plantillaRecordatorio = cfg.plantilla_recordatorio || 'Hola {nombre}, recordatorio: tienes una cita en {clinica} mañana a las {hora}. Te esperamos.';

    // 5. Buscar citas pendientes o confirmadas para la fecha objetivo
    const citas = await prisma.cita.findMany({
      where: {
        fecha: fechaTarget,
        estado: { in: ['pendiente', 'confirmada'] },
      },
      include: {
        paciente: {
          select: { id: true, nombres: true, apellidos: true, telefono: true, tieneWhatsapp: true },
        },
      },
      orderBy: { hora: 'asc' },
    });

    if (citas.length === 0) {
      console.log(`[Recordatorio] No hay citas para ${fechaTarget}`);
      return { enviados: 0, fallidos: 0, motivo: 'sin_citas' };
    }

    console.log(`[Recordatorio] ${citas.length} cita(s) para ${fechaTarget}, procesando...`);

    // 6. Verificar cuáles ya tienen recordatorio enviado hoy
    const existing = await prisma.recordatorio.findMany({
      where: {
        citaId: { in: citas.map(c => c.id) },
        tipo: 'recordatorio_cita',
        estado: 'enviado',
        createdAt: { gte: new Date(hoy() + 'T00:00:00.000Z') },
      },
      select: { citaId: true },
    });
    const yaEnviados = new Set(existing.map(r => r.citaId));

    const providerResolver = new ProviderResolver(prisma);
    let enviados = 0;
    let fallidos = 0;

    // 7. Enviar uno por uno con delay
    for (const cita of citas) {
      if (yaEnviados.has(cita.id)) {
        console.log(`  ⏭️ Cita #${cita.id} ya tiene recordatorio enviado hoy`);
        continue;
      }

      const p = cita.paciente;
      if (!p.telefono || !p.tieneWhatsapp) {
        console.log(`  ⏭️ Paciente #${p.id} sin teléfono/WhatsApp`);
        continue;
      }

      const nombre = `${p.nombres || ''} ${p.apellidos || ''}`.trim();
      const mensaje = renderMensaje(plantillaRecordatorio, {
        nombre,
        clinica: clinicaNombre,
        fecha: formatFecha(cita.fecha),
        hora: cita.hora || '—',
        procedimiento: cita.procedimiento || '',
      });

      console.log(`  📤 Enviando a ${nombre} (${p.telefono})...`);

      try {
        const result = await providerResolver.sendWithFallback({
          telefono: p.telefono,
          mensaje,
          paciente: p,
          prisma,
        });

        await prisma.recordatorio.create({
          data: {
            pacienteId: p.id,
            citaId: cita.id,
            tipo: 'recordatorio_cita',
            destinatario: 'paciente',
            telefono: p.telefono,
            mensaje,
            whatsappUrl: result.waUrl || null,
            errorMsg: result.error || null,
            estado: result.exito ? 'enviado' : 'fallido',
            enviadoEn: new Date(),
          },
        });

        if (result.exito) {
          enviados++;
          console.log(`  ✅ Enviado a ${nombre}`);
        } else {
          fallidos++;
          console.log(`  ❌ Fallido a ${nombre}: ${result.error}`);
        }
      } catch (err) {
        fallidos++;
        console.error(`  ❌ Error enviando a ${nombre}:`, err.message);
        await prisma.recordatorio.create({
          data: {
            pacienteId: p.id,
            citaId: cita.id,
            tipo: 'recordatorio_cita',
            destinatario: 'paciente',
            telefono: p.telefono,
            mensaje,
            errorMsg: err.message,
            estado: 'fallido',
          },
        });
      }

      // Delay entre mensajes
      await sleep(DELAY_MS);
    }

    console.log(`[Recordatorio] Completado: ${enviados} enviados, ${fallidos} fallidos`);
    return { enviados, fallidos, total: citas.length };
  } catch (err) {
    console.error('[Recordatorio] Error general:', err.message);
    return { enviados: 0, fallidos: 0, error: err.message };
  }
}

/**
 * Envía un mensaje de confirmación cuando una cita cambia a 'confirmada'.
 * Se llama desde el controlador de agenda.
 */
export async function sendConfirmacionCita(prisma, citaId) {
  try {
    const cita = await prisma.cita.findUnique({
      where: { id: citaId },
      include: {
        paciente: {
          select: { id: true, nombres: true, apellidos: true, telefono: true, tieneWhatsapp: true },
        },
      },
    });

    if (!cita || !cita.paciente?.telefono || !cita.paciente?.tieneWhatsapp) return null;

    const configs = await prisma.configuracion.findMany({
      where: { clave: { in: ['clinica_nombre', 'plantilla_confirmacion'] } },
    });
    const cfg = {};
    configs.forEach(c => { cfg[c.clave] = c.valor; });

    const clinicaNombre = cfg.clinica_nombre || 'Sabonesa Dental Clinic Y Spa';
    const plantilla = cfg.plantilla_confirmacion || 'Hola {nombre}, tu cita en {clinica} del {fecha} a las {hora} ha sido confirmada. Gracias.';
    const p = cita.paciente;
    const nombre = `${p.nombres || ''} ${p.apellidos || ''}`.trim();
    const mensaje = renderMensaje(plantilla, {
      nombre,
      clinica: clinicaNombre,
      fecha: formatFecha(cita.fecha),
      hora: cita.hora || '—',
      procedimiento: cita.procedimiento || '',
    });

    const providerResolver = new ProviderResolver(prisma);
    const result = await providerResolver.sendWithFallback({
      telefono: p.telefono,
      mensaje,
      paciente: p,
      prisma,
    });

    await prisma.recordatorio.create({
      data: {
        pacienteId: p.id,
        citaId: cita.id,
        tipo: 'confirmacion_cita',
        destinatario: 'paciente',
        telefono: p.telefono,
        mensaje,
        whatsappUrl: result.waUrl || null,
        errorMsg: result.error || null,
        estado: result.exito ? 'enviado' : 'fallido',
        enviadoEn: new Date(),
      },
    });

    console.log(`[Confirmacion] ${result.exito ? '✅' : '❌'} Cita #${citaId} → ${nombre}`);
    return result;
  } catch (err) {
    console.error(`[Confirmacion] Error cita #${citaId}:`, err.message);
    return null;
  }
}

/**
 * Envía un mensaje de cancelación cuando una cita cambia a 'cancelada'.
 */
export async function sendCancelacionCita(prisma, citaId) {
  try {
    const cita = await prisma.cita.findUnique({
      where: { id: citaId },
      include: {
        paciente: {
          select: { id: true, nombres: true, apellidos: true, telefono: true, tieneWhatsapp: true },
        },
      },
    });

    if (!cita || !cita.paciente?.telefono || !cita.paciente?.tieneWhatsapp) return null;

    const configs = await prisma.configuracion.findMany({
      where: { clave: { in: ['clinica_nombre', 'plantilla_cancelacion'] } },
    });
    const cfg = {};
    configs.forEach(c => { cfg[c.clave] = c.valor; });

    const clinicaNombre = cfg.clinica_nombre || 'Sabonesa Dental Clinic Y Spa';
    const plantilla = cfg.plantilla_cancelacion || 'Hola {nombre}, tu cita en {clinica} del {fecha} ha sido cancelada. Para reagendar, contactanos.';
    const p = cita.paciente;
    const nombre = `${p.nombres || ''} ${p.apellidos || ''}`.trim();
    const mensaje = renderMensaje(plantilla, {
      nombre,
      clinica: clinicaNombre,
      fecha: formatFecha(cita.fecha),
      hora: cita.hora || '',
    });

    const providerResolver = new ProviderResolver(prisma);
    const result = await providerResolver.sendWithFallback({
      telefono: p.telefono,
      mensaje,
      paciente: p,
      prisma,
    });

    await prisma.recordatorio.create({
      data: {
        pacienteId: p.id,
        citaId: cita.id,
        tipo: 'confirmacion_cita',
        destinatario: 'paciente',
        telefono: p.telefono,
        mensaje,
        whatsappUrl: result.waUrl || null,
        errorMsg: result.error || null,
        estado: result.exito ? 'enviado' : 'fallido',
        enviadoEn: new Date(),
      },
    });

    console.log(`[Cancelacion] ${result.exito ? '✅' : '❌'} Cita #${citaId} → ${nombre}`);
    return result;
  } catch (err) {
    console.error(`[Cancelacion] Error cita #${citaId}:`, err.message);
    return null;
  }
}
