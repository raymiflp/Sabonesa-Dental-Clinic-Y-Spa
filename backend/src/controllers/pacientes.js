export const getAll = async (req, res) => {
  try {
    const pacientes = await req.prisma.paciente.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(pacientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const paciente = await req.prisma.paciente.findUnique({
      where: { id: Number(id) },
      include: {
        historialClinico: true,
        crediticios: { orderBy: { createdAt: 'desc' } },
        citas: { orderBy: { fecha: 'desc' } },
        presupuestos: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(paciente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const data = req.body;

    // Validar unicidad de cédula
    if (data.cedula) {
      const existente = await req.prisma.paciente.findUnique({
        where: { cedula: data.cedula }
      });
      if (existente) {
        return res.status(409).json({ error: 'La cédula ya está registrada' });
      }
    }

    const paciente = await req.prisma.paciente.create({ data });
    res.status(201).json(paciente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Validar unicidad de cédula (excluyendo al mismo paciente)
    if (data.cedula) {
      const existente = await req.prisma.paciente.findUnique({
        where: { cedula: data.cedula }
      });
      if (existente && existente.id !== Number(id)) {
        return res.status(409).json({ error: 'La cédula ya está registrada' });
      }
    }

    const paciente = await req.prisma.paciente.update({
      where: { id: Number(id) },
      data
    });
    res.json(paciente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await req.prisma.paciente.delete({ where: { id: Number(id) } });
    res.json({ message: 'Paciente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
