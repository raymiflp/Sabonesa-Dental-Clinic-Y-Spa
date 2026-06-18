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

    // Validar campos requeridos
    if (!data.pacienteId || !data.fecha) {
      return res.status(400).json({ error: 'Paciente y fecha son requeridos' });
    }

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
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) return res.status(400).json({ error: 'ID inválido' });
    const data = req.body;
    if (data.montoTotal) data.montoTotal = Number(data.montoTotal);
    if (data.pacienteId) data.pacienteId = Number(data.pacienteId);
    const presupuesto = await req.prisma.presupuesto.update({
      where: { id: idNum },
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
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) return res.status(400).json({ error: 'ID inválido' });
    await req.prisma.presupuesto.delete({ where: { id: idNum } });
    res.json({ message: 'Presupuesto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
