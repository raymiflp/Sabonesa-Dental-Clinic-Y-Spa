import { useState, useEffect } from 'react';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus, Stethoscope, FolderPlus, Edit2, Trash2, DollarSign, ChevronDown, ChevronRight,
} from 'lucide-react';

export default function Procedimientos() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingProc, setEditingProc] = useState(null);
  const [newCategoria, setNewCategoria] = useState({ nombre: '', descripcion: '' });
  const [formProc, setFormProc] = useState({ nombre: '', categoriaId: '', precioSugerido: '', descripcion: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getCategorias();
      setCategorias(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading categorias:', err);
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openNewProc = (catId) => {
    setEditingProc(null);
    setFormProc({ nombre: '', categoriaId: catId.toString(), precioSugerido: '', descripcion: '' });
    setDialogOpen(true);
  };

  const openEditProc = (proc) => {
    setEditingProc(proc);
    setFormProc({
      nombre: proc.nombre || '',
      categoriaId: proc.categoriaId?.toString() || '',
      precioSugerido: proc.precioSugerido?.toString() || '',
      descripcion: proc.descripcion || '',
    });
    setDialogOpen(true);
  };

  const handleSaveProc = async () => {
    if (!formProc.nombre || !formProc.categoriaId) return;
    try {
      setSaving(true);
      const payload = {
        nombre: formProc.nombre,
        categoriaId: parseInt(formProc.categoriaId),
        precioSugerido: formProc.precioSugerido ? parseFloat(formProc.precioSugerido) : null,
        descripcion: formProc.descripcion,
      };
      if (editingProc) {
        await api.updateProcedimiento(editingProc.id, payload);
      } else {
        await api.createProcedimiento(payload);
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      alert('Error al guardar procedimiento: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProc = async (id, name) => {
    if (!confirm(`¿Eliminar procedimiento "${name}"?`)) return;
    try {
      await api.deleteProcedimiento(id);
      await load();
      alert('Procedimiento eliminado exitosamente.');
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleSaveCategoria = async () => {
    if (!newCategoria.nombre) return;
    try {
      setSaving(true);
      await api.createCategoria(newCategoria);
      setCatDialogOpen(false);
      setNewCategoria({ nombre: '', descripcion: '' });
      await load();
    } catch (err) {
      alert('Error al crear categoría: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procedimientos</h1>
          <p className="text-sm text-gray-500 mt-1">Catálogo de procedimientos y categorías</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCatDialogOpen(true)}>
            <FolderPlus className="w-4 h-4 mr-1" />
            Nueva Categoría
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : categorias.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          <Stethoscope className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No hay categorías registradas</p>
          <p className="text-sm mt-1">Crea una nueva categoría para comenzar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categorias.map((cat) => (
            <Card key={cat.id} className="overflow-hidden">
              <CardHeader
                className="py-3 px-5 cursor-pointer hover:bg-gray-50 flex flex-row items-center justify-between"
                onClick={() => toggleExpand(cat.id)}
              >
                <div className="flex items-center gap-2">
                  {expanded[cat.id] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <CardTitle className="text-base font-semibold text-gray-800">{cat.nombre}</CardTitle>
                  <Badge variant="outline" className="ml-2 text-xs bg-gray-50">
                    {(cat.procedimientos || []).length} procedimientos
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                  onClick={(e) => { e.stopPropagation(); openNewProc(cat.id); }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Agregar
                </Button>
              </CardHeader>
              {expanded[cat.id] && (
                <CardContent className="px-5 pb-4 pt-0">
                  {(!cat.procedimientos || cat.procedimientos.length === 0) ? (
                    <p className="text-sm text-gray-400 py-4 text-center">Sin procedimientos en esta categoría</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {cat.procedimientos.map((proc) => (
                        <div key={proc.id} className="flex items-center justify-between py-2.5">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">{proc.nombre}</p>
                            {proc.descripcion && (
                              <p className="text-xs text-gray-400 mt-0.5">{proc.descripcion}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            {proc.precioSugerido != null && (
                              <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                <DollarSign className="w-3.5 h-3.5 text-green-500" />
                                {proc.precioSugerido.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400" title="Editar" onClick={() => openEditProc(proc)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" title="Eliminar" onClick={() => handleDeleteProc(proc.id, proc.nombre)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Procedimiento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProc ? 'Editar Procedimiento' : 'Nuevo Procedimiento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={formProc.nombre} onChange={(e) => setFormProc({ ...formProc, nombre: e.target.value })} placeholder="Ej: Limpieza Dental" />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <select
                value={formProc.categoriaId}
                onChange={(e) => setFormProc({ ...formProc, categoriaId: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Seleccionar...</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Precio Sugerido (RD$)</Label>
              <Input type="number" step="0.01" value={formProc.precioSugerido} onChange={(e) => setFormProc({ ...formProc, precioSugerido: e.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={formProc.descripcion} onChange={(e) => setFormProc({ ...formProc, descripcion: e.target.value })} placeholder="Descripción opcional" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveProc} disabled={saving || !formProc.nombre} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? 'Guardando...' : editingProc ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Categoría */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={newCategoria.nombre} onChange={(e) => setNewCategoria({ ...newCategoria, nombre: e.target.value })} placeholder="Ej: Ortodoncia" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={newCategoria.descripcion} onChange={(e) => setNewCategoria({ ...newCategoria, descripcion: e.target.value })} placeholder="Descripción opcional" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCategoria} disabled={saving || !newCategoria.nombre} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? 'Guardando...' : 'Crear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
