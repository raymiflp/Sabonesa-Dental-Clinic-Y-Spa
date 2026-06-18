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

    // Validar campos requeridos
    if (!nombre || !categoriaId) {
      return res.status(400).json({ error: 'Nombre y categoría son requeridos' });
    }

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
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) return res.status(400).json({ error: 'ID inválido' });
    const data = req.body;
    if (data.categoriaId) data.categoriaId = Number(data.categoriaId);
    if (data.precioSugerido) data.precioSugerido = Number(data.precioSugerido);
    const procedimiento = await req.prisma.procedimiento.update({
      where: { id: idNum },
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
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) return res.status(400).json({ error: 'ID inválido' });
    await req.prisma.procedimiento.delete({ where: { id: idNum } });
    res.json({ message: 'Procedimiento eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCategoria = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;

    // Validar campos requeridos
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre de categoría es requerido' });
    }

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
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) return res.status(400).json({ error: 'ID inválido' });
    const data = req.body;
    const categoria = await req.prisma.categoriaProcedimiento.update({
      where: { id: idNum },
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
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) return res.status(400).json({ error: 'ID inválido' });
    await req.prisma.categoriaProcedimiento.delete({ where: { id: idNum } });
    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
