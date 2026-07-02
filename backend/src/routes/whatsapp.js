import { Router } from 'express';
import { waSession } from '../whatsapp/wa-session.js';
import { ProviderResolver } from '../whatsapp/provider.js';

const router = Router();

/**
 * GET /api/whatsapp/status
 * Retorna el estado actual de la conexión WhatsApp Web
 */
router.get('/status', async (req, res) => {
  try {
    const configs = await req.prisma.configuracion.findMany({
      where: { clave: { in: ['whatsapp_provider_mode', 'recordatorio_habilitado'] } },
    });
    const cfg = {};
    configs.forEach(c => { cfg[c.clave] = c.valor; });

    res.json({
      mode: cfg.whatsapp_provider_mode || 'manual',
      connected: waSession.isActive(),
      phoneNumber: waSession.phoneNumber || null,
      hasQR: !!waSession.getLastQR(),
      recordatorioHabilitado: cfg.recordatorio_habilitado === 'true',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/whatsapp/qr
 * Retorna el QR actual como data URL para mostrar en el frontend
 */
router.get('/qr', async (req, res) => {
  try {
    const qr = waSession.getLastQR();
    if (!qr) {
      return res.json({ qr: null, message: 'No hay QR disponible. ¿Ya está conectado?' });
    }
    // Devolver el raw QR string — el frontend genera el QR con librería
    res.json({ qr, connected: waSession.isActive() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/whatsapp/mode
 * Cambia el modo de proveedor WhatsApp
 * Body: { mode: 'manual' | 'web' }
 */
router.put('/mode', async (req, res) => {
  try {
    const { mode } = req.body;
    const validModes = ['manual', 'web'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({ error: `Modo inválido. Usar: ${validModes.join(', ')}` });
    }

    await req.prisma.configuracion.upsert({
      where: { clave: 'whatsapp_provider_mode' },
      update: { valor: mode },
      create: { clave: 'whatsapp_provider_mode', valor: mode },
    });

    // Si cambia a 'web', reiniciar sesión
    if (mode === 'web') {
      waSession.setPrisma(req.prisma);
      waSession.restart().catch(err => {
        console.error('[WhatsApp] Error reiniciando sesión web:', err.message);
      });
    }

    res.json({ mode, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/whatsapp/disconnect
 * Desconecta la sesión de WhatsApp Web
 */
router.post('/disconnect', async (req, res) => {
  try {
    await waSession.logout();
    res.json({ success: true, message: 'Sesión desconectada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/whatsapp/test
 * Envía un mensaje de prueba al número indicado
 * Body: { telefono: string, mensaje?: string }
 */
router.post('/test', async (req, res) => {
  try {
    const { telefono, mensaje } = req.body;
    if (!telefono) {
      return res.status(400).json({ error: 'Se requiere un número de teléfono' });
    }

    // Buscar un paciente con ese teléfono para contexto
    const paciente = await req.prisma.paciente.findFirst({
      where: { telefono },
      select: { id: true, nombres: true, apellidos: true, telefono: true },
    });

    const texto = mensaje || `🧪 Mensaje de prueba desde Sabonesa Dental Clinic Y Spa.\n\nSi recibes esto, el sistema de notificaciones funciona correctamente.`;

    const resolver = new ProviderResolver(req.prisma);
    const result = await resolver.sendWithFallback({
      telefono,
      mensaje: texto,
      paciente: paciente || { nombres: 'Test', telefono },
      prisma: req.prisma,
    });

    // Guardar registro de prueba
    if (paciente) {
      await req.prisma.recordatorio.create({
        data: {
          pacienteId: paciente.id,
          tipo: 'recordatorio_cita',
          destinatario: 'paciente',
          telefono,
          mensaje: texto,
          whatsappUrl: result.waUrl || null,
          errorMsg: result.error || null,
          estado: result.exito ? 'enviado' : 'fallido',
          enviadoEn: new Date(),
        },
      });
    }

    res.json({
      success: result.exito,
      mode: (await resolver.getActive()).mode,
      message: result.exito
        ? result.waUrl
          ? `Link wa.me generado: ${result.waUrl}`
          : 'Mensaje enviado correctamente'
        : `Error: ${result.error}`,
      waUrl: result.waUrl || null,
      error: result.error || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
