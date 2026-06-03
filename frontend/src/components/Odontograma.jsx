import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { API_BASE } from '@/api';

const GUIDE_IMG = `${API_BASE}/static/imagen/odontograma-guia.jpg`;

const COLORS = [
  { id: 'red', label: 'Caries', color: '#ef4444' },
  { id: 'blue', label: 'Tratado', color: '#3b82f6' },
  { id: 'green', label: 'Sano', color: '#22c55e' },
  { id: 'gray', label: 'Extraído', color: '#6b7280' },
  { id: 'yellow', label: 'Prótesis', color: '#eab308' },
  { id: 'orange', label: 'Pendiente', color: '#f97316' },
  { id: 'black', label: 'Lápiz', color: '#1f2937' },
];

const BRUSH_SIZES = [
  { id: 2, label: 'Fino' },
  { id: 6, label: 'Medio' },
  { id: 12, label: 'Grueso' },
];

export default function Odontograma({ odontograma, onChange }) {
  const canvasRef = useRef(null);
  const guideRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen');
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const lastPos = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ w: 700, h: 500 });

  // Cargar imagen guía y obtener dimensiones
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setCanvasSize({ w: img.naturalWidth, h: img.naturalHeight });
      setImgLoaded(true);
      guideRef.current = img;
    };
    img.onerror = () => {
      // Fallback: usar tamaño por defecto
      setCanvasSize({ w: 700, h: 500 });
      setImgLoaded(true);
    };
    img.src = GUIDE_IMG;
  }, []);

  // Inicializar/re-dibujar canvas cuando cambia odontograma o se carga la imagen
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !imgLoaded) return;
    c.width = canvasSize.w;
    c.height = canvasSize.h;
    const ctx = c.getContext('2d');

    // Dibujar imagen guía de fondo
    if (guideRef.current) {
      ctx.drawImage(guideRef.current, 0, 0, canvasSize.w, canvasSize.h);
    }

    // Cargar dibujo guardado encima
    if (odontograma && typeof odontograma === 'string' && odontograma.startsWith('data:image')) {
      const saved = new Image();
      saved.onload = () => {
        ctx.drawImage(saved, 0, 0, canvasSize.w, canvasSize.h);
        setHasDrawing(true);
      };
      saved.src = odontograma;
    } else {
      setHasDrawing(false);
    }
  }, [imgLoaded, canvasSize.w, canvasSize.h, odontograma]);

  const getPos = useCallback((e) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const startDraw = useCallback((e) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    lastPos.current = pos;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, [getPos]);

  const draw = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getPos(e);
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : activeColor.color;
    ctx.lineWidth = tool === 'eraser' ? brushSize.id * 4 : brushSize.id;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPos.current = pos;
    setHasDrawing(true);
  }, [isDrawing, getPos, tool, activeColor, brushSize]);

  const endDraw = useCallback((e) => {
    e.preventDefault();
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  const handleClear = () => {
    const c = canvasRef.current;
    if (!c || !guideRef.current) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);
    ctx.drawImage(guideRef.current, 0, 0, canvasSize.w, canvasSize.h);
    setHasDrawing(false);
    onChange(null);
  };

  const handleSave = () => {
    const c = canvasRef.current;
    if (!c) return;
    const dataUrl = c.toDataURL('image/png');
    onChange(dataUrl);
  };

  if (!imgLoaded) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
        Cargando odontograma...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Odontograma</h3>
          <p className="text-xs text-gray-400 mt-0.5">Dibuja sobre el odontograma para marcar hallazgos</p>
        </div>
        <div className="flex items-center gap-2">
          {hasDrawing && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-xs text-red-500 hover:text-red-700 h-7">
              Limpiar dibujo
            </Button>
          )}
          <Button size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7">
            Guardar dibujo
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative mx-auto border border-gray-200 rounded-lg overflow-hidden" style={{ maxWidth: canvasSize.w }}>
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className="block w-full h-auto cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>

      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
        {/* Herramientas */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTool('pen')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              tool === 'pen'
                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            ✏️ Lápiz
          </button>
          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              tool === 'eraser'
                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            🧹 Borrar
          </button>
        </div>

        {/* Colores */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-400 mr-1">Color:</span>
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setActiveColor(c); setTool('pen'); }}
              title={c.label}
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                activeColor.id === c.id ? 'border-indigo-500 scale-110' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: c.color }}
            />
          ))}
        </div>

        {/* Grosor */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-400 mr-1">Grosor:</span>
          {BRUSH_SIZES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setBrushSize(s)}
              className={`px-2.5 py-1.5 text-[10px] font-medium rounded border transition-colors ${
                brushSize.id === s.id
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
