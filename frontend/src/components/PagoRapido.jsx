import { useState, useEffect, useRef } from 'react';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Search, DollarSign, Calendar, CheckCircle2, Loader2, UserPlus } from 'lucide-react';

export default function PagoRapido({ open, onOpenChange, onSuccess }) {
  const [step, setStep] = useState('paciente'); // paciente → procedimientos → pago → resumen
  const [pacientes, setPacientes] = useState([]);
  const [procedimientos, setProcedimientos] = useState([]);
  const [procedimientosPorCategoria, setProcedimientosPorCategoria] = useState({});
  const [saving, setSaving] = useState(false);

  // Patient state
  const [pacienteSearch, setPacienteSearch] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [showNewPaciente, setShowNewPaciente] = useState(false);
  const [newPaciente, setNewPaciente] = useState({ 
    nombres: '', apellidos: '', cedula: '', telefono: '', email: '',
    tieneWhatsapp: false, direccion: '', sector: '', edad: '',
    sexo: '', estadoCivil: '', ocupacion: '', nivelEducativo: ''
  });
  
  // Procedure state (items to be added to presupuesto)
  const [items, setItems] = useState([]);
  const [procSearchOpen, setProcSearchOpen] = useState(false);
  const [procQuery, setProcQuery] = useState('');
  const procSearchRef = useRef(null);

  // Payment state
  const [montoPagado, setMontoPagado] = useState('');
  const [montoAbonado, setMontoAbonado] = useState('');
  const [descuento, setDescuento] = useState('');

  // Cita state
  const [agendarCita, setAgendarCita] = useState(false);
  const [citaFecha, setCitaFecha] = useState(new Date().toISOString().split('T')[0]);
  const [citaHora, setCitaHora] = useState('');

  // Load data
  useEffect(() => {
    if (!open) return;
    api.getPacientes().then(d => setPacientes(Array.isArray(d) ? d : [])).catch(() => {});
    api.getProcedimientos().then(data => {
      const arr = Array.isArray(data) ? data : [];
      setProcedimientos(arr);
      // Group by categoria
      const grouped = arr.reduce((acc, p) => {
        const cat = p.categoria?.nombre || 'Otros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(p);
        return acc;
      }, {});
      setProcedimientosPorCategoria(grouped);
    }).catch(() => {});
  }, [open]);

  // Close search on outside click
  useEffect(() => {
    const handle = (e) => {
      if (procSearchRef.current && !procSearchRef.current.contains(e.target)) setProcSearchOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Filter patients for search
  const filteredPacientes = pacientes.filter(p => {
    if (!pacienteSearch) return true;
    const q = pacienteSearch.toLowerCase();
    return p.nombres?.toLowerCase().includes(q) ||
      p.apellidos?.toLowerCase().includes(q) ||
      p.cedula?.toLowerCase().includes(q) ||
      p.telefono?.toLowerCase().includes(q);
  });

  const getTotalItems = () => items.reduce((sum, it) => sum + (it.cantidad || 1) * (it.precio || 0), 0);

  const addItem = (proc) => {
    setItems([...items, { 
      id: Date.now(), 
      nombre: proc.nombre, 
      cantidad: 1, 
      precio: proc.precioSugerido || 0,
      procedimientoId: proc.id,
    }]);
    setProcQuery('');
    setProcSearchOpen(false);
  };

  const removeItem = (id) => setItems(items.filter(i => i.id !== id));

  const handleSave = async () => {
    if (!selectedPaciente || items.length === 0) return;
    try {
      setSaving(true);
      const pacienteId = selectedPaciente.id;
      
      // 1. Create presupuesto (with estado='aceptado' since payment is happening)
      const total = getTotalItems();
      await api.createPresupuesto({
        pacienteId,
        fecha: new Date().toISOString().split('T')[0],
        items: items.map(i => ({ nombre: i.nombre, cantidad: i.cantidad, precio: i.precio, procedimientoId: i.procedimientoId })),
        montoTotal: total,
        estado: 'aceptado',
        notas: 'Pago rápido',
      });

      // 2. Create crediticio record
      await api.createCrediticio({
        pacienteId,
        procedimiento: items.map(i => i.nombre).join(', '),
        montoPagado: montoPagado ? parseFloat(montoPagado) : total,
        montoAbonado: montoAbonado ? parseFloat(montoAbonado) : null,
        descuento: descuento ? parseFloat(descuento) : null,
        fecha: new Date().toISOString().split('T')[0],
      });

      // 3. Optional: create cita
      if (agendarCita && citaFecha) {
        for (const item of items) {
          await api.createCita({
            pacienteId,
            fecha: citaFecha,
            hora: citaHora || null,
            procedimiento: item.nombre,
            estado: 'pendiente',
            notas: 'Generado desde pago rápido',
            origen: 'rapido',
          });
        }
      }

      // Reset and close
      resetForm();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setStep('paciente');
    setSelectedPaciente(null);
    setPacienteSearch('');
    setShowNewPaciente(false);
    setNewPaciente({ nombres: '', apellidos: '', cedula: '', telefono: '' });
    setItems([]);
    setProcQuery('');
    setMontoPagado('');
    setMontoAbonado('');
    setDescuento('');
    setAgendarCita(false);
    setCitaFecha(new Date().toISOString().split('T')[0]);
    setCitaHora('');
  };

  const handleCreatePaciente = async () => {
    if (!newPaciente.nombres || !newPaciente.apellidos) return;
    try {
      const p = await api.createPaciente({
        nombres: newPaciente.nombres,
        apellidos: newPaciente.apellidos,
        cedula: newPaciente.cedula || null,
        telefono: newPaciente.telefono || null,
        email: newPaciente.email || null,
        tieneWhatsapp: newPaciente.tieneWhatsapp,
        direccion: newPaciente.direccion || null,
        sector: newPaciente.sector || null,
        edad: newPaciente.edad ? parseInt(newPaciente.edad) : null,
        sexo: newPaciente.sexo || null,
        estadoCivil: newPaciente.estadoCivil || null,
        ocupacion: newPaciente.ocupacion || null,
        nivelEducativo: newPaciente.nivelEducativo || null,
      });
      setSelectedPaciente(p);
      setShowNewPaciente(false);
      setNewPaciente({ 
        nombres: '', apellidos: '', cedula: '', telefono: '', email: '',
        tieneWhatsapp: false, direccion: '', sector: '', edad: '',
        sexo: '', estadoCivil: '', ocupacion: '', nivelEducativo: ''
      });
      // Refresh pacientes list
      api.getPacientes().then(d => setPacientes(Array.isArray(d) ? d : [])).catch(() => {});
    } catch (err) {
      alert('Error al crear paciente: ' + err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Pago Rápido
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Select/Create Paciente */}
        {step === 'paciente' && (
          <div className="space-y-4 py-4">
            <Label className="text-base font-semibold">1. Seleccionar Paciente</Label>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Buscar paciente por nombre, cédula o teléfono..."
                value={pacienteSearch}
                onChange={(e) => setPacienteSearch(e.target.value)}
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-1">
              {filteredPacientes.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No se encontraron pacientes
                </div>
              ) : (
                filteredPacientes.slice(0, 10).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedPaciente?.id === p.id
                        ? 'bg-indigo-100 text-indigo-700 font-medium'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedPaciente(p)}
                  >
                    <span className="font-medium">{p.nombres} {p.apellidos}</span>
                    {p.cedula && <span className="text-gray-400 ml-2">{p.cedula}</span>}
                    {p.telefono && <span className="text-gray-400 ml-2">{p.telefono}</span>}
                  </button>
                ))
              )}
            </div>

            {!showNewPaciente ? (
              <Button variant="ghost" size="sm" onClick={() => setShowNewPaciente(true)} className="text-indigo-600">
                <UserPlus className="w-4 h-4 mr-1" />
                Nuevo Paciente
              </Button>
            ) : (
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-[400px] overflow-y-auto">
                <Label className="text-sm font-semibold">Crear Paciente</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-400">Nombres *</Label>
                    <Input placeholder="Nombres" value={newPaciente.nombres}
                      onChange={(e) => setNewPaciente({...newPaciente, nombres: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-400">Apellidos *</Label>
                    <Input placeholder="Apellidos" value={newPaciente.apellidos}
                      onChange={(e) => setNewPaciente({...newPaciente, apellidos: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-400">Cédula</Label>
                    <Input placeholder="000-0000000-0" value={newPaciente.cedula}
                      onChange={(e) => setNewPaciente({...newPaciente, cedula: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-400">Teléfono</Label>
                    <Input placeholder="809-555-0101" value={newPaciente.telefono}
                      onChange={(e) => setNewPaciente({...newPaciente, telefono: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-400">Email</Label>
                    <Input type="email" placeholder="correo@ejemplo.com" value={newPaciente.email}
                      onChange={(e) => setNewPaciente({...newPaciente, email: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-400">Edad</Label>
                    <Input type="number" placeholder="35" value={newPaciente.edad}
                      onChange={(e) => setNewPaciente({...newPaciente, edad: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-400">Sexo</Label>
                    <select value={newPaciente.sexo} onChange={(e) => setNewPaciente({...newPaciente, sexo: e.target.value})}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm">
                      <option value="">Seleccionar...</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-400">Estado Civil</Label>
                    <select value={newPaciente.estadoCivil} onChange={(e) => setNewPaciente({...newPaciente, estadoCivil: e.target.value})}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm">
                      <option value="">Seleccionar...</option>
                      <option value="Soltero/a">Soltero/a</option>
                      <option value="Casado/a">Casado/a</option>
                      <option value="Divorciado/a">Divorciado/a</option>
                      <option value="Viudo/a">Viudo/a</option>
                      <option value="Unión Libre">Unión Libre</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-400">Ocupación</Label>
                    <Input placeholder="Ej: Abogada" value={newPaciente.ocupacion}
                      onChange={(e) => setNewPaciente({...newPaciente, ocupacion: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-400">Nivel Educativo</Label>
                    <select value={newPaciente.nivelEducativo} onChange={(e) => setNewPaciente({...newPaciente, nivelEducativo: e.target.value})}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm">
                      <option value="">Seleccionar...</option>
                      <option value="Primaria">Primaria</option>
                      <option value="Secundaria">Secundaria</option>
                      <option value="Universitario">Universitario</option>
                      <option value="Postgrado">Postgrado</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400">Dirección</Label>
                  <Input placeholder="Calle Principal #45" value={newPaciente.direccion}
                    onChange={(e) => setNewPaciente({...newPaciente, direccion: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-400">Sector</Label>
                    <Input placeholder="Los Prados" value={newPaciente.sector}
                      onChange={(e) => setNewPaciente({...newPaciente, sector: e.target.value})} />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={newPaciente.tieneWhatsapp}
                        onChange={(e) => setNewPaciente({...newPaciente, tieneWhatsapp: e.target.checked})}
                        className="rounded border-gray-300 text-indigo-600" />
                      <span className="text-gray-600">Tiene WhatsApp</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleCreatePaciente}
                    disabled={!newPaciente.nombres || !newPaciente.apellidos}
                    className="bg-indigo-600 text-white">
                    Crear y seleccionar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewPaciente(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {selectedPaciente && (
              <div className="flex justify-end">
                <Button onClick={() => setStep('procedimientos')} className="bg-indigo-600 text-white">
                  Continuar →
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Add Procedures */}
        {step === 'procedimientos' && (
          <div className="space-y-4 py-4">
            <Label className="text-base font-semibold">2. Procedimientos</Label>
            
            <div className="text-sm text-gray-500 mb-2">
              Paciente: <span className="font-medium text-gray-800">{selectedPaciente?.nombres} {selectedPaciente?.apellidos}</span>
            </div>

            {/* Items list */}
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {items.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">Agrega procedimientos usando el buscador</div>
              ) : (
                items.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm">
                    <span className="font-medium">{item.nombre}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">
                        x{item.cantidad} — RD$ {(item.cantidad * item.precio).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                      <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Procedure search */}
            <div className="relative" ref={procSearchRef}>
              <Input
                placeholder="Buscar y agregar procedimiento..."
                value={procQuery}
                onChange={(e) => { setProcQuery(e.target.value); setProcSearchOpen(true); }}
                onFocus={() => setProcSearchOpen(true)}
              />
              {procSearchOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {Object.entries(procedimientosPorCategoria).map(([categoria, procs]) => {
                    const filtrados = procs.filter(p =>
                      !procQuery || p.nombre.toLowerCase().includes(procQuery.toLowerCase())
                    );
                    if (filtrados.length === 0) return null;
                    return (
                      <div key={categoria}>
                        <div className="px-3 py-1 text-xs font-semibold text-gray-400 bg-gray-50 sticky top-0">
                          {categoria}
                        </div>
                        {filtrados.map(p => (
                          <button
                            key={p.id} type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex justify-between"
                            onClick={() => addItem(p)}
                          >
                            <span>{p.nombre}</span>
                            {p.precioSugerido && <span className="text-gray-400">RD$ {p.precioSugerido}</span>}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep('paciente')}>← Atrás</Button>
              <Button onClick={() => setStep('pago')} disabled={items.length === 0} className="bg-indigo-600 text-white">
                Continuar →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 'pago' && (
          <div className="space-y-4 py-4">
            <Label className="text-base font-semibold">3. Pago</Label>

            <div className="text-sm text-gray-500 mb-2">
              Procedimientos: <span className="font-medium text-gray-800">{items.map(i => i.nombre).join(', ')}</span>
            </div>

            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <span className="text-xs text-indigo-600">Total</span>
              <p className="text-2xl font-bold text-indigo-700">
                RD$ {getTotalItems().toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto Pagado (RD$)</Label>
                <Input type="number" step="0.01" value={montoPagado}
                  onChange={(e) => setMontoPagado(e.target.value)}
                  placeholder={String(getTotalItems())} />
              </div>
              <div className="space-y-2">
                <Label>Monto Abonado (RD$)</Label>
                <Input type="number" step="0.01" value={montoAbonado}
                  onChange={(e) => setMontoAbonado(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descuento (%)</Label>
              <Input type="number" min="0" max="100" value={descuento}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || (parseInt(v) >= 0 && parseInt(v) <= 100)) setDescuento(v);
                }} placeholder="0" />
            </div>

            {/* Optional: Schedule follow-up */}
            <div className="pt-2 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={agendarCita} onChange={(e) => setAgendarCita(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600" />
                <span className="text-sm font-medium">Agendar cita de seguimiento</span>
              </label>
              
              {agendarCita && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input type="date" value={citaFecha} onChange={(e) => setCitaFecha(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora</Label>
                    <Input type="time" value={citaHora} onChange={(e) => setCitaHora(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep('procedimientos')}>← Atrás</Button>
              <Button onClick={handleSave} disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white">
                {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Guardando...</> : (
                  <><CheckCircle2 className="w-4 h-4 mr-1" /> Finalizar Pago</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
