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
import { toast } from 'sonner';
import PasswordConfirmDialog from '@/components/PasswordConfirmDialog';
import ConfirmDialog from '@/components/ConfirmDialog';

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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteCatTarget, setDeleteCatTarget] = useState(null);
  const [confirmDeleteCatOpen, setConfirmDeleteCatOpen] = useState(false);

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
      toast.error('Error al guardar procedimiento: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProc = async (id, name) => {
    setDeleteTarget({ id, name });
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteProcedimiento(deleteTarget.id);
      await load();
      setDeleteTarget(null);
      setConfirmDeleteOpen(false);
      toast.success('Procedimiento eliminado exitosamente.');
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message);
    }
  };

  const confirmDeleteCat = async () => {
    if (!deleteCatTarget) return;
    try {
      await api.deleteCategoria(deleteCatTarget.id);
      await load();
      setDeleteCatTarget(null);
      setConfirmDeleteCatOpen(false);
      toast.success('Categoría eliminada exitosamente.');
    } catch (err) {
      toast.error('Error al eliminar categoría: ' + err.message);
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
      toast.error('Error al crear categoría: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Procedimientos</h1>
          <p className="text-sm text-muted-foreground mt-1">Catálogo de procedimientos y categorías</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCatDialogOpen(true)}>
            <FolderPlus className="w-4 h-4 mr-1" />
            Nueva Categoría
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      ) : categorias.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          <Stethoscope className="w-12 h-12 mx-auto mb-3 text-muted-foreground/60" />
          <p>No hay categorías registradas</p>
          <p className="text-sm mt-1">Crea una nueva categoría para comenzar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categorias.map((cat) => (
            <Card key={cat.id} className="overflow-hidden">
              <CardHeader
                className="py-3 px-5 cursor-pointer hover:bg-muted flex flex-row items-center justify-between"
                onClick={() => toggleExpand(cat.id)}
              >
                <div className="flex items-center gap-2">
                  {expanded[cat.id] ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <CardTitle className="text-base font-semibold text-foreground">{cat.nombre}</CardTitle>
                  <Badge variant="outline" className="ml-2 text-xs bg-muted">
                    {(cat.procedimientos || []).length} procedimientos
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary/80 hover:bg-accent"
                    onClick={(e) => { e.stopPropagation(); openNewProc(cat.id); }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Agregar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                    title="Eliminar categoría"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteCatTarget({ id: cat.id, name: cat.nombre, count: (cat.procedimientos || []).length });
                      setConfirmDeleteCatOpen(true);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              {expanded[cat.id] && (
                <CardContent className="px-5 pb-4 pt-0">
                  {(!cat.procedimientos || cat.procedimientos.length === 0) ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Sin procedimientos en esta categoría</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {cat.procedimientos.map((proc) => (
                        <div key={proc.id} className="flex items-center justify-between py-2.5">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{proc.nombre}</p>
                            {proc.descripcion && (
                              <p className="text-xs text-muted-foreground mt-0.5">{proc.descripcion}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            {proc.precioSugerido != null && (
                              <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                <DollarSign className="w-3.5 h-3.5 text-green-500" />
                                {proc.precioSugerido.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" title="Editar" onClick={() => openEditProc(proc)}>
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

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={(v) => { setConfirmDeleteOpen(v); if (!v) setDeleteTarget(null); }}
        onConfirm={() => { setConfirmDeleteOpen(false); }}
        title="Eliminar procedimiento"
        description={deleteTarget ? `¿Estás seguro de eliminar el procedimiento "${deleteTarget.name}"?` : ''}
        confirmText="Sí, eliminar"
        variant="danger"
      />
      <PasswordConfirmDialog
        open={!!deleteTarget && !confirmDeleteOpen}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Eliminar procedimiento"
        description={deleteTarget ? `Ingresa tu contraseña para eliminar "${deleteTarget.name}".` : ''}
      />

      <ConfirmDialog
        open={confirmDeleteCatOpen}
        onOpenChange={(v) => { setConfirmDeleteCatOpen(v); if (!v) setDeleteCatTarget(null); }}
        onConfirm={() => { setConfirmDeleteCatOpen(false); }}
        title="Eliminar categoría"
        description={deleteCatTarget ? `¿Estás seguro de eliminar la categoría "${deleteCatTarget.name}"? ${deleteCatTarget.count > 0 ? `\n${deleteCatTarget.count} procedimiento(s) serán eliminados también.` : ''}` : ''}
        confirmText="Sí, eliminar"
        variant="danger"
      />
      <PasswordConfirmDialog
        open={!!deleteCatTarget && !confirmDeleteCatOpen}
        onOpenChange={() => setDeleteCatTarget(null)}
        onConfirm={confirmDeleteCat}
        title="Eliminar categoría"
        description={deleteCatTarget ? `Ingresa tu contraseña para eliminar "${deleteCatTarget.name}" y todos sus procedimientos.` : ''}
      />
    </div>
  );
}