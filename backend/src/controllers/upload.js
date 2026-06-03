import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads/fotos');

/**
 * POST /api/upload
 * Body: { dataUrl: "data:image/jpeg;base64,..." }
 * Returns: { url: "/uploads/fotos/1712345678_abc123.jpg" }
 */
export const uploadFoto = async (req, res) => {
  try {
    const { dataUrl } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
      return res.status(400).json({ error: 'Se requiere una imagen en formato data URL' });
    }

    // Extraer extensión del MIME type
    const matches = dataUrl.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Formato de imagen no soportado' });
    }

    const extMap = { png: 'png', jpeg: 'jpg', jpg: 'jpg', gif: 'gif', webp: 'webp' };
    const ext = extMap[matches[1]] || 'jpg';
    const base64Data = matches[2];

    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    await writeFile(filepath, base64Data, 'base64');

    const url = `/uploads/fotos/${filename}`;
    console.log('[upload] saved:', url);

    res.json({ url });
  } catch (error) {
    console.error('[upload ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/upload/:filename
 */
export const deleteFoto = async (req, res) => {
  try {
    const { filename } = req.params;
    // Validar que sea un archivo dentro de uploads/fotos (evitar path traversal)
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Nombre de archivo inválido' });
    }
    const filepath = path.join(UPLOAD_DIR, filename);
    await unlink(filepath);
    res.json({ ok: true });
  } catch (error) {
    // Si el archivo no existe, igual responder ok
    if (error.code === 'ENOENT') {
      return res.json({ ok: true });
    }
    console.error('[delete upload ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
};
