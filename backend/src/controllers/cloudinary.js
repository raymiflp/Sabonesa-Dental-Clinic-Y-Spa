import { v2 as cloudinary } from 'cloudinary';

const isConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('[cloudinary] configurado correctamente');
} else {
  console.warn('[cloudinary] NO CONFIGURADO — las imágenes se guardarán localmente');
}

const FOLDER = 'sistema-betty';

function checkCloudinary(req, res) {
  if (!isConfigured) {
    res.status(503).json({ error: 'Cloudinary no está configurado. Agrega CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET al .env' });
    return false;
  }
  return true;
}

/**
 * POST /api/cloudinary/upload
 * Body: { dataUrl: "data:image/jpeg;base64,..." }
 * Returns: { url, publicId }
 */
export const upload = async (req, res) => {
  try {
    if (!checkCloudinary(req, res)) return;
    const { dataUrl } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
      return res.status(400).json({ error: 'Se requiere una imagen en formato data URL' });
    }

    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: FOLDER,
      resource_type: 'image',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
        { width: 1200, height: 1200, crop: 'limit' },
      ],
    });

    console.log('[cloudinary] uploaded:', result.public_id);

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error('[cloudinary upload ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/cloudinary/:publicId
 */
export const remove = async (req, res) => {
  try {
    if (!checkCloudinary(req, res)) return;
    const { publicId } = req.params;

    // Validar que no sea path traversal
    if (!publicId || publicId.includes('..')) {
      return res.status(400).json({ error: 'publicId inválido' });
    }

    await cloudinary.uploader.destroy(publicId);
    console.log('[cloudinary] deleted:', publicId);

    res.json({ ok: true });
  } catch (error) {
    console.error('[cloudinary delete ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/cloudinary/delete-by-url
 * Body: { url: "https://res.cloudinary.com/..." }
 * Extrae el publicId de la URL y lo elimina
 */
export const removeByUrl = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.includes('cloudinary')) {
      return res.status(400).json({ error: 'URL de Cloudinary inválida' });
    }

    // Extraer publicId de la URL:
    // https://res.cloudinary.com/.../image/upload/q_auto,f_auto/v1/sistema-betty/abc123
    const parts = url.split('/');
    const uploadIndex = parts.findIndex(p => p === 'upload');
    if (uploadIndex === -1) {
      return res.status(400).json({ error: 'No se pudo extraer publicId de la URL' });
    }
    // El publicId son los últimos segmentos después de upload/... (saltando transformations)
    const afterUpload = parts.slice(uploadIndex + 1);
    // Saltar versión si existe (v123456)
    const versionPrefix = afterUpload.findIndex(p => p.startsWith('v'));
    const publicIdSegments = versionPrefix >= 0
      ? afterUpload.slice(versionPrefix + 1)
      : afterUpload;
    const publicId = FOLDER + '/' + publicIdSegments.join('/').replace(/\.[^.]+$/, '');

    await cloudinary.uploader.destroy(publicId);
    console.log('[cloudinary] deleted by url:', publicId);

    res.json({ ok: true });
  } catch (error) {
    console.error('[cloudinary delete-by-url ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
};
