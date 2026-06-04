import { useState, useEffect } from 'react';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Smartphone, QrCode, RefreshCw, Signal, SignalHigh, WifiOff, MessageCircle, Settings2 } from 'lucide-react';

export default function Configuracion() {
  // WhatsApp state
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [providerMode, setProviderMode] = useState('wa');
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Recordatorio state
  const [recordatorioHabilitado, setRecordatorioHabilitado] = useState(false);
  const [recordatorioHora, setRecordatorioHora] = useState('08:00');
  const [recordatorioAnticipacion, setRecordatorioAnticipacion] = useState('1');
  const [clinicaNombre, setClinicaNombre] = useState('');

  // Plantillas
  const [plantillaRecordatorio, setPlantillaRecordatorio] = useState('');
  const [plantillaConfirmacion, setPlantillaConfirmacion] = useState('');
  const [plantillaCancelacion, setPlantillaCancelacion] = useState('');

  const [saving, setSaving] = useState(false);

  // Cargar configuración
  const loadConfig = async () => {
    try {
      setLoadingStatus(true);
      const [cfg, status] = await Promise.all([
        api.getConfiguracion(),
        api.getWhatsappStatus().catch(() => null),
      ]);

      if (cfg) {
        setRecordatorioHabilitado(cfg.recordatorio_habilitado === 'true');
        setRecordatorioHora(cfg.recordatorio_hora || '08:00');
        setRecordatorioAnticipacion(cfg.recordatorio_anticipacion_dias || '1');
        setClinicaNombre(cfg.clinica_nombre || '');
        setPlantillaRecordatorio(cfg.plantilla_recordatorio || '');
        setPlantillaConfirmacion(cfg.plantilla_confirmacion || '');
        setPlantillaCancelacion(cfg.plantilla_cancelacion || '');
        setProviderMode(cfg.whatsapp_provider_mode || 'wa');
      }

      if (status) {
        setWhatsappStatus(status);
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => { loadConfig(); }, []);

  // Cargar QR
  const loadQR = async () => {
    try {
      const data = await api.getWhatsappQr();
      setQrData(data.qr);
      setShowQR(true);
      if (!data.qr) toast.info(data.message || 'No hay QR disponible');
    } catch (err) {
      toast.error('Error al obtener QR: ' + err.message);
    }
  };

  // Cambiar modo proveedor
  const handleModeChange = async (mode) => {
    try {
      setProviderMode(mode);
      await api.updateWhatsappMode(mode);
      toast.success(`Modo cambiado a ${mode === 'web' ? 'WhatsApp Web' : mode === 'wa' ? 'Link wa.me' : mode}`);
      // Recargar status
      const status = await api.getWhatsappStatus().catch(() => null);
      if (status) setWhatsappStatus(status);
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  // Guardar configuración de recordatorios
  const saveRecordatorioConfig = async () => {
    setSaving(true);
    try {
      await api.updateConfiguracion({
        recordatorio_habilitado: recordatorioHabilitado ? 'true' : 'false',
        recordatorio_hora: recordatorioHora,
        recordatorio_anticipacion_dias: recordatorioAnticipacion,
        clinica_nombre: clinicaNombre,
        plantilla_recordatorio: plantillaRecordatorio,
        plantilla_confirmacion: plantillaConfirmacion,
        plantilla_cancelacion: plantillaCancelacion,
      });
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const desconectar = async () => {
    try {
      await api.disconnectWhatsapp();
      toast.success('WhatsApp desconectado');
      setWhatsappStatus(prev => ({ ...prev, connected: false, phoneNumber: null }));
      setShowQR(false);
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <Settings2 className="w-6 h-6 text-gray-600" />
        <h1 className="text-2xl font-bold text-gray-800">Configuración</h1>
      </div>

      {/* ---- WhatsApp ---- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-500" />
                WhatsApp
              </CardTitle>
              <CardDescription>
                Conexión y proveedor de mensajería
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                whatsappStatus?.connected
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {whatsappStatus?.connected ? (
                  <><SignalHigh className="w-3 h-3" /> Conectado</>
                ) : (
                  <><WifiOff className="w-3 h-3" /> Desconectado</>
                )}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Proveedor */}
          <div className="space-y-2">
            <Label>Proveedor de WhatsApp</Label>
            <Select value={providerMode} onValueChange={handleModeChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wa">Link wa.me (genera enlace, sin enviar)</SelectItem>
                <SelectItem value="web">WhatsApp Web (Baileys) — enviar real</SelectItem>
                <SelectItem value="twilio">Twilio API</SelectItem>
                <SelectItem value="waba">Meta WABA (Business API)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estado de conexión (solo en modo web) */}
          {providerMode === 'web' && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Estado de conexión</p>
                  {whatsappStatus?.phoneNumber ? (
                    <p className="text-sm text-green-600 mt-1">
                      ✅ Conectado como <span className="font-semibold">{whatsappStatus.phoneNumber}</span>
                    </p>
                  ) : whatsappStatus?.hasQR ? (
                    <p className="text-sm text-amber-600 mt-1">
                      ⏳ QR generado — escanea con WhatsApp
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">
                      No hay sesión activa. Genera un QR para conectar.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadQR}>
                    <QrCode className="w-4 h-4 mr-1" />
                    QR
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { loadConfig(); }}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Estado
                  </Button>
                  {whatsappStatus?.connected && (
                    <Button variant="destructive" size="sm" onClick={desconectar}>
                      Desconectar
                    </Button>
                  )}
                </div>
              </div>

              {/* QR display */}
              {showQR && qrData && (
                <div className="border border-gray-200 rounded-lg p-4 bg-white text-center">
                  <p className="text-xs text-gray-400 mb-3">
                    Escanea con WhatsApp → Dispositivos vinculados → Vincular dispositivo
                  </p>
                  <QrImage data={qrData} />
                  <Button variant="ghost" size="sm" className="mt-3 text-gray-400"
                    onClick={() => setShowQR(false)}>
                    Ocultar QR
                  </Button>
                </div>
              )}

              {!whatsappStatus?.connected && !qrData && providerMode === 'web' && (
                <p className="text-xs text-gray-400">
                  ⚠️ En Railway: genera el QR y escanéalo. La sesión se guarda automáticamente en la base de datos para que persista entre reinicios.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Recordatorios Automáticos ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-500" />
            Recordatorios Automáticos
          </CardTitle>
          <CardDescription>
            Envía mensajes de WhatsApp automáticos según la agenda de citas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Activar */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Recordatorios automáticos</Label>
              <p className="text-sm text-gray-500">
                Enviar mensajes a pacientes con citas próximas
              </p>
            </div>
            <Button
              variant={recordatorioHabilitado ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRecordatorioHabilitado(!recordatorioHabilitado)}
              className={recordatorioHabilitado ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {recordatorioHabilitado ? 'Activado' : 'Desactivado'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Anticipación (días antes)</Label>
              <Select value={recordatorioAnticipacion} onValueChange={setRecordatorioAnticipacion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Mismo día</SelectItem>
                  <SelectItem value="1">1 día antes</SelectItem>
                  <SelectItem value="2">2 días antes</SelectItem>
                  <SelectItem value="3">3 días antes</SelectItem>
                  <SelectItem value="7">7 días antes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hora de envío</Label>
              <Input type="time" value={recordatorioHora}
                onChange={(e) => setRecordatorioHora(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nombre de la clínica en mensajes</Label>
            <Input value={clinicaNombre}
              onChange={(e) => setClinicaNombre(e.target.value)}
              placeholder="Sabonesa Dental Clinic Y Spa" />
          </div>

          {/* Plantillas */}
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <p className="text-sm font-medium text-gray-700">Plantillas de mensajes</p>
            <p className="text-xs text-gray-400">
              Variables disponibles: {'{nombre}'}, {'{clinica}'}, {'{fecha}'}, {'{hora}'}, {'{procedimiento}'}
            </p>

            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Recordatorio de cita</Label>
              <textarea
                className="w-full min-h-[60px] px-3 py-2 text-sm rounded-lg border border-input bg-background resize-y"
                value={plantillaRecordatorio}
                onChange={(e) => setPlantillaRecordatorio(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Confirmación de cita</Label>
              <textarea
                className="w-full min-h-[60px] px-3 py-2 text-sm rounded-lg border border-input bg-background resize-y"
                value={plantillaConfirmacion}
                onChange={(e) => setPlantillaConfirmacion(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Cancelación de cita</Label>
              <textarea
                className="w-full min-h-[60px] px-3 py-2 text-sm rounded-lg border border-input bg-background resize-y"
                value={plantillaCancelacion}
                onChange={(e) => setPlantillaCancelacion(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={saveRecordatorioConfig} disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Guardando...</> : 'Guardar configuración'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Componente interno para renderizar QR como DataMatrix usando API pública
 */
function QrImage({ data }) {
  if (!data) return null;
  // Usar API pública de QR
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data)}`;

  return (
    <div className="flex flex-col items-center gap-3">
      <img
        src={qrUrl}
        alt="Código QR de WhatsApp"
        className="border-2 border-gray-100 rounded-lg"
        style={{ width: 250, height: 250 }}
        onError={(e) => {
          // Fallback si la API no está disponible
          e.target.style.display = 'none';
          document.getElementById('qr-fallback')?.classList.remove('hidden');
        }}
      />
      <p id="qr-fallback" className="hidden text-xs text-gray-400 max-w-xs break-all font-mono bg-gray-50 p-2 rounded">
        {data}
      </p>
    </div>
  );
}
