export const getByPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;
    const historial = await req.prisma.historialClinico.findUnique({
      where: { pacienteId: Number(pacienteId) }
    });
    // Devolver null en lugar de 404 para evitar errores en consola del frontend
    res.json(historial);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const data = req.body;
    const hasFotos = Array.isArray(data.fotos);
    console.log('[HC create] fotos:', hasFotos ? data.fotos.length : 'none', 'size:', JSON.stringify(data).length);
    // Stripear pacienteId del update para evitar conflictos con la clave única
    const { pacienteId, ...rest } = data;
    const historial = await req.prisma.historialClinico.upsert({
      where: { pacienteId: Number(pacienteId) },
      update: rest,
      create: data
    });
    console.log('[HC create] saved, return fotos:', Array.isArray(historial.fotos) ? historial.fotos.length : typeof historial.fotos);
    res.status(201).json(historial);
  } catch (error) {
    console.error('[HC create ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const hasFotos = Array.isArray(data.fotos);
    console.log('[HC update] fotos:', hasFotos ? data.fotos.length : 'none', 'size:', JSON.stringify(data).length);
    const historial = await req.prisma.historialClinico.update({
      where: { id: Number(id) },
      data
    });
    console.log('[HC update] saved, return fotos:', Array.isArray(historial.fotos) ? historial.fotos.length : typeof historial.fotos);
    res.json(historial);
  } catch (error) {
    console.error('[HC update ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
};
