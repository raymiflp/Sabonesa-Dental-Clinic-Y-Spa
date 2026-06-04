import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Users, Calendar, CreditCard, DollarSign, ClipboardList, ArrowRight, Clock, Plus, TrendingUp } from 'lucide-react';

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pacientes: 0, citasHoy: 0, citasPendientes: 0, totalCreditos: 0 });
  const [citasHoy, setCitasHoy] = useState([]);
  const [ultimosCreditos, setUltimosCreditos] = useState([]);
  const [citasProximas, setCitasProximas] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Cobro Dialog state ---
  const [cobroDialogOpen, setCobroDialogOpen] = useState(false);
  const [cobroCita, setCobroCita] = useState(null);
  const [cobroForm, setCobroForm] = useState({
    procedimiento: '',
    montoPagado: '',
    montoAbonado: '',
    descuento: '',
    fecha: formatDate(new Date()),
  });
  const [cobroSaving, setCobroSaving] = useState(false);

  const loadDashboardData = async () => {
    try {
      const hoy = formatDate(new Date());

      const [pData, cData, citasData, creditosData] = await Promise.all([
        api.getPacientes(),
        api.getCitas({ fecha: hoy }),
        api.getCitas({}),
        api.getAllCrediticio({}),
      ]);

      const pacientes = Array.isArray(pData) ? pData : [];
      const citasHoyArr = Array.isArray(cData) ? cData : [];
      const todasCitas = Array.isArray(citasData) ? citasData : [];
      const creditos = Array.isArray(creditosData) ? creditosData : [];

      const pendientes = todasCitas.filter((c) => c.estado === 'pendiente' || c.estado === 'confirmada');

      // Próximas citas (ordenadas por fecha, excluyendo hoy)
      const proximas = todasCitas
        .filter((c) => c.fecha >= hoy && c.fecha !== hoy && (c.estado === 'pendiente' || c.estado === 'confirmada'))
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora || '').localeCompare(b.hora || ''))
        .slice(0, 5);

      const totalRecaudado = creditos.reduce((s, r) => s + (r.montoPagado || 0), 0);
      const ultimos = [...creditos]
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .slice(0, 5);

      setStats({
        pacientes: pacientes.length,
        citasHoy: citasHoyArr.length,
        citasPendientes: pendientes.length,
        totalCreditos: totalRecaudado,
      });
      setCitasHoy(citasHoyArr);
      setUltimosCreditos(ultimos);
      setCitasProximas(proximas);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const openCobroDialog = (cita) => {
    setCobroCita(cita);
    setCobroForm({
      procedimiento: cita.procedimiento || '',
      montoPagado: '',
      montoAbonado: '',
      descuento: '',
      fecha: cita.fecha || formatDate(new Date()),
    });
    setCobroDialogOpen(true);
  };

  const handleCobroSubmit = async () => {
    if (!cobroCita) return;
    try {
      setCobroSaving(true);
      await api.createCrediticio({
        pacienteId: cobroCita.pacienteId,
        procedimiento: cobroForm.procedimiento,
        montoPagado: cobroForm.montoPagado ? parseFloat(cobroForm.montoPagado) : null,
        montoAbonado: cobroForm.montoAbonado ? parseFloat(cobroForm.montoAbonado) : null,
        descuento: cobroForm.descuento ? parseFloat(cobroForm.descuento) : null,
        fecha: cobroForm.fecha,
      });
      setCobroDialogOpen(false);
      setCobroCita(null);
      await loadDashboardData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCobroSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen general de la clínica</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/historial')}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-indigo-100 shrink-0">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Pacientes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pacientes}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/agenda')}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100 shrink-0">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Citas Hoy</p>
              <p className="text-2xl font-bold text-gray-900">{stats.citasHoy}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/agenda')}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-100 shrink-0">
              <ClipboardList className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Citas Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.citasPendientes}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/crediticio')}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100 shrink-0">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Pagado</p>
              <p className="text-2xl font-bold text-gray-900">
                RD$ {stats.totalCreditos.toLocaleString('es-DO', { minimumFractionDigits: 0 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Citas de Hoy */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Citas de Hoy
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-indigo-600" onClick={() => navigate('/agenda')}>
              Ver todas <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {citasHoy.length === 0 ? (
              <p className="text-center py-6 text-gray-400 text-sm">No hay citas programadas para hoy</p>
            ) : (
              <div className="space-y-2">
                {citasHoy
                  .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
                  .map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                          {(c.paciente?.nombres?.[0] || '?')}{(c.paciente?.apellidos?.[0] || '')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {c.paciente ? `${c.paciente.nombres} ${c.paciente.apellidos}` : `Paciente #${c.pacienteId}`}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {c.hora && `${c.hora} — `}{c.procedimiento || 'Sin procedimiento'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {c.procedimiento && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 text-xs h-7 px-2"
                            onClick={() => openCobroDialog(c)}
                          >
                            📥 Cobrar
                          </Button>
                        )}
                        <Badge className={
                          c.estado === 'realizada' ? 'bg-green-100 text-green-700' :
                          c.estado === 'cancelada' ? 'bg-red-100 text-red-700' :
                          c.estado === 'confirmada' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }>
                          {c.estado}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximas Citas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Próximas Citas
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-indigo-600" onClick={() => navigate('/agenda')}>
              Ver todas <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {citasProximas.length === 0 ? (
              <p className="text-center py-6 text-gray-400 text-sm">No hay próximas citas programadas</p>
            ) : (
              <div className="space-y-2">
                {citasProximas.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-900">{new Date(c.fecha + 'T12:00:00').getDate()}</p>
                        <p className="text-[10px] text-gray-500 uppercase">
                          {new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-DO', { month: 'short' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {c.paciente ? `${c.paciente.nombres} ${c.paciente.apellidos}` : `Paciente #${c.pacienteId}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {c.hora && `${c.hora} — `}{c.procedimiento || 'Sin procedimiento'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{c.estado}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cobros Pendientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Cobros Pendientes
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-indigo-600" onClick={() => navigate('/crediticio')}>
              Ver todos <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {ultimosCreditos.length === 0 ? (
              <p className="text-center py-6 text-gray-400 text-sm">No hay movimientos registrados</p>
            ) : (
              <div className="space-y-2">
                {ultimosCreditos.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-full bg-green-100 shrink-0">
                        <DollarSign className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {r.paciente ? `${r.paciente.nombres} ${r.paciente.apellidos}` : `Paciente #${r.pacienteId}`}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{r.procedimiento || '—'} · {r.fecha}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-sm font-semibold text-green-600">
                        {r.montoPagado ? `RD$ ${r.montoPagado.toLocaleString('es-DO', { minimumFractionDigits: 0 })}` : '—'}
                      </p>
                      <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 text-xs h-7 px-2" onClick={() => navigate('/crediticio')}>
                        Ver en Crediticio <ArrowRight className="w-3 h-3 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones Rápidas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-500" />
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/historial"
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm transition-all group"
              >
                <div className="p-2.5 rounded-lg bg-indigo-100 group-hover:bg-indigo-200 transition-colors">
                  <Plus className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Nuevo Paciente</p>
                  <p className="text-xs text-gray-500">Registrar un nuevo paciente</p>
                </div>
              </Link>
              <Link
                to="/agenda"
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm transition-all group"
              >
                <div className="p-2.5 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Agenda Hoy</p>
                  <p className="text-xs text-gray-500">Ver y gestionar citas del día</p>
                </div>
              </Link>
              <Link
                to="/crediticio"
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm transition-all group"
              >
                <div className="p-2.5 rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Crediticio</p>
                  <p className="text-xs text-gray-500">Historial de pagos y cobros</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cobro Dialog */}
      <Dialog open={cobroDialogOpen} onOpenChange={(open) => {
        setCobroDialogOpen(open);
        if (!open) setCobroCita(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Cobro</DialogTitle>
          </DialogHeader>
          {cobroCita && (
            <div className="space-y-4 py-4">
              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                <p className="text-sm font-medium text-gray-900">
                  {cobroCita.paciente ? `${cobroCita.paciente.nombres} ${cobroCita.paciente.apellidos}` : `Paciente #${cobroCita.pacienteId}`}
                </p>
                {cobroCita.hora && (
                  <p className="text-xs text-indigo-600 mt-0.5">{cobroCita.hora} · {cobroCita.fecha}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Procedimiento</Label>
                <Input value={cobroForm.procedimiento} onChange={(e) => setCobroForm({ ...cobroForm, procedimiento: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto Pagado (RD$)</Label>
                  <Input type="number" step="0.01" value={cobroForm.montoPagado} onChange={(e) => setCobroForm({ ...cobroForm, montoPagado: e.target.value })} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Monto Abonado (RD$)</Label>
                  <Input type="number" step="0.01" value={cobroForm.montoAbonado} onChange={(e) => setCobroForm({ ...cobroForm, montoAbonado: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descuento (%)</Label>
                <Input type="number" min="0" max="100" value={cobroForm.descuento} onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 100)) {
                    setCobroForm({ ...cobroForm, descuento: val });
                  }
                }} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={cobroForm.fecha} onChange={(e) => setCobroForm({ ...cobroForm, fecha: e.target.value })} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setCobroDialogOpen(false);
              setCobroCita(null);
            }}>Cancelar</Button>
            <Button onClick={handleCobroSubmit} disabled={cobroSaving} className="bg-green-600 hover:bg-green-700 text-white">
              {cobroSaving ? 'Guardando...' : 'Registrar Pago'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
