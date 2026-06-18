export const getAll = async (req, res) => {
  try {
    const insumos = await req.prisma.insumo.findMany({
      orderBy: { nombre: 'asc' }
    });
    res.json(insumos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) return res.status(400).json({ error: 'ID inválido' });
    const insumo = await req.prisma.insumo.findUnique({
      where: { id: idNum }
    });
    if (!insumo) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }
    res.json(insumo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { nombre, descripcion, cantidad, precioUnitario, proveedor } = req.body;
    const insumo = await req.prisma.insumo.create({
      data: {
        nombre,
        descripcion: descripcion || null,
        cantidad: cantidad ? Number(cantidad) : 0,
        precioUnitario: precioUnitario ? Number(precioUnitario) : null,
        proveedor: proveedor || null
      }
    });
    res.status(201).json(insumo);
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

    const existing = await req.prisma.insumo.findUnique({
      where: { id: idNum }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    if (data.cantidad !== undefined) data.cantidad = Number(data.cantidad);
    if (data.precioUnitario !== undefined) data.precioUnitario = data.precioUnitario ? Number(data.precioUnitario) : null;

    const insumo = await req.prisma.insumo.update({
      where: { id: idNum },
      data
    });
    res.json(insumo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) return res.status(400).json({ error: 'ID inválido' });
    await req.prisma.insumo.delete({ where: { id: idNum } });
    res.json({ message: 'Insumo eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
