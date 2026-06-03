'use client';

import { useRef, useState, useCallback } from 'react';
import { api, API_BASE } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImagePlus, Trash2, X, ZoomIn, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}

function filenameFromUrl(url) {
  if (!url) return null;
  const parts = url.split('/');
  return parts[parts.length - 1];
}

/** Subir imagen con progreso vía XMLHttpRequest */
function uploadWithProgress(dataUrl, onProgress) {
  return new Promise((resolve, reject) => {
    const token = localStorage.getItem('token');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/upload`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Respuesta inválida del servidor'));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error || `Error ${xhr.status}`));
        } catch {
          reject(new Error(`Error ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Error de conexión al subir imagen'));
    xhr.onabort = () => reject(new Error('Subida cancelada'));
    xhr.send(JSON.stringify({ dataUrl }));
  });
}

export default function FotosSection({ fotos = [], onChange, unsavedIds = [] }) {
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const unsavedSet = new Set(unsavedIds);

  const handleFiles = useCallback(async (files) => {
    const fileArray = Array.from(files).filter(f =>
      f.type.startsWith('image/') && f.size <= MAX_FILE_SIZE
    );
    if (fileArray.length === 0) return;

    // 1. Leer archivos originales
    const rawDataUrls = await Promise.all(
      fileArray.map(f => readFileAsDataURL(f))
    );

    // 2. Crear objetos con estado de subida
    const tempFotos = rawDataUrls.map((dataUrl, i) => ({
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      dataUrl,
      url: null,
      fecha: new Date().toISOString(),
      descripcion: '',
      uploading: true,
      progress: 0,
      error: null,
    }));

    onChange([...fotos, ...tempFotos]);

    // 3. Subir cada una con progreso
    for (const temp of tempFotos) {
      try {
        const result = await uploadWithProgress(temp.dataUrl, (pct) => {
          onChange(prev => prev.map(f =>
            f.id === temp.id ? { ...f, progress: pct } : f
          ));
        });
        onChange(prev => prev.map(f =>
          f.id === temp.id
            ? { ...f, dataUrl: undefined, url: result.url, uploading: false, progress: 100 }
            : f
        ));
      } catch (err) {
        onChange(prev => prev.map(f =>
          f.id === temp.id
            ? { ...f, uploading: false, error: err.message }
            : f
        ));
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [fotos, onChange]);

  const removeFoto = async (id) => {
    setDeletingIds(prev => new Set(prev).add(id));
    const foto = fotos.find(f => f.id === id);
    try {
      if (foto?.url) {
        const filename = filenameFromUrl(foto.url);
        if (filename) await api.deleteFoto(filename);
      }
      onChange(fotos.filter(f => f.id !== id));
    } catch (err) {
      alert('Error al eliminar la foto: ' + err.message);
    } finally {
      setDeletingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const updateDescripcion = (id, descripcion) => {
    onChange(fotos.map(f => f.id === id ? { ...f, descripcion } : f));
  };

  const getImgSrc = (foto) => {
    if (foto.url) return API_BASE + foto.url;
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
              disabled={fotos.some(f => f.uploading)}
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-100"
            >
              {fotos.some(f => f.uploading) ? (
                <UploadCloud className="w-4 h-4 animate-pulse mr-1" />
              ) : (
                <ImagePlus className="w-4 h-4 mr-1" />
              )}
              {fotos.some(f => f.uploading)
                ? 'Subiendo...'
                : 'Agregar Foto / Radiografía'}
            </Button>
            <p className="text-xs text-gray-500">
              Se sube la imagen original (máx 50MB)
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
                {/* Barra de progreso durante subida */}
                {foto.uploading && (
                  <div className="absolute inset-0 z-10 bg-black/50 rounded-lg flex flex-col items-center justify-center gap-2">
                    <UploadCloud className="w-8 h-8 text-white animate-bounce" />
                    <div className="w-3/4 bg-white/20 rounded-full h-2">
                      <div
                        className="bg-green-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${foto.progress || 0}%` }}
                      />
                    </div>
                    <span className="text-white text-[10px] font-medium">
                      {foto.progress || 0}%
                    </span>
                  </div>
                )}

                {/* Error badge */}
                {foto.error && !foto.uploading && (
                  <div className="absolute top-1 left-1 z-10 flex items-center gap-1 bg-red-600/90 text-white px-1.5 py-0.5 rounded text-[9px] shadow-sm">
                    <AlertCircle className="w-3 h-3" />
                    Error al subir
                  </div>
                )}

                {/* Subida completa */}
                {foto.url && !foto.uploading && (
                  <div className="absolute top-1 left-1 z-10">
                    <CheckCircle2 className="w-5 h-5 text-green-500 drop-shadow" />
                  </div>
                )}

                {/* Foto nueva — no guardada aún en HC */}
                {foto.url && !foto.uploading && unsavedSet.has(foto.id) && (
                  <div className="absolute top-1 right-8 z-10 flex items-center gap-1 bg-amber-400/90 text-amber-900 px-1.5 py-0.5 rounded text-[9px] font-semibold shadow-sm">
                    No guardado
                  </div>
                )}

                {/* Eliminando... */}
                {deletingIds.has(foto.id) && (
                  <div className="absolute inset-0 z-20 bg-black/40 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-semibold animate-pulse">Eliminando...</span>
                  </div>
                )}

                {/* Thumbnail */}
                <div
                  className={`relative aspect-square rounded-lg overflow-hidden border bg-gray-50 cursor-pointer ${
                    foto.error && !foto.uploading
                      ? 'border-red-400 ring-2 ring-red-200'
                      : 'border-gray-200'
                  }`}
                  onClick={() => {
                    const src = getImgSrc(foto);
                    if (src && !foto.uploading) setPreviewUrl(src);
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
                    disabled={foto.uploading || deletingIds.has(foto.id)}
                  >
                    {deletingIds.has(foto.id) ? (
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </Button>
                </div>

                {/* Descripción */}
                <input
                  type="text"
                  value={foto.descripcion}
                  onChange={(e) => updateDescripcion(foto.id, e.target.value)}
                  placeholder="Descripción..."
                  className="w-full mt-1 text-xs border-0 border-b border-gray-200 focus:border-indigo-400 focus:ring-0 outline-none py-0.5 bg-transparent"
                  disabled={foto.uploading}
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
