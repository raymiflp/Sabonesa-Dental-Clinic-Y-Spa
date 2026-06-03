export const getAll = async (req, res) => {
  try {
    const procedimientos = await req.prisma.procedimiento.findMany({
      include: { categoria: true },
      orderBy: { nombre: 'asc' }
    });
    res.json(procedimientos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCategorias = async (req, res) => {
  try {
    const categorias = await req.prisma.categoriaProcedimiento.findMany({
      include: { procedimientos: true },
      orderBy: { nombre: 'asc' }
    });
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { nombre, categoriaId, precioSugerido, descripcion } = req.body;
    const procedimiento = await req.prisma.procedimiento.create({
      data: {
        nombre,
        categoriaId: Number(categoriaId),
        precioSugerido: precioSugerido ? Number(precioSugerido) : null,
        descripcion: descripcion || null
      }
    });
    res.status(201).json(procedimiento);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (data.categoriaId) data.categoriaId = Number(data.categoriaId);
    if (data.precioSugerido) data.precioSugerido = Number(data.precioSugerido);
    const procedimiento = await req.prisma.procedimiento.update({
      where: { id: Number(id) },
      data
    });
    res.json(procedimiento);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await req.prisma.procedimiento.delete({ where: { id: Number(id) } });
    res.json({ message: 'Procedimiento eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCategoria = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    const categoria = await req.prisma.categoriaProcedimiento.create({
      data: { nombre, descripcion: descripcion || null }
    });
    res.status(201).json(categoria);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const categoria = await req.prisma.categoriaProcedimiento.update({
      where: { id: Number(id) },
      data
    });
    res.json(categoria);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    await req.prisma.categoriaProcedimiento.delete({ where: { id: Number(id) } });
    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
