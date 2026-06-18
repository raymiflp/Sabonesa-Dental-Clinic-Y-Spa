import { sendConfirmacionCita, sendCancelacionCita } from '../services/recordatorioService.js';

export const getAll = async (req, res) => {
  try {
    const { fecha, pacienteId, estado, origen } = req.query;
    const where = {};
    if (fecha) where.fecha = fecha;
    if (pacienteId) where.pacienteId = Number(pacienteId);
    if (estado) where.estado = estado;
    if (origen) where.origen = origen;

    const citas = await req.prisma.cita.findMany({
      where,
      include: {
        paciente: {
          select: { id: true, nombres: true, apellidos: true, telefono: true }
        }
      },
      orderBy: [{ fecha: 'asc' }, { hora: 'asc' }]
    });
    res.json(citas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const data = req.body;

    // Validar campos requeridos
    if (!data.pacienteId || !data.fecha) {
      return res.status(400).json({ error: 'Paciente y fecha son requeridos' });
    }

    // Si el origen es "automatico", verificar duplicado
    if (data.origen === 'automatico') {
      const existente = await req.prisma.cita.findFirst({
        where: {
          pacienteId: Number(data.pacienteId),
          fecha: data.fecha,
          hora: data.hora,
          procedimiento: data.procedimiento
        }
      });
      if (existente) {
        return res.status(409).json({ error: 'Ya existe una cita automática con estos datos' });
      }
    }

    const cita = await req.prisma.cita.create({
      data: {
        pacienteId: Number(data.pacienteId),
        fecha: data.fecha,
        hora: data.hora || null,
        procedimiento: data.procedimiento || null,
        estado: data.estado || 'pendiente',
        notas: data.notas || null,
        origen: data.origen || 'manual'
      }
    });

    // Si es una cita para hoy y está confirmada, enviar notificación inmediata
    const hoy = new Date().toISOString().split('T')[0];
    if (cita.fecha === hoy && cita.estado === 'confirmada') {
      sendConfirmacionCita(req.prisma, cita.id).catch(err => console.error('[Agenda] Error enviando confirmación:', err.message));
    }

    res.status(201).json(cita);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) return res.status(400).json({ error: 'ID inválido' });
    
    const data = req.body;
    // Convertir pacienteId a número si viene como string (desde el frontend)
    if (data.pacienteId !== undefined) data.pacienteId = Number(data.pacienteId);
    const oldCita = await req.prisma.cita.findUnique({ where: { id: idNum } });
    const cita = await req.prisma.cita.update({
      where: { id: idNum },
      data
    });

    // Enviar notificación si cambió el estado (no esperar respuesta)
    if (oldCita && data.estado && oldCita.estado !== data.estado) {
      if (data.estado === 'confirmada') {
        sendConfirmacionCita(req.prisma, cita.id).catch(err => console.error('[Agenda] Error enviando confirmación:', err.message));
      } else if (data.estado === 'cancelada') {
        sendCancelacionCita(req.prisma, cita.id).catch(err => console.error('[Agenda] Error enviando cancelación:', err.message));
      }
    }

    res.json(cita);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) return res.status(400).json({ error: 'ID inválido' });
    await req.prisma.cita.delete({ where: { id: idNum } });
    res.json({ message: 'Cita eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
