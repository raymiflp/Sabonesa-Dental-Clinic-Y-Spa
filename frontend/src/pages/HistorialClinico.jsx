import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import Odontograma from '@/components/Odontograma';
import FotosSection from '@/components/FotosSection';
import { ArrowLeft, Save, Plus, Pencil, Trash2, Loader2, MessageCircle, Phone, BadgeCheck, X, Calendar, DollarSign, FileDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import PasswordConfirmDialog from '@/components/PasswordConfirmDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { jsPDF } from 'jspdf';
import { formatDateDDMMYYYY } from '@/utils/formatoFecha';

// --- Checkbox groups ---

const antecedentesOptions = [
  'Cardiopatías', 'Diabetes', 'Hipertensión', 'Asma', 'Epilepsia',
  'Hepatitis', 'VIH/SIDA', 'Anemia', 'Artritis Reumatoide', 'Fiebre Reumática',
  'Problemas Renales', 'Problemas Tiroideos', 'Trastornos Hemorrágicos',
  'Alergias Medicamentosas', 'Alergias (otras)', 'Embarazo',
  'Tratamiento Oncológico', 'Radioterapia en Cabeza/Cuello',
  'Hábito de Fumar', 'Consumo de Alcohol', 'Uso de Drogas',
];

const cuestionarioGeneralOptions = [
  'Toma algún medicamento actualmente?', 'Está en tratamiento médico?',
  'Ha sido hospitalizado en los últimos 2 años?', 'Tiene algún implante?',
  'Usa anticoagulantes?', 'Es alérgico a la penicilina?',
  'Es alérgico a la lidocaína?', 'Tiene prótesis (cualquier tipo)?',
  'Se ha realizado cirugías previas?', 'Tiene hipertensión arterial?',
  'Sufre de desmayos frecuentes?', 'Sangra mucho al hacerse heridas?',
  'Ha donado sangre recientemente?', 'Tiene presión baja?',
];

const cuestionarioDentalOptions = [
  'Se ha realizado algún tratamiento dental previo?',
  'Ha tenido extracciones dentales?', 'Usa ortodoncia?',
  'Tiene prótesis dental?', 'Sufre de sensibilidad dental?',
  'Sangrado de encías al cepillarse?', 'Tiene mal aliento?',
  'Rechina los dientes (bruxismo)?', 'Siente dolor al masticar?',
  'Tiene movilidad en algún diente?', 'Se cepilla los dientes 3 veces al día?',
  'Usa hilo dental?', 'Usa enjuague bucal?',
  'Ha tenido tratamiento de conducto?', 'Tiene caries activas?',
];

const tejidosBlandosOptions = [
  'Encías Normales', 'Gingivitis', 'Periodontitis', 'Retracción Gingival',
  'Fístula', 'Úlcera', 'Leucoplasia', 'Eritroplasia',
  'Lengua Saburral', 'Lengua Geográfica', 'Paladar Normal', 'Paladar Ojival',
];

const anomaliasOptions = [
  'Apiñamiento', 'Diastemas', 'Rotación', 'Transposición',
  'Macrodoncia', 'Microdoncia', 'Fusión', 'Geminación',
  'Diente Conoide', 'Diente de Hutchinson', 'Diente evaginado', 'Diente invaginado',
  'Hipoplasia de Esmalte', 'Fluorosis', 'Manchas por Tetraciclina',
  'Abrasión', 'Erosión', 'Atrición', 'Fractura',
];

// --- ---

function CheckboxGroup({ options, values, onChange, columns = 2 }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-2`}>
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 rounded px-2 py-1">
          <input
            type="checkbox"
            checked={(values || []).includes(opt)}
            onChange={() => {
              const current = values || [];
              const next = current.includes(opt)
                ? current.filter((o) => o !== opt)
                : [...current, opt];
              onChange(next);
            }}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

const defaultHC = {
  antecedentes: [],
  cuestionarioGeneral: [],
  cuestionarioDental: [],
  saludGeneral: '', enfermedadPadece: '', ultimaVisitaMedico: '',
  porqueVisita: '', dieta: '', comentarios: '',
  examenCara: '', examenCuello: '', examenATM: '',
  tejidosBlandos: [],
  anomaliasDentarias: [],
  higieneBucal: '',
  dxRadiografico: '',
  odontograma: null,
  fotos: [],
  presupuestoTexto: '',
  evolucion: '',
  observaciones: '',
  agendaPaciente: [],
};

export default function HistorialClinico() {
  const { pacienteId } = useParams();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [form, setForm] = useState({ ...defaultHC });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('antecedentes');
  const [citaDialogOpen, setCitaDialogOpen] = useState(false);
  const [nuevaCita, setNuevaCita] = useState({ fecha: '', hora: '', procedimiento: '' });
  const [editingCitaId, setEditingCitaId] = useState(null);
  const [procedimientos, setProcedimientos] = useState([]);
  const [presupDialogOpen, setPresupDialogOpen] = useState(false);
  const [presupForm, setPresupForm] = useState({ fecha: new Date().toISOString().split('T')[0], items: [], notas: '' });
  const [presupItem, setPresupItem] = useState({ procedimientoId: '', nombre: '', cantidad: 1, precio: 0 });
  const [presupuestos, setPresupuestos] = useState([]);
  const [editingPresupuesto, setEditingPresupuesto] = useState(null);
  const [deleteTargetHC, setDeleteTargetHC] = useState(null);
  const [confirmDeleteHCOpen, setConfirmDeleteHCOpen] = useState(false);
  const [deleteTargetPresup, setDeleteTargetPresup] = useState(null);
  const [confirmDeletePresupOpen, setConfirmDeletePresupOpen] = useState(false);
  const [agendarConfirmOpen, setAgendarConfirmOpen] = useState(false);
  const [agendarPresupuestoData, setAgendarPresupuestoData] = useState(null);
  const [procSearchOpen, setProcSearchOpen] = useState(false);
  const [citaProcSearchOpen, setCitaProcSearchOpen] = useState(false);
  const procSearchRef = useRef(null);
  const citaProcSearchRef = useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      const [pData, hData] = await Promise.all([
        api.getPaciente(parseInt(pacienteId)),
        api.getHistorial(parseInt(pacienteId)),
      ]);
      setPaciente(pData);
      setHistorial(hData);
      if (hData) {
        console.log('[HC load] fotos from backend:', Array.isArray(hData.fotos) ? hData.fotos.length + ' items, size: ' + JSON.stringify(hData.fotos).length + ' bytes' : typeof hData.fotos);
        setForm({
          antecedentes: hData.antecedentes || [],
          cuestionarioGeneral: hData.cuestionarioGeneral || [],
          cuestionarioDental: hData.cuestionarioDental || [],
          saludGeneral: hData.saludGeneral || '',
          enfermedadPadece: hData.enfermedadPadece || '',
          ultimaVisitaMedico: hData.ultimaVisitaMedico || '',
          porqueVisita: hData.porqueVisita || '',
          dieta: hData.dieta || '',
          comentarios: hData.comentarios || '',
          examenCara: hData.examenCara || '',
          examenCuello: hData.examenCuello || '',
          examenATM: hData.examenATM || '',
          tejidosBlandos: hData.tejidosBlandos || [],
          anomaliasDentarias: hData.anomaliasDentarias || [],
          higieneBucal: hData.higieneBucal || '',
          dxRadiografico: hData.dxRadiografico || '',
          odontograma: hData.odontograma || null,
          fotos: hData.fotos || [],
          presupuestoTexto: hData.presupuestoTexto || '',
          evolucion: hData.evolucion || '',
          observaciones: hData.observaciones || '',
          agendaPaciente: hData.agendaPaciente || [],
        });
      }
    } catch (err) {
      console.warn('[HC load] Error:', err.message);
      // Si no hay historial, es primera vez — modo creación
    } finally {
      setLoading(false);
    }
  };

  const loadProcedimientos = async () => {
    try {
      const data = await api.getProcedimientos();
      setProcedimientos(Array.isArray(data) ? data : []);
    } catch (err) {
      setProcedimientos([]);
    }
  };

  const loadPresupuestos = async () => {
    try {
      const data = await api.getPresupuestos(pacienteId);
      setPresupuestos(Array.isArray(data) ? data : []);
    } catch (err) {
      setPresupuestos([]);
    }
  };

  useEffect(() => { load(); loadProcedimientos(); }, [pacienteId]);

  // Cargar presupuestos cuando se activa la pestaña
  useEffect(() => {
    if (activeTab === 'presupuesto') {
      loadPresupuestos();
    }
  }, [activeTab]);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: typeof value === 'function' ? value(prev[field]) : value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        pacienteId: parseInt(pacienteId),
        ...form,
        fotos: (form.fotos || []).map(f => ({
          id: f.id,
          dataUrl: f.dataUrl,
          url: f.url || '',
          publicId: f.publicId || '',
          fecha: f.fecha,
          descripcion: f.descripcion || '',
        })),
      };
      // Debug
      console.log('[HC Save] cuestionarioDental:', JSON.stringify(form.cuestionarioDental));
      console.log('[HC Save] payload keys:', Object.keys(payload));
      // Debug: verificar fotos
      const fotosCount = (payload.fotos || []).length;
      const fotosSize = JSON.stringify(payload.fotos || []).length;
      console.log('[HC Save] fotos:', fotosCount, 'size:', fotosSize, 'bytes, payload keys:', Object.keys(payload));
      if (historial?.id) {
        await api.updateHistorial(historial.id, payload);
      } else {
        await api.saveHistorial(payload);
      }

      // 2. Sincronizar citas del HC con la tabla Citas general
      const citasAgenda = form.agendaPaciente || [];
      
      // 2a. Obtener citas existentes del HC para este paciente
      const existentes = await api.getCitas({ pacienteId: pacienteId, origen: 'hc' });
      
      // 2b. Eliminar citas HC que ya no están en la agenda
      const fechasHCActuales = citasAgenda.map(c => `${c.fecha}|${c.hora}|${c.procedimiento}`);
      for (const existente of existentes) {
        const key = `${existente.fecha}|${existente.hora}|${existente.procedimiento}`;
        if (!fechasHCActuales.includes(key)) {
          await api.deleteCita(existente.id);
        }
      }

      // 2c. Crear citas HC nuevas que no existan
      const fechasExistentes = existentes.map(c => `${c.fecha}|${c.hora}|${c.procedimiento}`);
      for (const cita of citasAgenda) {
        const key = `${cita.fecha}|${cita.hora}|${cita.procedimiento}`;
        if (!fechasExistentes.includes(key)) {
          await api.createCita({
            pacienteId: parseInt(pacienteId),
            fecha: cita.fecha,
            hora: cita.hora || null,
            procedimiento: cita.procedimiento || null,
            estado: cita.estado || 'pendiente',
            notas: null,
            origen: 'hc',
          });
        }
      }

      await load();
      toast.success('Historial clínico guardado exitosamente.');
    } catch (err) {
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHistorial = async () => {
    setDeleteTargetHC(true);
    setConfirmDeleteHCOpen(true);
  };

  const confirmDeleteHistorial = async () => {
    try {
      setSaving(true);
      await api.deleteHistorial(historial.id);
      navigate('/');
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message);
      setSaving(false);
    }
  };

  // Agenda del paciente
  const addCitaAgenda = () => {
    if (!nuevaCita.fecha) return;
    const citas = form.agendaPaciente || [];

    if (editingCitaId) {
      // Editar existente
      updateField('agendaPaciente', citas.map((c) =>
        c.id === editingCitaId ? { ...c, ...nuevaCita } : c
      ));
    } else {
      // Agregar nueva
      const cita = {
        id: Date.now(),
        ...nuevaCita,
        estado: 'pendiente',
      };
      updateField('agendaPaciente', [...citas, cita]);
    }

    setNuevaCita({ fecha: '', hora: '', procedimiento: '' });
    setEditingCitaId(null);
    setCitaDialogOpen(false);
  };

  const editCitaAgenda = (cita) => {
    setNuevaCita({ fecha: cita.fecha, hora: cita.hora || '', procedimiento: cita.procedimiento || '' });
    setEditingCitaId(cita.id);
    setCitaDialogOpen(true);
  };

  const removeCitaAgenda = (id) => {
    updateField('agendaPaciente', (form.agendaPaciente || []).filter((c) => c.id !== id));
  };

  // Presupuesto
  const addPresupItem = () => {
    if (!presupItem.nombre) return;
    setPresupForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...presupItem, id: Date.now() }],
    }));
    setPresupItem({ procedimientoId: '', nombre: '', cantidad: 1, precio: 0 });
  };

  const removePresupItem = (id) => {
    setPresupForm((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
    }));
  };

  const savePresupuesto = async () => {
    try {
      const total = presupForm.items.reduce((sum, it) => sum + it.cantidad * it.precio, 0);
      const payload = {
        pacienteId: parseInt(pacienteId),
        fecha: presupForm.fecha,
        items: presupForm.items,
        montoTotal: total,
        notas: presupForm.notas,
      };
      if (editingPresupuesto) {
        await api.updatePresupuesto(editingPresupuesto.id, payload);
      } else {
        await api.createPresupuesto(payload);
      }
      setPresupDialogOpen(false);
      setEditingPresupuesto(null);
      setPresupForm({ fecha: new Date().toISOString().split('T')[0], items: [], notas: '' });
      loadPresupuestos();
      toast.success(editingPresupuesto ? 'Presupuesto actualizado exitosamente.' : 'Presupuesto guardado exitosamente.');
    } catch (err) {
      toast.error('Error al guardar presupuesto: ' + err.message);
    }
  };

  const deletePresupuesto = async (id) => {
    setDeleteTargetPresup({ id });
    setConfirmDeletePresupOpen(true);
  };

  const confirmDeletePresup = async () => {
    if (!deleteTargetPresup) return;
    try {
      await api.deletePresupuesto(deleteTargetPresup.id);
      loadPresupuestos();
      setDeleteTargetPresup(null);
      setConfirmDeletePresupOpen(false);
      toast.success('Presupuesto eliminado exitosamente.');
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message);
    }
  };

  const handleEditPresupuesto = (p) => {
    setEditingPresupuesto(p);
    setPresupForm({
      fecha: p.fecha,
      items: (p.items || []).map(it => ({ ...it, id: Date.now() + Math.random() })),
      notas: p.notas || '',
    });
    setPresupDialogOpen(true);
  };

  const cambiarEstadoPresupuesto = async (id, nuevoEstado) => {
    try {
      await api.updatePresupuesto(id, { estado: nuevoEstado });
      loadPresupuestos();
    } catch (err) {
      toast.error('Error al cambiar estado: ' + err.message);
    }
  };

  const agendarPresupuesto = (presupuesto) => {
    setAgendarPresupuestoData(presupuesto);
    setAgendarConfirmOpen(true);
  };

  const confirmAgendarPresupuesto = async () => {
    if (!agendarPresupuestoData) return;
    setAgendarConfirmOpen(false);
    try {
      const items = agendarPresupuestoData.items || [];
      let creadas = 0;
      for (const item of items) {
        await api.createCita({
          pacienteId: parseInt(pacienteId),
          fecha: new Date().toISOString().split('T')[0],
          hora: null,
          procedimiento: item.nombre,
          estado: 'pendiente',
          notas: `Generado del presupuesto del ${agendarPresupuestoData.fecha}`,
          origen: 'presupuesto',
        });
        creadas++;
      }
      toast.success(`${creadas} cita${creadas !== 1 ? 's' : ''} creada${creadas !== 1 ? 's' : ''}. Ve a Agenda para ajustar las fechas.`);
      loadPresupuestos();
    } catch (err) {
      toast.error('Error al agendar: ' + err.message);
    }
  };

  // Generar PDF profesional con datos del paciente
  const generatePDF = async () => {
    if (!paciente) return;
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const m = 12; // margin
      const ml = m; // margin left
      let y = m;    // current y position
      const lineH = 5; // line height
      const col2 = pw / 2; // column split

      const section = (title) => {
        if (y > ph - 20) { pdf.addPage(); y = m; }
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text(title, ml, y);
        y += 2;
        pdf.setDrawColor(99, 102, 241);
        pdf.setLineWidth(0.5);
        pdf.line(ml, y, pw - m, y);
        y += 4;
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(9);
      };

      const field = (label, value) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return;
        if (y > ph - 15) { pdf.addPage(); y = m; }
        pdf.setFont(undefined, 'bold');
        pdf.text(`${label}: `, ml, y);
        const labelW = pdf.getTextWidth(`${label}: `);
        pdf.setFont(undefined, 'normal');
        const val = Array.isArray(value) ? value.join(', ') : String(value);
        // Handle long text - wrap
        const maxW = pw - ml * 2 - labelW;
        if (pdf.getTextWidth(val) > maxW) {
          const lines = pdf.splitTextToSize(val, maxW);
          pdf.text(lines[0], ml + labelW, y);
          y += lineH;
          for (let i = 1; i < lines.length; i++) {
            if (y > ph - 15) { pdf.addPage(); y = m; }
            pdf.text(lines[i], ml, y);
            y += lineH;
          }
        } else {
          pdf.text(val, ml + labelW, y);
          y += lineH;
        }
      };

      const fieldBlock = (label, value) => {
        if (!value) return;
        if (y > ph - 15) { pdf.addPage(); y = m; }
        pdf.setFont(undefined, 'bold');
        pdf.text(`${label}:`, ml, y);
        y += lineH;
        pdf.setFont(undefined, 'normal');
        const maxW = pw - ml * 2;
        const lines = pdf.splitTextToSize(String(value), maxW);
        for (const l of lines) {
          if (y > ph - 15) { pdf.addPage(); y = m; }
          pdf.text(l, ml + 2, y);
          y += lineH;
        }
      };

      // ===== HEADER =====
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(99, 102, 241);
      pdf.text('Betty Dental', ml, y);
      y += 7;
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Historial Clínico', ml, y);
      y += 2;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(ml, y, pw - m, y);
      y += 6;

      // ===== DATOS DEL PACIENTE =====
      section('Datos del Paciente');
      pdf.setFontSize(9);
      field('Nombre', `${paciente.nombres} ${paciente.apellidos}`);
      field('Edad', paciente.edad ? `${paciente.edad} años` : null);
      field('Cédula', paciente.cedula);
      field('Teléfono', paciente.telefono);
      field('Email', paciente.email);
      field('Sexo', paciente.sexo);
      field('Estado Civil', paciente.estadoCivil);
      field('Ocupación', paciente.ocupacion);
      field('Dirección', paciente.direccion);
      field('Sector', paciente.sector);
      field('Nivel Educativo', paciente.nivelEducativo);
      y += 2;

      // ===== ANTECEDENTES =====
      if (form.antecedentes?.length > 0) {
        section('Antecedentes Generales');
        field('Seleccionados', form.antecedentes);
        y += 1;
      }

      // ===== CUESTIONARIOS =====
      if (form.cuestionarioGeneral?.length > 0 || form.cuestionarioDental?.length > 0) {
        section('Cuestionarios');
        if (form.cuestionarioGeneral?.length > 0) {
          field('Cuestionario General', form.cuestionarioGeneral);
        }
        if (form.cuestionarioDental?.length > 0) {
          field('Cuestionario Dental', form.cuestionarioDental);
        }
        y += 1;
      }

      // ===== ESTADO ACTUAL =====
      section('Estado Actual');
      fieldBlock('Salud General', form.saludGeneral);
      fieldBlock('Enfermedad que padece', form.enfermedadPadece);
      field('Última visita al médico', form.ultimaVisitaMedico);
      field('¿Por qué visita?', form.porqueVisita);
      fieldBlock('Dieta', form.dieta);
      fieldBlock('Comentarios', form.comentarios);
      y += 1;

      // ===== EXAMEN FACIAL =====
      section('Examen Facial');
      fieldBlock('Cara', form.examenCara);
      fieldBlock('Cuello', form.examenCuello);
      fieldBlock('ATM', form.examenATM);
      y += 1;

      // ===== TEJIDOS BLANDOS =====
      if (form.tejidosBlandos?.length > 0) {
        section('Tejidos Blandos');
        field('Hallazgos', form.tejidosBlandos);
        y += 1;
      }

      // ===== ANOMALÍAS =====
      if (form.anomaliasDentarias?.length > 0) {
        section('Anomalías Dentarias');
        field('Hallazgos', form.anomaliasDentarias);
        y += 1;
      }

      // ===== HIGIENE Y DX =====
      section('Diagnóstico e Higiene');
      fieldBlock('Higiene Bucal', form.higieneBucal);
      fieldBlock('Diagnóstico Radiográfico', form.dxRadiografico);
      y += 1;

      // ===== AGENDA DEL PACIENTE =====
      const citas = form.agendaPaciente || [];
      section(`Agenda del Paciente (${citas.length} cita${citas.length !== 1 ? 's' : ''})`);
      if (citas.length > 0) {
        // Table header
        if (y > ph - 20) { pdf.addPage(); y = m; }
        pdf.setFont(undefined, 'bold');
        pdf.setFillColor(240, 240, 245);
        const colW = [20, 15, 35, 20];
        const colX = [ml, ml + colW[0] + 2, ml + colW[0] + colW[1] + 4, ml + colW[0] + colW[1] + colW[2] + 6];
        // Draw header background
        pdf.rect(ml, y - 4, colW[0] + colW[1] + colW[2] + colW[3] + 6, 5, 'F');
        pdf.text('Fecha', colX[0], y);
        pdf.text('Hora', colX[1], y);
        pdf.text('Procedimiento', colX[2], y);
        pdf.text('Estado', colX[3], y);
        y += lineH;

        // Table rows
        pdf.setFont(undefined, 'normal');
        for (const c of citas) {
          if (y > ph - 15) { pdf.addPage(); y = m; }
          pdf.text(c.fecha || '—', colX[0], y);
          pdf.text(c.hora || '—', colX[1], y);
          const proc = c.procedimiento || '—';
          const maxProcW = colW[2];
          if (pdf.getTextWidth(proc) > maxProcW) {
            pdf.text(pdf.splitTextToSize(proc, maxProcW)[0], colX[2], y);
          } else {
            pdf.text(proc, colX[2], y);
          }
          pdf.text(c.estado || 'pendiente', colX[3], y);
          y += lineH;
        }
      }
      y += 2;

      // ===== ODONTOGRAMA (dibujo) =====
      const odonto = form.odontograma;
      if (odonto && typeof odonto === 'string' && odonto.startsWith('data:image')) {
        section('Odontograma');
        try {
          // Convertir data URL PNG a JPEG comprimido para reducir tamaño
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = odonto;
          });
          // Comprimir a JPEG calidad 0.7 en un canvas temporal
          const tmpCanvas = document.createElement('canvas');
          const maxW = pw - ml * 2;
          // Escalar manteniendo proporción, pero limitando altura
          const asp = img.height / img.width;
          const imgW = maxW;
          let imgH = imgW * asp;
          // Si la imagen es muy alta, limitar a 200mm de alto
          if (imgH > 200) { imgH = 200; }
          tmpCanvas.width = Math.round(imgW * 2); // 2x para calidad
          tmpCanvas.height = Math.round(imgH * 2);
          const tmpCtx = tmpCanvas.getContext('2d');
          tmpCtx.drawImage(img, 0, 0, tmpCanvas.width, tmpCanvas.height);
          const jpegData = tmpCanvas.toDataURL('image/jpeg', 0.7);

          if (y + imgH + 10 < ph - 15) {
            pdf.addImage(jpegData, 'JPEG', ml, y, imgW, imgH);
            y += imgH + 4;
          } else {
            pdf.addPage();
            y = m;
            pdf.addImage(jpegData, 'JPEG', ml, y, imgW, imgH);
            y += imgH + 4;
          }
        } catch (e) {
          pdf.text('  (No se pudo incluir la imagen en el PDF: ' + e.message + ')', ml, y);
          y += lineH;
        }
        y += 1;
      }

      // ===== FOTOS / RADIOGRAFÍAS =====
      const fotosList = form.fotos || [];
      if (fotosList.length > 0) {
        section(`Fotos / Radiografías (${fotosList.length})`);

        /** Obtener el formato de imagen desde una data URL */
        const detectFormat = (dataUrl) => {
          if (dataUrl.startsWith('data:image/png')) return 'PNG';
          if (dataUrl.startsWith('data:image/gif')) return 'GIF';
          if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
          return 'JPEG'; // default
        };

        /** Convertir URL de Cloudinary a data URL (para PDF) */
        const urlToDataUrl = async (url) => {
          try {
            const res = await fetch(url);
            const blob = await res.blob();
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch {
            return null;
          }
        };

        const fotoImgW = (pw - ml * 2 - 8) / 2; // 2 columnas
        const fotoImgH = fotoImgW * 0.75;
        let fotosYPos = y;

        // Obtener data URL para cada foto (desde Cloudinary URL o local)
        const fotosDataUrls = await Promise.all(fotosList.map(async (foto) => {
          if (foto.dataUrl && typeof foto.dataUrl === 'string' && foto.dataUrl.startsWith('data:image')) {
            return foto.dataUrl; // legacy: ya está en base64
          }
          if (foto.url || foto.cloudinaryUrl) {
            return await urlToDataUrl(foto.url || foto.cloudinaryUrl);
          }
          return null;
        }));

        for (let i = 0; i < fotosList.length; i++) {
          const foto = fotosList[i];
          const imgData = fotosDataUrls[i];

          try {
            if (!imgData || typeof imgData !== 'string' || !imgData.startsWith('data:image')) continue;
            const imgFormat = detectFormat(imgData);

            const col = i % 2;
            const row = Math.floor(i / 2);
            const xPos = ml + col * (fotoImgW + 8);
            const yPos = fotosYPos + row * (fotoImgH + 12);

            if (yPos + fotoImgH > ph - 15) {
              pdf.addPage();
              fotosYPos = m;
              pdf.addImage(imgData, imgFormat, ml, fotosYPos, fotoImgW, fotoImgH);
              if (foto.descripcion) {
                pdf.setFontSize(7);
                pdf.text(foto.descripcion, ml, fotosYPos + fotoImgH + 3);
              }
            } else {
              pdf.addImage(imgData, imgFormat, xPos, yPos, fotoImgW, fotoImgH);
              if (foto.descripcion) {
                pdf.setFontSize(7);
                pdf.text(foto.descripcion, xPos, yPos + fotoImgH + 3);
              }
            }
          } catch (e) {
            pdf.text(`  (Error al incluir foto: ${e.message})`, ml, fotosYPos);
            fotosYPos += 5;
          }
        }
        const totalRows = Math.ceil(fotosList.length / 2);
        y = fotosYPos + totalRows * (fotoImgH + 12) + 4;
      }

      // ===== EVOLUCIÓN =====
      section('Evolución y Observaciones');
      fieldBlock('Evolución', form.evolucion);
      fieldBlock('Observaciones', form.observaciones);
      y += 1;

      // ===== PRESUPUESTO =====
      section('Presupuesto');
      fieldBlock('Notas', form.presupuestoTexto);

      // ===== FOOTER =====
      const fechaStr = new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Generado el ${fechaStr} — Betty Dental`, ml, ph - 8);

      pdf.save(`HC_${paciente.nombres}_${paciente.apellidos}.pdf`);
    } catch (err) {
      toast.error('Error al generar PDF: ' + err.message);
    }
  };

  // Helper para inputs de texto
  const renderTextField = (field, label, placeholder = '', type = 'text') => (
    <div className="space-y-1.5">
      <Label htmlFor={field} className="text-sm font-medium">{label}</Label>
      {type === 'textarea' ? (
        <Textarea
          id={field}
          value={form[field] || ''}
          onChange={(e) => updateField(field, e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <Input
          id={field}
          type={type}
          value={form[field] || ''}
          onChange={(e) => updateField(field, e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );

  // Agrupar procedimientos por categoría
  const procedimientosPorCategoria = procedimientos.reduce((acc, p) => {
    const cat = p.categoria?.nombre || 'Otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  // Cerrar búsquedas al hacer clic fuera
  useEffect(() => {
    const handleClick = (e) => {
      if (procSearchRef.current && !procSearchRef.current.contains(e.target)) {
        setProcSearchOpen(false);
      }
      if (citaProcSearchRef.current && !citaProcSearchRef.current.contains(e.target)) {
        setCitaProcSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

      return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 bg-gray-50 py-3 sm:py-4 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 border-b border-gray-200 gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-gray-400 hover:text-gray-600 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Historial Clínico</h1>
          </div>
          {paciente && (
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
              {paciente.nombres} {paciente.apellidos}
              {paciente.edad && <> | {paciente.edad} años</>}
              {paciente.cedula && <> | {paciente.cedula}</>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {paciente?.telefono && (
            <span className="hidden sm:inline text-xs text-gray-400 mr-1">
              <Phone className="w-3 h-3 inline -mt-0.5" /> {paciente.telefono}
              {paciente.tieneWhatsapp ? (
                <a href={`https://wa.me/${paciente.telefono.replace(/[^\d]/g, '')}?text=Hola ${paciente.nombres}, soy de Betty Dental`}
                  target="_blank" rel="noopener noreferrer" className="ml-1 text-green-600 hover:text-green-700" title="WhatsApp">
                  <MessageCircle className="w-3.5 h-3.5 inline" />
                </a>
              ) : (
                <X className="w-3 h-3 inline ml-1 text-gray-300" />
              )}
            </span>
          )}
          <Button onClick={generatePDF} variant="outline" size="sm" className="border-gray-300 text-gray-600 hover:text-indigo-600 hover:border-indigo-300 h-8 sm:h-9">
            <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 sm:h-9">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> <span className="hidden sm:inline">Guardar</span></>}
          </Button>
          {historial?.id && (
            <Button variant="outline" size="sm" className="border-red-200 text-red-500 hover:bg-red-50 h-8 sm:h-9" onClick={handleDeleteHistorial}>
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs — Mobile: Select dropdown; Desktop: horizontal buttons */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" id="hc-content">
        {/* Mobile: compact Select (menú en un box, info en otro box) */}
        <div className="sm:hidden mb-4">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full bg-white border-indigo-200 text-sm font-medium">
              <SelectValue>
                {activeTab === 'agenda' && 'Agenda'}
                {activeTab === 'presupuesto' && 'Presupuesto'}
                {activeTab === 'antecedentes' && 'Antecedentes'}
                {activeTab === 'cuestionarios' && 'Cuestionarios'}
                {activeTab === 'estado' && 'Estado Actual'}
                {activeTab === 'examen' && 'Ex. Facial'}
                {activeTab === 'anomalias' && 'Anomalías'}
                {activeTab === 'evolucion' && 'Evolución'}
                {activeTab === 'odontograma' && 'Odontograma'}
                {activeTab === 'fotos' && 'Fotos / Rx'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agenda">Agenda</SelectItem>
              <SelectItem value="presupuesto">💰 Presupuesto</SelectItem>
              <SelectItem value="antecedentes">Antecedentes</SelectItem>
              <SelectItem value="cuestionarios">Cuestionarios</SelectItem>
              <SelectItem value="estado">Estado Actual</SelectItem>
              <SelectItem value="examen">Ex. Facial</SelectItem>
              <SelectItem value="anomalias">Anomalías</SelectItem>
              <SelectItem value="evolucion">Evolución</SelectItem>
              <SelectItem value="odontograma">Odontograma</SelectItem>
              <SelectItem value="fotos">Fotos / Rx</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: horizontal tabs */}
        <TabsList className="hidden sm:flex sm:flex-wrap h-auto gap-1 bg-transparent p-0.5">
          <TabsTrigger value="agenda" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200 data-[state=active]:border-indigo-600 text-xs">
            <Calendar className="w-3.5 h-3.5 mr-1" />
            Agenda
          </TabsTrigger>
          <TabsTrigger value="presupuesto" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 data-[state=active]:border-emerald-600 text-xs">
            <DollarSign className="w-3.5 h-3.5 mr-1" />
            Presupuesto
          </TabsTrigger>
          <TabsTrigger value="antecedentes" className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 text-xs">Antecedentes</TabsTrigger>
          <TabsTrigger value="cuestionarios" className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 text-xs">Cuestionarios</TabsTrigger>
          <TabsTrigger value="estado" className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 text-xs">Estado Actual</TabsTrigger>
          <TabsTrigger value="examen" className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 text-xs">Ex. Facial</TabsTrigger>
          <TabsTrigger value="anomalias" className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 text-xs">Anomalías</TabsTrigger>
          <TabsTrigger value="evolucion" className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 text-xs">Evolución</TabsTrigger>
          <TabsTrigger value="odontograma" className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 text-xs">Odontograma</TabsTrigger>
          <TabsTrigger value="fotos" className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 text-xs">Fotos / Rx</TabsTrigger>
        </TabsList>

        {/* Tab: Agenda del Paciente */}
        <TabsContent value="agenda" className="mt-4">
          <Card className="border-indigo-200 ring-1 ring-indigo-100">
            <CardHeader className="flex flex-row items-center justify-between bg-indigo-50/50">
              <CardTitle className="text-lg flex items-center gap-2 text-indigo-800">
                <Calendar className="w-5 h-5" />
                Agenda del Paciente
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setCitaDialogOpen(true)} className="border-indigo-300 text-indigo-700 hover:bg-indigo-100">
                <Plus className="w-4 h-4 mr-1" />
                Agregar Cita
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Fecha</TableHead>
                      <TableHead className="font-semibold">Hora</TableHead>
                      <TableHead className="font-semibold">Procedimiento</TableHead>
                      <TableHead className="font-semibold">Estado</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!form.agendaPaciente || form.agendaPaciente.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-gray-400">
                          Sin citas agendadas
                        </TableCell>
                      </TableRow>
                    ) : (
                      form.agendaPaciente.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{formatDateDDMMYYYY(c.fecha)}</TableCell>
                          <TableCell>{c.hora || '—'}</TableCell>
                          <TableCell>{c.procedimiento || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              c.estado === 'realizada' ? 'bg-green-50 text-green-700 border-green-200' :
                              c.estado === 'cancelada' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }>
                              {c.estado || 'pendiente'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-indigo-600" title="Editar" onClick={() => editCitaAgenda(c)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => removeCitaAgenda(c.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Al guardar el historial, las citas se sincronizan automáticamente con la agenda general.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="antecedentes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Antecedentes Generales</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckboxGroup
                options={antecedentesOptions}
                values={form.antecedentes}
                onChange={(v) => updateField('antecedentes', v)}
                columns={3}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Cuestionarios */}
        <TabsContent value="cuestionarios" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cuestionario General</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckboxGroup
                options={cuestionarioGeneralOptions}
                values={form.cuestionarioGeneral}
                onChange={(v) => updateField('cuestionarioGeneral', v)}
                columns={2}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cuestionario Dental</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckboxGroup
                options={cuestionarioDentalOptions}
                values={form.cuestionarioDental}
                onChange={(v) => updateField('cuestionarioDental', v)}
                columns={2}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Estado Actual */}
        <TabsContent value="estado" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderTextField('saludGeneral', 'Salud General', 'Describa...')}
                {renderTextField('enfermedadPadece', 'Enfermedad que Padece', '')}
                {renderTextField('ultimaVisitaMedico', 'Última Visita al Médico', '')}
                {renderTextField('porqueVisita', '¿Por qué visita?', '')}
                {renderTextField('dieta', 'Dieta', '')}
              </div>
              <div className="mt-4">
                {renderTextField('comentarios', 'Comentarios', 'Comentarios adicionales...', 'textarea')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Examen Facial + Tejidos Blandos */}
        <TabsContent value="examen" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Examen Facial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderTextField('examenCara', 'Cara', 'Hallazgos...')}
                {renderTextField('examenCuello', 'Cuello', 'Hallazgos...')}
                {renderTextField('examenATM', 'ATM', 'Hallazgos...')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tejidos Blandos</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckboxGroup
                options={tejidosBlandosOptions}
                values={form.tejidosBlandos}
                onChange={(v) => updateField('tejidosBlandos', v)}
                columns={3}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Anomalías Dentarias */}
        <TabsContent value="anomalias" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anomalías Dentarias</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckboxGroup
                options={anomaliasOptions}
                values={form.anomaliasDentarias}
                onChange={(v) => updateField('anomaliasDentarias', v)}
                columns={3}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Evolución, Higiene, Dx */}
        <TabsContent value="evolucion" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evolución y Observaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderTextField('higieneBucal', 'Higiene Bucal', 'Buena / Regular / Mala', 'textarea')}
                {renderTextField('dxRadiografico', 'Diagnóstico Radiográfico', 'Hallazgos radiográficos...', 'textarea')}
              </div>
              {renderTextField('evolucion', 'Evolución', 'Evolución del paciente...', 'textarea')}
              {renderTextField('observaciones', 'Observaciones', 'Notas adicionales...', 'textarea')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Odontograma */}
        <TabsContent value="odontograma" className="mt-4">
          <Odontograma
            odontograma={form.odontograma}
            onChange={(v) => updateField('odontograma', v)}
          />
        </TabsContent>

        {/* Tab: Fotos / Radiografías */}
        <TabsContent value="fotos" className="mt-4">
          <FotosSection
            fotos={form.fotos}
            onChange={(fotos) => updateField('fotos', fotos)}
          />
        </TabsContent>

        {/* Tab: Presupuesto */}
        <TabsContent value="presupuesto" className="mt-4">
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  Presupuestos ({presupuestos.length})
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setPresupDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Nuevo Presupuesto
                </Button>
              </CardHeader>
              <CardContent>
                {presupuestos.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No hay presupuestos registrados. Crea uno nuevo con el botón de arriba.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {presupuestos.map((p) => (
                      <div key={p.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-200 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="font-semibold text-gray-900">{formatDateDDMMYYYY(p.fecha)}</span>
                            <select
                              value={p.estado || 'pendiente'}
                              onChange={(e) => cambiarEstadoPresupuesto(p.id, e.target.value)}
                              className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full border-0 bg-transparent cursor-pointer outline-none ${
                                p.estado === 'aceptado' ? 'text-green-700' :
                                p.estado === 'rechazado' ? 'text-red-700' :
                                'text-yellow-700'
                              }`}
                              style={{ backgroundColor: p.estado === 'aceptado' ? '#f0fdf4' : p.estado === 'rechazado' ? '#fef2f2' : '#fefce8' }}
                            >
                              <option value="pendiente">pendiente</option>
                              <option value="aceptado">aceptado</option>
                              <option value="rechazado">rechazado</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-indigo-600">
                              RD$ {(p.montoTotal || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </span>
                            {p.estado === 'aceptado' && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500" title="Agendar procedimientos" onClick={() => agendarPresupuesto(p)}>
                                <Calendar className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400" title="Editar presupuesto" onClick={() => handleEditPresupuesto(p)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400" title="Imprimir presupuesto" onClick={() => generatePresupuestoPDF(p)}>
                              <FileDown className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => deletePresupuesto(p.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        {p.items && p.items.length > 0 && (
                          <div className="text-xs text-gray-500 space-y-1">
                            {p.items.map((item, i) => (
                              <div key={i} className="flex justify-between">
                                <span>{item.nombre} x{item.cantidad}</span>
                                <span>RD$ {(item.cantidad * item.precio).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {p.notas && (
                          <p className="text-xs text-gray-400 mt-2 italic">{p.notas}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>

      {/* Dialog: Agregar / Editar Cita en Agenda del Paciente */}
      <Dialog open={citaDialogOpen} onOpenChange={(open) => {
        setCitaDialogOpen(open);
        if (!open) { setEditingCitaId(null); setNuevaCita({ fecha: '', hora: '', procedimiento: '' }); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCitaId ? 'Editar Cita' : 'Agregar Cita a la Agenda'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input type="date" value={nuevaCita.fecha} onChange={(e) => setNuevaCita({ ...nuevaCita, fecha: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input type="time" value={nuevaCita.hora} onChange={(e) => setNuevaCita({ ...nuevaCita, hora: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Procedimiento</Label>
              <div className="relative" ref={citaProcSearchRef}>
                <Input
                  placeholder="Buscar procedimiento..."
                  value={nuevaCita.procedimiento}
                  onChange={(e) => {
                    setNuevaCita({ ...nuevaCita, procedimiento: e.target.value });
                    setCitaProcSearchOpen(true);
                  }}
                  onFocus={() => setCitaProcSearchOpen(true)}
                />
                {citaProcSearchOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {Object.entries(procedimientosPorCategoria).map(([categoria, procs]) => {
                      const filtrados = procs.filter(p =>
                        !nuevaCita.procedimiento || p.nombre.toLowerCase().includes(nuevaCita.procedimiento.toLowerCase())
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
                              className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-gray-50 last:border-0"
                              onClick={() => {
                                setNuevaCita({ ...nuevaCita, procedimiento: p.nombre });
                                setCitaProcSearchOpen(false);
                              }}
                            >
                              {p.nombre}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                    {Object.values(procedimientosPorCategoria).every(procs =>
                      procs.every(p => nuevaCita.procedimiento && !p.nombre.toLowerCase().includes(nuevaCita.procedimiento.toLowerCase()))
                    ) && (
                      <div className="px-3 py-4 text-sm text-gray-400 text-center">
                        Sin resultados para "{nuevaCita.procedimiento}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCitaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={addCitaAgenda} disabled={!nuevaCita.fecha} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {editingCitaId ? 'Guardar Cambios' : 'Agregar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nuevo Presupuesto */}
      <Dialog open={presupDialogOpen} onOpenChange={setPresupDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Presupuesto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={presupForm.fecha} onChange={(e) => setPresupForm({ ...presupForm, fecha: e.target.value })} />
            </div>

            {/* Procedimientos */}
            <div>
              <Label className="mb-2 block">Procedimientos</Label>
              <div className="space-y-2 mb-3">
                {presupForm.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <span className="font-medium">{item.nombre}</span>
                    <span className="text-gray-500">
                      x{item.cantidad} — RD$ {(item.cantidad * item.precio).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => removePresupItem(item.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Procedimiento (busqueda) — ancho completo */}
              <div className="relative mb-2" ref={procSearchRef}>
                <Input
                  placeholder="Buscar procedimiento..."
                  value={presupItem.nombre}
                  onChange={(e) => {
                    setPresupItem({ ...presupItem, nombre: e.target.value });
                    setProcSearchOpen(true);
                  }}
                  onFocus={() => setProcSearchOpen(true)}
                />
                {procSearchOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {Object.entries(procedimientosPorCategoria).map(([categoria, procs]) => {
                      const filtrados = procs.filter(p =>
                        !presupItem.nombre || p.nombre.toLowerCase().includes(presupItem.nombre.toLowerCase())
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
                                setPresupItem({ ...presupItem, nombre: p.nombre, precio: p.precioSugerido || 0 });
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
                      procs.every(p => presupItem.nombre && !p.nombre.toLowerCase().includes(presupItem.nombre.toLowerCase()))
                    ) && (
                      <div className="px-3 py-4 text-sm text-gray-400 text-center">
                        Sin resultados para "{presupItem.nombre}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cantidad + Precio en fila */}
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Cant."
                  value={presupItem.cantidad}
                  onChange={(e) => setPresupItem({ ...presupItem, cantidad: parseInt(e.target.value) || 1 })}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Precio"
                  value={presupItem.precio}
                  onChange={(e) => setPresupItem({ ...presupItem, precio: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <Button variant="ghost" size="sm" onClick={addPresupItem} className="mt-2 text-indigo-600" disabled={!presupItem.nombre}>
                + Agregar procedimiento
              </Button>
            </div>

            <div className="text-right font-semibold text-lg">
              Total: RD$ {presupForm.items.reduce((sum, it) => sum + it.cantidad * it.precio, 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={presupForm.notas}
                onChange={(e) => setPresupForm({ ...presupForm, notas: e.target.value })}
                placeholder="Notas del presupuesto..."
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPresupDialogOpen(false)}>Cancelar</Button>
            <Button onClick={savePresupuesto} disabled={presupForm.items.length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Guardar Presupuesto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteHCOpen}
        onOpenChange={(v) => { setConfirmDeleteHCOpen(v); if (!v) setDeleteTargetHC(null); }}
        onConfirm={() => { setConfirmDeleteHCOpen(false); }}
        title="Eliminar historial clínico"
        description="¿Estás seguro de eliminar el historial clínico completo? Esta acción no se puede deshacer."
        confirmText="Sí, eliminar"
        variant="danger"
      />
      <PasswordConfirmDialog
        open={!!deleteTargetHC && !confirmDeleteHCOpen}
        onOpenChange={() => setDeleteTargetHC(null)}
        onConfirm={confirmDeleteHistorial}
        title="Eliminar historial clínico"
        description="Ingresa tu contraseña para eliminar este historial clínico."
      />

      <ConfirmDialog
        open={confirmDeletePresupOpen}
        onOpenChange={(v) => { setConfirmDeletePresupOpen(v); if (!v) setDeleteTargetPresup(null); }}
        onConfirm={() => { setConfirmDeletePresupOpen(false); }}
        title="Eliminar presupuesto"
        description="¿Estás seguro de eliminar este presupuesto?"
        confirmText="Sí, eliminar"
        variant="danger"
      />
      <PasswordConfirmDialog
        open={!!deleteTargetPresup && !confirmDeletePresupOpen}
        onOpenChange={() => setDeleteTargetPresup(null)}
        onConfirm={confirmDeletePresup}
        title="Eliminar presupuesto"
        description="Ingresa tu contraseña para eliminar este presupuesto."
      />

      <ConfirmDialog
        open={agendarConfirmOpen}
        onOpenChange={setAgendarConfirmOpen}
        onConfirm={confirmAgendarPresupuesto}
        title="Agendar citas"
        description={`¿Agendar citas para los ${agendarPresupuestoData?.items?.length || 0} procedimientos de este presupuesto?`}
        confirmText="Sí, agendar"
        variant="confirm"
      />
    </div>
  );
}
