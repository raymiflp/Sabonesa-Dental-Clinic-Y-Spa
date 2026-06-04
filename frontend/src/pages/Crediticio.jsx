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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, CalendarDays, DollarSign, FileDown } from 'lucide-react';
import PasswordConfirmDialog from '@/components/PasswordConfirmDialog';
import * as XLSX from 'xlsx';

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function Crediticio() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [pacientes, setPacientes] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ pacienteId: '', procedimiento: '', montoPagado: '', montoAbonado: '', descuento: '', fecha: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const [presupuestosPaciente, setPresupuestosPaciente] = useState([]);
  const [editingCrediticio, setEditingCrediticio] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const [rData, pData] = await Promise.all([
        api.getAllCrediticio({}),
        api.getPacientes(),
      ]);
      setRecords(Array.isArray(rData) ? rData : []);
      setPacientes(Array.isArray(pData) ? pData : []);
    } catch (err) {
      console.error('Error loading data:', err);
      setRecords([]);
      setPacientes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Cargar presupuestos del paciente seleccionado en el diálogo
  useEffect(() => {
    if (!form.pacienteId) {
      setPresupuestosPaciente([]);
      return;
    }
    api.getPresupuestos(form.pacienteId)
      .then(data => setPresupuestosPaciente(Array.isArray(data) ? data : []))
      .catch(() => setPresupuestosPaciente([]));
  }, [form.pacienteId]);

  // Group records by date
  const recordsByDate = {};
  records.forEach((r) => {
    const d = r.fecha;
    if (!recordsByDate[d]) recordsByDate[d] = [];
    recordsByDate[d].push(r);
  });

  // Records for the selected date
  const selectedRecords = selectedDate ? (recordsByDate[selectedDate] || []) : [];

  // Calendar generation
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const hasRecords = (day) => {
    if (!day) return false;
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return !!recordsByDate[dateStr];
  };

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
    setSelectedDate(null);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setForm((f) => ({ ...f, fecha: dateStr }));
  };

  const isToday = (day) => {
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      const data = {
        pacienteId: parseInt(form.pacienteId),
        procedimiento: form.procedimiento,
        montoPagado: form.montoPagado ? parseFloat(form.montoPagado) : null,
        montoAbonado: form.montoAbonado ? parseFloat(form.montoAbonado) : null,
        descuento: form.descuento ? parseFloat(form.descuento) : null,
        fecha: form.fecha || selectedDate,
      };
      if (editingCrediticio) {
        await api.updateCrediticio(editingCrediticio.id, data);
      } else {
        await api.createCrediticio(data);
      }
      setDialogOpen(false);
      setEditingCrediticio(null);
      setForm({ pacienteId: '', procedimiento: '', montoPagado: '', montoAbonado: '', descuento: '', fecha: new Date().toISOString().split('T')[0] });
      await load();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record) => {
    setEditingCrediticio(record);
    setForm({
      pacienteId: String(record.pacienteId),
      procedimiento: record.procedimiento || '',
      montoPagado: record.montoPagado ? String(record.montoPagado) : '',
      montoAbonado: record.montoAbonado ? String(record.montoAbonado) : '',
      descuento: record.descuento?.toString() || '',
      fecha: record.fecha || new Date().toISOString().split('T')[0],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    setDeleteTarget({ id });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteCrediticio(deleteTarget.id);
      await load();
      setDeleteTarget(null);
      alert('Registro eliminado exitosamente.');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Exportar mes actual a Excel
  const exportMonthToExcel = () => {
    const mes = currentMonth;
    const año = currentYear;
    const nombreMes = months[mes];

    // Filtrar registros del mes
    const monthRecords = records.filter((r) => {
      const d = new Date(r.fecha + 'T12:00:00');
      return d.getMonth() === mes && d.getFullYear() === año;
    });

    if (monthRecords.length === 0) {
      alert(`No hay registros en ${nombreMes} ${año}`);
      return;
    }

    // Armar filas
    const rows = monthRecords.map((r, i) => {
      const desctoAplicado = r.montoPagado ? (r.montoPagado * (r.descuento || 0) / 100) : 0;
      const pacienteNombre = r.paciente ? `${r.paciente.nombres || ''} ${r.paciente.apellidos || ''}`.trim() : '—';
      return {
        '#': i + 1,
        Fecha: r.fecha || '—',
        Paciente: pacienteNombre,
        Procedimiento: r.procedimiento || '—',
        'Pagado (RD$)': r.montoPagado || 0,
        'Abonado (RD$)': r.montoAbonado || 0,
        'Descuento %': r.descuento || 0,
        'Descto. Aplicado (RD$)': desctoAplicado,
      };
    });

    // Totales
    const totalPagado = monthRecords.reduce((s, r) => s + (r.montoPagado || 0), 0);
    const totalAbonado = monthRecords.reduce((s, r) => s + (r.montoAbonado || 0), 0);
    const totalDescto = monthRecords.reduce((s, r) => {
      return s + (r.montoPagado ? (r.montoPagado * (r.descuento || 0) / 100) : 0);
    }, 0);

    rows.push({ '#': '', Fecha: '', Paciente: 'TOTALES', Procedimiento: '', 'Pagado (RD$)': totalPagado, 'Abonado (RD$)': totalAbonado, 'Descuento %': '', 'Descto. Aplicado (RD$)': totalDescto });

    // Crear workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 4 },   // #
      { wch: 12 },  // Fecha
      { wch: 30 },  // Paciente
      { wch: 25 },  // Procedimiento
      { wch: 14 },  // Pagado
      { wch: 14 },  // Abonado
      { wch: 12 },  // Descuento %
      { wch: 18 },  // Descto. Aplicado
    ];

    XLSX.utils.book_append_sheet(wb, ws, `${nombreMes} ${año}`);
    XLSX.writeFile(wb, `Crediticio_${nombreMes}_${año}.xlsx`);
  };

  // Helper para mostrar nombre del paciente seleccionado
  const pacienteSeleccionado = pacientes.find(p => String(p.id) === form.pacienteId);

  // Stats
  const totalPagado = records.reduce((s, r) => s + (r.montoPagado || 0), 0);
  const totalAbonado = records.reduce((s, r) => s + (r.montoAbonado || 0), 0);
  const totalDescuento = records.reduce((s, r) => s + ((r.montoPagado || 0) * (r.descuento || 0) / 100), 0);
  const selectedTotalPagado = selectedRecords.reduce((s, r) => s + (r.montoPagado || 0), 0);
  const selectedTotalAbonado = selectedRecords.reduce((s, r) => s + (r.montoAbonado || 0), 0);
  const selectedTotalDescuento = selectedRecords.reduce((s, r) => s + ((r.montoPagado || 0) * (r.descuento || 0) / 100), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial Crediticio</h1>
          <p className="text-sm text-gray-500 mt-1">Calendario de pagos y procedimientos realizados</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportMonthToExcel} className="border-green-300 text-green-700 hover:bg-green-50">
            <FileDown className="w-4 h-4 mr-1" />
            Exportar Excel
          </Button>
          <Button onClick={() => { setForm({ ...form, fecha: selectedDate || new Date().toISOString().split('T')[0] }); setDialogOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-1" />
            Nuevo Movimiento
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Pagado</p>
              <p className="text-xl font-bold text-green-600">RD$ {totalPagado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Abonado</p>
              <p className="text-xl font-bold text-blue-600">RD$ {totalAbonado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <DollarSign className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Descuento aplicado</p>
              <p className="text-xl font-bold text-red-600">RD$ {totalDescuento.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
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
            {calendarDays.map((day, idx) => (
              <div key={idx} className="aspect-square">
                {day && (
                  <button
                    onClick={() => handleDayClick(day)}
                    className={`w-full h-full min-h-[32px] min-w-[32px] rounded-lg text-xs md:text-sm font-medium transition-colors relative
                      ${selectedDate === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : isToday(day)
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    {day}
                    {hasRecords(day) && (
                      <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                        selectedDate === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                          ? 'bg-white' : 'bg-indigo-400'
                      }`} />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Selected Day Records */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-500" />
              {selectedDate
                ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                : 'Selecciona un día'}
            </h3>
            {selectedDate && (
              <Badge variant="secondary" className="text-xs">
                {selectedRecords.length} procedimiento{selectedRecords.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {!selectedDate ? (
            <div className="text-center py-12 text-gray-400">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Haz clic en un día del calendario para ver los procedimientos realizados</p>
            </div>
          ) : selectedRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No hay procedimientos registrados en esta fecha</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Day totals */}
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 font-medium">Pagado: RD$ {selectedTotalPagado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                <span className="text-blue-600 font-medium">Abonado: RD$ {selectedTotalAbonado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                <span className="text-red-500 font-medium">Descto. aplicado: RD$ {selectedTotalDescuento.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Paciente</TableHead>
                      <TableHead className="font-semibold">Procedimiento</TableHead>
                      <TableHead className="font-semibold text-right">Pagado</TableHead>
                      <TableHead className="font-semibold text-right">Abonado</TableHead>
                      <TableHead className="font-semibold text-right">Descuento</TableHead>
                      <TableHead className="font-semibold text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRecords.map((r) => (
                      <TableRow key={r.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {r.paciente ? `${r.paciente.nombres} ${r.paciente.apellidos}` : '—'}
                        </TableCell>
                        <TableCell>{r.procedimiento || '—'}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {r.montoPagado ? `RD$ ${r.montoPagado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : '—'}
                        </TableCell>
                        <TableCell className="text-right text-blue-600 font-medium">
                          {r.montoAbonado ? `RD$ ${r.montoAbonado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : '—'}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${r.descuento > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {r.descuento > 0
                            ? `${r.descuento}% (RD$ ${((r.montoPagado || 0) * r.descuento / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })})`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500" title="Editar" onClick={() => handleEdit(r)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" title="Eliminar" onClick={() => handleDelete(r.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog Nuevo / Editar Movimiento */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setEditingCrediticio(null);
          setForm({ pacienteId: '', procedimiento: '', montoPagado: '', montoAbonado: '', descuento: '', fecha: new Date().toISOString().split('T')[0] });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCrediticio ? 'Editar Movimiento Crediticio' : 'Nuevo Movimiento Crediticio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <Select value={form.pacienteId} onValueChange={(v) => setForm({ ...form, pacienteId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar paciente...">
                    {pacienteSeleccionado ? `${pacienteSeleccionado.nombres} ${pacienteSeleccionado.apellidos}` : ''}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nombres} {p.apellidos} {p.cedula ? `- ${p.cedula}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {presupuestosPaciente.length > 0 && (
              <div className="space-y-2 bg-indigo-50/50 rounded-lg p-3 border border-indigo-100">
                <Label className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                  Presupuestos del paciente ({presupuestosPaciente.length})
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {presupuestosPaciente.map((p) => {
                    const items = p.items || [];
                    const sumaTotal = items.reduce((sum, it) => sum + (it.cantidad || 1) * (it.precio || 0), 0);
                    return (
                      <div key={p.id} className="bg-white rounded border border-indigo-100 p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-500">{p.fecha}</span>
                          <span className="text-xs font-bold text-indigo-600">
                            RD$ {(p.montoTotal || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {items.length > 0 && (
                          <div className="space-y-0.5">
                            {items.map((item, i) => (
                              <button
                                key={i}
                                type="button"
                                className="w-full text-left text-xs px-2 py-1 rounded hover:bg-indigo-50 flex items-center justify-between transition-colors"
                                onClick={() => setForm({ ...form, procedimiento: item.nombre, montoPagado: String(item.cantidad * item.precio) })}
                                title="Usar este procedimiento"
                              >
                                <span className="text-gray-700">{item.nombre} x{item.cantidad}</span>
                                <span className="text-gray-400">RD$ {(item.cantidad * item.precio).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                              </button>
                            ))}
                            {items.length > 1 && (
                              <button
                                type="button"
                                className="w-full text-left text-xs px-2 py-1.5 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium flex items-center justify-center gap-1 transition-colors mt-1"
                                onClick={() => {
                                  const nombres = items.map(it => it.nombre).join(', ');
                                  setForm({ ...form, procedimiento: nombres, montoPagado: String(sumaTotal) });
                                }}
                                title="Usar todos los procedimientos"
                              >
                                Usar todo — RD$ {sumaTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-indigo-400">Haz clic en un procedimiento o en "Usar todo"</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Procedimiento</Label>
              <Input value={form.procedimiento} onChange={(e) => setForm({ ...form, procedimiento: e.target.value })} placeholder="Ej: Limpieza Dental" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto Pagado (RD$)</Label>
                <Input type="number" step="0.01" value={form.montoPagado} onChange={(e) => setForm({ ...form, montoPagado: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Monto Abonado (RD$)</Label>
                <Input type="number" step="0.01" value={form.montoAbonado} onChange={(e) => setForm({ ...form, montoAbonado: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descuento (%)</Label>
              <Input type="number" min="0" max="100" value={form.descuento} onChange={(e) => {
                const val = e.target.value;
                if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 100)) {
                  setForm({ ...form, descuento: val });
                }
              }} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setDialogOpen(false);
              setEditingCrediticio(null);
              setForm({ pacienteId: '', procedimiento: '', montoPagado: '', montoAbonado: '', descuento: '', fecha: new Date().toISOString().split('T')[0] });
            }}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !form.pacienteId} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? 'Guardando...' : (editingCrediticio ? 'Guardar Cambios' : 'Agregar')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PasswordConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Eliminar registro crediticio"
        description="Ingresa tu contraseña para eliminar este registro."
      />
    </div>
  );
}
