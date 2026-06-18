export const getAll = async (req, res) => {
  try {
    const { fecha } = req.query;
    const where = {};
    if (fecha) where.fecha = fecha;
    const crediticios = await req.prisma.crediticio.findMany({
      where,
      include: { paciente: { select: { id: true, nombres: true, apellidos: true, cedula: true } } },
      orderBy: { fecha: 'desc' }
    });
    res.json(crediticios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getByPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;
    const crediticios = await req.prisma.crediticio.findMany({
      where: { pacienteId: Number(pacienteId) },
      orderBy: { createdAt: 'desc' }
    });
    res.json(crediticios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const data = req.body;
    const crediticio = await req.prisma.crediticio.create({
      data: {
        pacienteId: Number(data.pacienteId),
        procedimiento: data.procedimiento || null,
        montoPagado: data.montoPagado ? Number(data.montoPagado) : null,
        montoAbonado: data.montoAbonado ? Number(data.montoAbonado) : null,
        descuento: data.descuento ? Number(data.descuento) : null,
        fecha: data.fecha
      }
    });
    res.status(201).json(crediticio);
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
    const crediticio = await req.prisma.crediticio.update({
      where: { id: idNum },
      data: {
        procedimiento: data.procedimiento || null,
        montoPagado: data.montoPagado ? Number(data.montoPagado) : null,
        montoAbonado: data.montoAbonado ? Number(data.montoAbonado) : null,
        descuento: data.descuento ? Number(data.descuento) : null,
        fecha: data.fecha
      }
    });
    res.json(crediticio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) return res.status(400).json({ error: 'ID inválido' });
    await req.prisma.crediticio.delete({ where: { id: idNum } });
    res.json({ message: 'Registro crediticio eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
