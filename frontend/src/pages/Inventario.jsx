import { useState, useEffect } from 'react';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Package, Plus, Pencil, Trash2 } from 'lucide-react';

const STOCK_COLORS = {
  empty: 'bg-red-100 text-red-700',
  low: 'bg-yellow-100 text-yellow-700',
  ok: 'bg-green-100 text-green-700',
};

function getStockColor(cantidad) {
  if (cantidad === 0) return STOCK_COLORS.empty;
  if (cantidad <= 10) return STOCK_COLORS.low;
  return STOCK_COLORS.ok;
}

export default function Inventario() {
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    cantidad: '0',
    precioUnitario: '',
    proveedor: '',
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getInsumos();
      setInsumos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading insumos:', err);
      setInsumos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ nombre: '', descripcion: '', cantidad: '0', precioUnitario: '', proveedor: '' });
    setDialogOpen(true);
  };

  const openEdit = (insumo) => {
    setEditing(insumo);
    setForm({
      nombre: insumo.nombre || '',
      descripcion: insumo.descripcion || '',
      cantidad: insumo.cantidad?.toString() || '0',
      precioUnitario: insumo.precioUnitario?.toString() || '',
      proveedor: insumo.proveedor || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre) return;
    try {
      setSaving(true);
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        cantidad: parseInt(form.cantidad) || 0,
        precioUnitario: form.precioUnitario ? parseFloat(form.precioUnitario) : null,
        proveedor: form.proveedor || null,
      };
      if (editing) {
        await api.updateInsumo(editing.id, payload);
      } else {
        await api.createInsumo(payload);
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      alert('Error al guardar insumo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`¿Eliminar insumo "${name}"?`)) return;
    try {
      await api.deleteInsumo(id);
      await load();
      alert('Insumo eliminado exitosamente.');
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const formatCurrency = (value) => {
    if (value == null) return '—';
    return 'RD$ ' + value.toLocaleString('es-DO', { minimumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de insumos y suministros</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" />
          Nuevo Insumo
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : insumos.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No hay insumos registrados</p>
          <p className="text-sm mt-1">Agrega un nuevo insumo para comenzar</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio Unitario</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insumos.map((insumo) => (
                  <TableRow key={insumo.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-800">{insumo.nombre}</p>
                        {insumo.descripcion && (
                          <p className="text-xs text-gray-400 mt-0.5">{insumo.descripcion}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStockColor(insumo.cantidad)} variant="secondary">
                        {insumo.cantidad}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-gray-600">
                      {formatCurrency(insumo.precioUnitario)}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {insumo.proveedor || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400"
                          title="Editar"
                          onClick={() => openEdit(insumo)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400"
                          title="Eliminar"
                          onClick={() => handleDelete(insumo.id, insumo.nombre)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Insumo' : 'Nuevo Insumo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Guantes quirúrgicos"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Descripción opcional"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.cantidad}
                  onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Precio Unitario (RD$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.precioUnitario}
                  onChange={(e) => setForm({ ...form, precioUnitario: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Input
                value={form.proveedor}
                onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
                placeholder="Nombre del proveedor"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.nombre} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
