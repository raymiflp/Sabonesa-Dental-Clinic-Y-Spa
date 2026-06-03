export const getAll = async (req, res) => {
  try {
    const configs = await req.prisma.configuracion.findMany();
    const result = {};
    configs.forEach(c => { result[c.clave] = c.valor; });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const entries = req.body; // { clave: valor, ... }
    for (const [clave, valor] of Object.entries(entries)) {
      await req.prisma.configuracion.upsert({
        where: { clave },
        update: { valor: String(valor) },
        create: { clave, valor: String(valor) }
      });
    }
    // Return updated
    const configs = await req.prisma.configuracion.findMany();
    const result = {};
    configs.forEach(c => { result[c.clave] = c.valor; });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
