import { v2 as cloudinary } from 'cloudinary';

// Cloudinary SDK soporta CLOUDINARY_URL nativamente (cloudinary://key:secret@cloud_name)
// También soportamos variables separadas como alternativa
const hasUrl = !!process.env.CLOUDINARY_URL;
const hasSeparate = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
const isConfigured = hasUrl || hasSeparate;

if (isConfigured) {
  if (hasSeparate && !hasUrl) {
    // Solo configurar explícitamente si no usamos CLOUDINARY_URL
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
  // Si hasUrl es true, el SDK ya tomó CLOUDINARY_URL automáticamente
  console.log('[cloudinary] configurado correctamente');
} else {
  console.warn('[cloudinary] NO CONFIGURADO — las imágenes se guardarán localmente');
}

const FOLDER = 'sistema-betty';

function checkCloudinary(req, res) {
  if (!isConfigured) {
    res.status(503).json({
      error: 'Cloudinary no está configurado. Agrega CLOUDINARY_URL (recomendado) o CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET al .env'
    });
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
 */
export const removeByUrl = async (req, res) => {
  try {
    if (!checkCloudinary(req, res)) return;
    const { url } = req.body;
    if (!url || !url.includes('cloudinary')) {
      return res.status(400).json({ error: 'URL de Cloudinary inválida' });
    }

    const parts = url.split('/');
    const uploadIndex = parts.findIndex(p => p === 'upload');
    if (uploadIndex === -1) {
      return res.status(400).json({ error: 'No se pudo extraer publicId de la URL' });
    }
    const afterUpload = parts.slice(uploadIndex + 1);
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
