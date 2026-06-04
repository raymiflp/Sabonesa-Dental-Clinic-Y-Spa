'use client';

import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImagePlus, Trash2, X, ZoomIn } from 'lucide-react';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_COMPRESS_WIDTH = 1200;
const COMPRESS_QUALITY = 0.7; // JPEG quality 0-1

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}

/** Comprimir imagen a JPEG con tamaño máximo */
function compressImage(dataUrl, maxWidth = MAX_COMPRESS_WIDTH, quality = COMPRESS_QUALITY) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = Math.round(h * (maxWidth / w));
        w = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Error al comprimir la imagen'));
    img.src = dataUrl;
  });
}

export default function FotosSection({ fotos = [], onChange }) {
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFiles = useCallback(async (files) => {
    const fileArray = Array.from(files).filter(f =>
      f.type.startsWith('image/') && f.size <= MAX_FILE_SIZE
    );
    if (fileArray.length === 0) return;

    // Leer archivos
    const rawDataUrls = await Promise.all(
      fileArray.map(f => readFileAsDataURL(f))
    );

    // Comprimir imágenes (reduce tamaño 5-10x)
    const compressed = await Promise.all(
      rawDataUrls.map(d => compressImage(d))
    );

    // Crear objetos con dataUrl comprimida — SIN subir al servidor
    const newFotos = compressed.map((dataUrl, i) => ({
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      dataUrl,
      fecha: new Date().toISOString(),
      descripcion: '',
    }));

    onChange([...fotos, ...newFotos]);

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [fotos, onChange]);

  const removeFoto = (id) => {
    onChange(fotos.filter(f => f.id !== id));
  };

  const updateDescripcion = (id, descripcion) => {
    onChange(fotos.map(f => f.id === id ? { ...f, descripcion } : f));
  };

  const getImgSrc = (foto) => {
    if (foto.dataUrl) return foto.dataUrl;
    return '';
  };

  return (
    <Card className="border-indigo-200 ring-1 ring-indigo-100">
      <CardContent className="pt-6">
        {/* Upload area */}
        <div className="mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-100"
            >
              <ImagePlus className="w-4 h-4 mr-1" />
              Agregar Foto / Radiografía
            </Button>
            <p className="text-xs text-gray-500">
              Se comprime automáticamente (máx 50MB)
            </p>
          </div>
        </div>

        {/* Grid */}
        {fotos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ImagePlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aún no hay fotos o radiografías</p>
            <p className="text-xs mt-1">Agrega desde arriba</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {fotos.map((foto) => (
              <div key={foto.id} className="relative group">
                {/* Thumbnail */}
                <div
                  className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer"
                  onClick={() => {
                    const src = getImgSrc(foto);
                    if (src) setPreviewUrl(src);
                  }}
                >
                  <img
                    src={getImgSrc(foto)}
                    alt={foto.descripcion || 'Foto'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Eliminar */}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="w-6 h-6 rounded-full"
                    onClick={() => removeFoto(foto.id)}
                    title="Eliminar"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                {/* Descripción */}
                <input
                  type="text"
                  value={foto.descripcion}
                  onChange={(e) => updateDescripcion(foto.id, e.target.value)}
                  placeholder="Descripción..."
                  className="w-full mt-1 text-xs border-0 border-b border-gray-200 focus:border-indigo-400 focus:ring-0 outline-none py-0.5 bg-transparent"
                  disabled={false}
                />
              </div>
            ))}
          </div>
        )}

        {/* Lightbox */}
        {previewUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewUrl(null)}
          >
            <div className="relative max-w-full max-h-full">
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white shadow-md hover:bg-gray-100 z-10"
                onClick={() => setPreviewUrl(null)}
              >
                <X className="w-4 h-4" />
              </Button>
              <img
                src={previewUrl}
                alt="Vista previa"
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
