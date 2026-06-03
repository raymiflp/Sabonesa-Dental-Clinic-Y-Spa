export const getByPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;
    const presupuestos = await req.prisma.presupuesto.findMany({
      where: { pacienteId: Number(pacienteId) },
      orderBy: { createdAt: 'desc' }
    });
    res.json(presupuestos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const data = req.body;
    const presupuesto = await req.prisma.presupuesto.create({
      data: {
        pacienteId: Number(data.pacienteId),
        fecha: data.fecha,
        items: data.items || null,
        montoTotal: data.montoTotal ? Number(data.montoTotal) : null,
        estado: data.estado || 'pendiente',
        notas: data.notas || null
      }
    });
    res.status(201).json(presupuesto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (data.montoTotal) data.montoTotal = Number(data.montoTotal);
    if (data.pacienteId) data.pacienteId = Number(data.pacienteId);
    const presupuesto = await req.prisma.presupuesto.update({
      where: { id: Number(id) },
      data
    });
    res.json(presupuesto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await req.prisma.presupuesto.delete({ where: { id: Number(id) } });
    res.json({ message: 'Presupuesto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
