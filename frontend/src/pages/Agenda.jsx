import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, CalendarDays, Clock } from 'lucide-react';
import { toast } from 'sonner';
import PasswordConfirmDialog from '@/components/PasswordConfirmDialog';
import ConfirmDialog from '@/components/ConfirmDialog';

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const estados = ['pendiente', 'confirmada', 'realizada', 'cancelada'];
const estadoColors = {
  pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmada: 'bg-blue-100 text-blue-800 border-blue-300',
  realizada: 'bg-green-100 text-green-800 border-green-300',
  cancelada: 'bg-red-100 text-red-800 border-red-300',
};
const estadoBadge = {
  pendiente: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmada: 'bg-blue-50 text-blue-700 border-blue-200',
  realizada: 'bg-green-50 text-green-700 border-green-200',
  cancelada: 'bg-red-50 text-red-700 border-red-200',
};

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

export default function Agenda() {
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [filtroEstado, setFiltroEstado] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ pacienteId: '', fecha: formatDate(new Date()), hora: '', procedimiento: '', notas: '', estado: 'pendiente' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editingCita, setEditingCita] = useState(null);
  const [procedimientos, setProcedimientos] = useState([]);
  const [procSearchOpen, setProcSearchOpen] = useState(false);
  const procSearchRef = useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroEstado) params.estado = filtroEstado;
      const data = await api.getCitas(params);
      setCitas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading citas:', err);
      setCitas([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPacientes = async () => {
    try {
      const data = await api.getPacientes();
      setPacientes(Array.isArray(data) ? data : []);
    } catch (err) {
      setPacientes([]);
    }
  };

  useEffect(() => { loadPacientes(); }, []);
  useEffect(() => { load(); }, [filtroEstado]);

  const loadProcedimientos = async () => {
    try {
      const data = await api.getProcedimientos();
      setProcedimientos(Array.isArray(data) ? data : []);
    } catch (err) {
      setProcedimientos([]);
    }
  };

  useEffect(() => { loadProcedimientos(); }, []);

  // Close procedure search on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (procSearchRef.current && !procSearchRef.current.contains(e.target)) setProcSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Group procedimientos by category (same as in presupuesto)
  const procedimientosPorCategoria = procedimientos.reduce((acc, p) => {
    const cat = p.categoria?.nombre || 'Otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  // Group citas by date
  const citasByDate = {};
  citas.forEach((c) => {
    if (!citasByDate[c.fecha]) citasByDate[c.fecha] = [];
    citasByDate[c.fecha].push(c);
  });

  // Selected day citas
  const selectedCitas = citasByDate[selectedDate] || [];

  // Calendar
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = formatDate(new Date());
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const hasCitasOnDay = (day) => {
    if (!day) return false;
    const ds = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return !!citasByDate[ds];
  };

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const ds = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(ds);
  };

  const handleEstadoChange = async (id, nuevoEstado) => {
    try {
      await api.updateCita(id, { estado: nuevoEstado });
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEdit = (cita) => {
    setEditingCita(cita);
    setForm({
      pacienteId: String(cita.pacienteId),
      fecha: cita.fecha,
      hora: cita.hora || '',
      procedimiento: cita.procedimiento || '',
      notas: cita.notas || '',
      estado: cita.estado,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id) => {
    setDeleteTarget({ id });
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteCita(deleteTarget.id);
      await load();
      setDeleteTarget(null);
      setConfirmDeleteOpen(false);
      toast.success('Cita eliminada exitosamente.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSave = async () => {
    if (!form.pacienteId || !form.fecha) return;
    try {
      setSaving(true);
      if (editingCita) {
        await api.updateCita(editingCita.id, form);
      } else {
        await api.createCita(form);
      }
      setDialogOpen(false);
      setEditingCita(null);
      setForm({ pacienteId: '', fecha: formatDate(new Date()), hora: '', procedimiento: '', notas: '', estado: 'pendiente' });
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getPacienteName = (id) => {
    const p = pacientes.find((px) => px.id === id);
    return p ? `${p.nombres} ${p.apellidos}` : '—';
  };

  const isCurrentDay = (day) => {
    if (!day) return false;
    const ds = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return ds === today;
  };

  const selectedDateCitasCount = selectedCitas.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500 mt-1">Calendario de citas y procedimientos</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Filtrar estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los estados</SelectItem>
              {estados.map((e) => (
                <SelectItem key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => { setForm({ ...form, fecha: selectedDate }); setDialogOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-1" />
            Nueva Cita
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="font-semibold text-gray-900">{months[currentMonth]} {currentYear}</h3>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 md:gap-1 text-center text-xs font-medium text-gray-500 mb-2">
            {weekDays.map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5 md:gap-1">
            {calendarDays.map((day, idx) => {
              const ds = day ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
              return (
                <div key={idx} className="aspect-square">
                  {day && (
                    <button
                      onClick={() => handleDayClick(day)}
                      className={`w-full h-full min-h-[32px] min-w-[32px] rounded-lg text-xs md:text-sm font-medium transition-colors relative
                        ${ds === selectedDate
                          ? 'bg-indigo-500 text-white shadow-sm'
                          : isCurrentDay(day)
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      {day}
                      {hasCitasOnDay(day) && (
                        <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                          ds === selectedDate ? 'bg-white' : 'bg-indigo-400'
                        }`} />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected day citas */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-500" />
              {(() => {
                const d = new Date(selectedDate + 'T12:00:00');
                return d.toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              })()}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {selectedDateCitasCount} cita{selectedDateCitasCount !== 1 ? 's' : ''}
            </Badge>
          </div>

          {selectedCitas.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay citas para este día</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setForm({ ...form, fecha: selectedDate }); setDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" />
                Agregar Cita
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {selectedCitas
                .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
                .map((c) => (
                <div key={c.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link to={`/historial/${c.pacienteId}`} className="font-semibold text-gray-900 hover:text-indigo-600 hover:underline">{getPacienteName(c.pacienteId)}</Link>
                        {c.hora && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {c.hora}
                          </span>
                        )}
                      </div>
                      {c.procedimiento && (
                        <p className="text-sm text-gray-600">{c.procedimiento}</p>
                      )}
                      {c.notas && (
                        <p className="text-xs text-gray-400 italic">{c.notas}</p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <Select value={c.estado} onValueChange={(v) => handleEstadoChange(c.id, v)}>
                          <SelectTrigger className={`h-6 w-28 text-[10px] ${estadoColors[c.estado]}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {estados.map((e) => (
                              <SelectItem key={e} value={e} className="text-xs">{e.charAt(0).toUpperCase() + e.slice(1)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Badge variant="outline" className={`text-[10px] ${c.origen === 'automatico' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {c.origen === 'automatico' ? 'Auto' : 'Manual'}
                        </Badge>

                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-indigo-600 shrink-0" title="Editar" onClick={() => handleEdit(c)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 shrink-0" title="Eliminar" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialog Nueva / Editar Cita */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) setEditingCita(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCita ? 'Editar Cita' : 'Nueva Cita'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <Select value={form.pacienteId} onValueChange={(v) => setForm({ ...form, pacienteId: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar paciente..." /></SelectTrigger>
                <SelectContent>
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.nombres} {p.apellidos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Procedimiento</Label>
              <div className="relative" ref={procSearchRef}>
                <Input
                  placeholder="Buscar procedimiento..."
                  value={form.procedimiento}
                  onChange={(e) => {
                    setForm({ ...form, procedimiento: e.target.value });
                    setProcSearchOpen(true);
                  }}
                  onFocus={() => setProcSearchOpen(true)}
                />
                {procSearchOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {Object.entries(procedimientosPorCategoria).map(([categoria, procs]) => {
                      const filtrados = procs.filter(p =>
                        !form.procedimiento || p.nombre.toLowerCase().includes(form.procedimiento.toLowerCase())
                      );
                      if (filtrados.length === 0) return null;
                      return (
                        <div key={categoria}>
                          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 bg-gray-50 sticky top-0 border-b border-gray-100">
                            {categoria}
                          </div>
                          {filtrados.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-gray-50 last:border-0 flex items-center justify-between"
                              onClick={() => {
                                setForm({ ...form, procedimiento: p.nombre });
                                setProcSearchOpen(false);
                              }}
                            >
                              <span>{p.nombre}</span>
                              {p.precioSugerido && (
                                <span className="text-xs text-gray-400">RD$ {p.precioSugerido}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                    {Object.values(procedimientosPorCategoria).every(procs =>
                      procs.every(p => form.procedimiento && !p.nombre.toLowerCase().includes(form.procedimiento.toLowerCase()))
                    ) && (
                      <div className="px-3 py-4 text-sm text-gray-400 text-center">
                        Sin resultados para "{form.procedimiento}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.pacienteId || !form.fecha} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? 'Guardando...' : (editingCita ? 'Guardar Cambios' : 'Crear Cita')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={(v) => { setConfirmDeleteOpen(v); if (!v) setDeleteTarget(null); }}
        onConfirm={() => { setConfirmDeleteOpen(false); }}
        title="Eliminar cita"
        description="¿Estás seguro de eliminar esta cita?"
        confirmText="Sí, eliminar"
        variant="danger"
      />

      <PasswordConfirmDialog
        open={!!deleteTarget && !confirmDeleteOpen}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Eliminar cita"
        description="Ingresa tu contraseña para eliminar esta cita."
      />
    </div>
  );
}
