import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Eye, Search, Stethoscope, MessageCircle, BadgeCheck, X, Pencil, Trash2 } from 'lucide-react';

const emptyPaciente = {
  nombres: '', apellidos: '', cedula: '', telefono: '', direccion: '',
  noCasa: '', sector: '', ocupacion: '', estadoCivil: '', sexo: '',
  edad: '', nivelEducativo: '', email: '', tieneWhatsapp: false,
};

export default function PatientList() {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyPaciente });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getPacientes();
      setPacientes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading pacientes:', err);
      setPacientes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = pacientes.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.nombres || '').toLowerCase().includes(q) ||
      (p.apellidos || '').toLowerCase().includes(q) ||
      (p.cedula || '').toLowerCase().includes(q) ||
      (p.telefono || '').toLowerCase().includes(q)
    );
  });

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyPaciente });
    setDialogOpen(true);
  };

  const openEdit = (paciente) => {
    setEditing(paciente);
    setForm({
      nombres: paciente.nombres || '',
      apellidos: paciente.apellidos || '',
      cedula: paciente.cedula || '',
      telefono: paciente.telefono || '',
      email: paciente.email || '',
      tieneWhatsapp: paciente.tieneWhatsapp || false,
      direccion: paciente.direccion || '',
      noCasa: paciente.noCasa || '',
      sector: paciente.sector || '',
      edad: paciente.edad != null ? String(paciente.edad) : '',
      sexo: paciente.sexo || '',
      estadoCivil: paciente.estadoCivil || '',
      ocupacion: paciente.ocupacion || '',
      nivelEducativo: paciente.nivelEducativo || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`¿Eliminar paciente "${name}" y todos sus datos (historial clínico, citas, créditos, presupuestos)? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deletePaciente(id);
      await load();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        ...form,
        edad: form.edad ? parseInt(form.edad, 10) : null,
      };
      if (editing) {
        await api.updatePaciente(editing.id, payload);
      } else {
        await api.createPaciente(payload);
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial Clínico</h1>
          <p className="text-sm text-gray-500 mt-1">Selecciona un paciente para ver o editar su historial clínico</p>
        </div>
        <Button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="w-4 h-4 mr-1" />
          Nuevo Paciente
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar paciente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Nombres</TableHead>
              <TableHead className="font-semibold">Apellidos</TableHead>
              <TableHead className="font-semibold">Teléfono</TableHead>
              <TableHead className="font-semibold">Cédula</TableHead>
              <TableHead className="font-semibold text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                  Cargando pacientes...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                  {search ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/historial/${p.id}`)}>
                  <TableCell className="font-medium">{p.nombres}</TableCell>
                  <TableCell>{p.apellidos}</TableCell>
                  <TableCell>
                    {p.telefono ? (
                      <span className="inline-flex items-center gap-1">
                        {p.telefono}
                        {p.tieneWhatsapp ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <BadgeCheck className="w-4 h-4" title="Tiene WhatsApp" />
                            <a
                              href={`https://wa.me/${p.telefono.replace(/[^\d]/g, '')}?text=Hola ${p.nombres}, soy de Betty Dental`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4 hover:text-green-700" />
                            </a>
                          </span>
                        ) : (
                          <X className="w-4 h-4 text-gray-300" title="No tiene WhatsApp" />
                        )}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>{p.cedula || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                        onClick={(e) => { e.stopPropagation(); navigate(`/historial/${p.id}`); }}
                      >
                        <Stethoscope className="w-4 h-4 mr-1" />
                        Ver HC
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                        onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id, `${p.nombres} ${p.apellidos}`); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Nuevo / Editar Paciente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Paciente' : 'Nuevo Paciente'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombres">Nombres *</Label>
              <Input id="nombres" value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apellidos">Apellidos *</Label>
              <Input id="apellidos" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cedula">Cédula</Label>
              <Input id="cedula" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={form.tieneWhatsapp}
                  onChange={(e) => setForm({ ...form, tieneWhatsapp: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Tiene WhatsApp
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edad">Edad</Label>
              <Input id="edad" type="number" value={form.edad} onChange={(e) => setForm({ ...form, edad: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sexo">Sexo</Label>
              <Select value={form.sexo} onValueChange={(v) => setForm({ ...form, sexo: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Femenino">Femenino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estadoCivil">Estado Civil</Label>
              <Select value={form.estadoCivil} onValueChange={(v) => setForm({ ...form, estadoCivil: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Soltero/a">Soltero/a</SelectItem>
                  <SelectItem value="Casado/a">Casado/a</SelectItem>
                  <SelectItem value="Divorciado/a">Divorciado/a</SelectItem>
                  <SelectItem value="Viudo/a">Viudo/a</SelectItem>
                  <SelectItem value="Unión Libre">Unión Libre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ocupacion">Ocupación</Label>
              <Input id="ocupacion" value={form.ocupacion} onChange={(e) => setForm({ ...form, ocupacion: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nivelEducativo">Nivel Educativo</Label>
              <Input id="nivelEducativo" value={form.nivelEducativo} onChange={(e) => setForm({ ...form, nivelEducativo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="noCasa">No. Casa</Label>
              <Input id="noCasa" value={form.noCasa} onChange={(e) => setForm({ ...form, noCasa: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector">Sector</Label>
              <Input id="sector" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.nombres || !form.apellidos} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear Paciente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
