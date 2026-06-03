
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

    res.status(201).json(cita);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const cita = await req.prisma.cita.update({
      where: { id: Number(id) },
      data
    });
    res.json(cita);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await req.prisma.cita.delete({ where: { id: Number(id) } });
    res.json({ message: 'Cita eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
