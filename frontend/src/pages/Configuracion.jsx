import { useState, useEffect } from 'react';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Smartphone, QrCode, RefreshCw, Signal, SignalHigh, WifiOff, MessageCircle, Settings2, Sun } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '@/context/ThemeContext';

export default function Configuracion() {
  // WhatsApp state
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [providerMode, setProviderMode] = useState('manual');
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

  // Tema
  const { theme, setTheme } = useTheme();

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
        setProviderMode(cfg.whatsapp_provider_mode || 'manual');
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

  // Polling del QR cada 5 segundos mientras está en modo web y no conectado
  useEffect(() => {
    if (providerMode !== 'web' || whatsappStatus?.connected || !showQR) return;

    const interval = setInterval(async () => {
      try {
        const data = await api.getWhatsappQr();
        if (data.qr) {
          setQrData(data.qr);
        }
        if (data.connected) {
          // Se conectó mientras tanto
          const status = await api.getWhatsappStatus().catch(() => null);
          if (status) {
            setWhatsappStatus(status);
            setShowQR(false);
            toast.success('¡WhatsApp conectado!');
          }
        }
      } catch (err) {
        console.error('[Configuracion] Error polling QR:', err.message);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [providerMode, whatsappStatus?.connected, showQR]);

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
      setShowQR(false);
      setQrData(null);
      await api.updateWhatsappMode(mode);
      toast.success(`Modo cambiado a ${mode === 'web' ? 'WhatsApp Web' : mode === 'manual' ? 'Link wa.me' : mode}`);
      // Recargar status
      const status = await api.getWhatsappStatus().catch(() => null);
      if (status) setWhatsappStatus(status);
      // Si es modo web, cargar QR — esperar 1.5s para que init() genere el QR
      if (mode === 'web') {
        setShowQR(true);
        setTimeout(loadQR, 1500);
      }
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
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <Settings2 className="w-6 h-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
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
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-muted text-muted-foreground'
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
                <SelectItem value="manual">Manual (genera enlace wa.me, sin enviar)</SelectItem>
                <SelectItem value="web">WhatsApp Web (Baileys) — enviar real</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estado de conexión (solo en modo web) */}
          {providerMode === 'web' && (
            <div className="bg-muted rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Estado de conexión</p>
                  {whatsappStatus?.connected && whatsappStatus?.phoneNumber ? (
                    <p className="text-sm text-green-600 mt-1 dark:text-green-400">
                      ✅ Conectado como <span className="font-semibold">{whatsappStatus.phoneNumber}</span>
                    </p>
                  ) : whatsappStatus?.hasQR ? (
                    <p className="text-sm text-amber-600 mt-1 dark:text-amber-400">
                      ⏳ QR generado — escanea con WhatsApp
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
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
                <div className="border border-border rounded-lg p-4 bg-card text-center">
                  <p className="text-xs text-muted-foreground mb-3">
                    Escanea con WhatsApp → Dispositivos vinculados → Vincular dispositivo
                  </p>
                  <QrImage data={qrData} />
                  <Button variant="ghost" size="sm" className="mt-3 text-muted-foreground"
                    onClick={() => setShowQR(false)}>
                    Ocultar QR
                  </Button>
                </div>
              )}

              {!whatsappStatus?.connected && !qrData && providerMode === 'web' && (
                <p className="text-xs text-muted-foreground">
                  ⚠️ En Railway: genera el QR y escanéalo. La sesión se guarda automáticamente en la base de datos para que persista entre reinicios.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Apariencia ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-500" />
            Apariencia
          </CardTitle>
          <CardDescription>
            Tema visual de la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Tema</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Oscuro</SelectItem>
                <SelectItem value="system">Sistema (automático)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Sistema sigue la preferencia de tu dispositivo.
          </p>
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
              <p className="text-sm text-muted-foreground">
                Enviar mensajes a pacientes con citas próximas
              </p>
            </div>
            <Button
              variant={recordatorioHabilitado ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRecordatorioHabilitado(!recordatorioHabilitado)}
              className={recordatorioHabilitado ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
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
          <div className="border-t border-border pt-4 space-y-4">
            <p className="text-sm font-medium text-foreground">Plantillas de mensajes</p>
            <p className="text-xs text-muted-foreground">
              Variables disponibles: {'{nombre}'}, {'{clinica}'}, {'{fecha}'}, {'{hora}'}, {'{procedimiento}'}
            </p>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Recordatorio de cita</Label>
              <textarea
                className="w-full min-h-[60px] px-3 py-2 text-sm rounded-lg border border-input bg-background resize-y"
                value={plantillaRecordatorio}
                onChange={(e) => setPlantillaRecordatorio(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Confirmación de cita</Label>
              <textarea
                className="w-full min-h-[60px] px-3 py-2 text-sm rounded-lg border border-input bg-background resize-y"
                value={plantillaConfirmacion}
                onChange={(e) => setPlantillaConfirmacion(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Cancelación de cita</Label>
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

      {/* ---- Prueba de WhatsApp ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            Probar Envío
          </CardTitle>
          <CardDescription>
            Envía un mensaje de prueba para verificar que el sistema funciona
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TestSender />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Componente interno para enviar mensaje de prueba
 */
function TestSender() {
  const [telefono, setTelefono] = useState('');
  const [mensaje, setMensaje] = useState('🧪 Mensaje de prueba desde Sabonesa Dental Clinic Y Spa.');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleTest = async () => {
    if (!telefono) return;
    setSending(true);
    setResult(null);
    try {
      const res = await api.testWhatsapp(telefono, mensaje);
      setResult(res);
      if (res.success) {
        toast.success(res.waUrl ? `Link generado: ${res.waUrl}` : 'Mensaje enviado');
      } else {
        toast.error(res.error || 'Error al enviar');
      }
    } catch (err) {
      toast.error('Error de conexión: ' + err.message);
      setResult({ success: false, error: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Número de teléfono (ej: 8095550101)</Label>
        <Input
          placeholder="8095550101"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value.replace(/[^\d]/g, ''))}
        />
      </div>
      <div className="space-y-2">
        <Label>Mensaje de prueba</Label>
        <textarea
          className="w-full min-h-[60px] px-3 py-2 text-sm rounded-lg border border-input bg-background resize-y"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={2}
        />
      </div>
      <Button onClick={handleTest} disabled={sending || !telefono}
        className="bg-green-600 hover:bg-green-700 text-white">
        {sending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Enviando...</>
          : 'Enviar mensaje de prueba'}
      </Button>

      {result && (
        <div className={`p-3 rounded-lg text-sm ${result.success ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
          <p className="font-medium">{result.success ? '✅ Enviado' : '❌ Fallido'}</p>
          {result.waUrl && (
            <a href={result.waUrl} target="_blank" rel="noopener noreferrer"
              className="text-indigo-600 underline text-xs block mt-1">
              Abrir link wa.me
            </a>
          )}
          {result.error && <p className="text-xs mt-1">Error: {result.error}</p>}
          {result.mode && <p className="text-xs text-muted-foreground mt-1">Modo: {result.mode}</p>}
        </div>
      )}
    </div>
  );
}

/**
 * Componente interno para renderizar QR localmente con qrcode.react
 */
function QrImage({ data }) {
  if (!data) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="border-2 border-border rounded-lg overflow-hidden">
        <QRCodeSVG value={data} size={250} />
      </div>
      <p className="text-xs text-muted-foreground max-w-xs break-all font-mono bg-muted p-2 rounded">
        {data}
      </p>
    </div>
  );
}