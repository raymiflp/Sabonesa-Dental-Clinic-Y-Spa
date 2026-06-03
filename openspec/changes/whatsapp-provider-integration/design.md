# Design: WhatsApp Provider Integration

## Technical Approach

Strategy Pattern con 3 implementaciones (WABA, Twilio, wa.me) resueltas dinámicamente desde `Configuracion` en DB. `ProviderResolver` inyecta el provider activo en scheduler y controllers. Fallback configurable (`on_error`|`always`|`never`). El contrato REST del frontend no cambia — `whatsappUrl` se mantiene como campo de respaldo.

---

## Architecture Decisions

### ADR-1: Strategy Pattern sobre herencia

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Clase base `Provider` + `send()` abstracto | Cada provider implementa misma interfaz; resolución vía map de strings | ✅ Elegido |
| Herencia con Provider abstracto | Más rígido; difícil agregar providers sin modificar resolver | ❌ Rechazado |
| switch/case en scheduler | Acopla lógica de envío al scheduler, viola SRP | ❌ Rechazado |

**Rationale**: Strategy mantiene cada provider independiente. `ProviderResolver` usa un Map(`provider_mode` → instancia). Agregar un nuevo provider es crear un archivo + registrar en el map.

### ADR-2: Configuración en DB + .env para credenciales

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Solo DB | Todos los valores visibles en API `/api/configuracion` — credenciales expuestas | ❌ Rechazado |
| Solo .env | Requiere deploy para cambiar provider_mode; inconsistente con resto de config | ❌ Rechazado |
| DB (modo/fallback) + .env (tokens) | Claves no sensibles editables desde UI; tokens fuera de la API | ✅ Elegido |

**Rationale**: `provider_mode` y `fallback_mode` se leen de tabla `Configuracion` (editables desde frontend sin deploy). Tokens WABA/Twilio van en `.env` — `ProviderResolver` los lee con `process.env` y los pasa al provider al instanciar.

### ADR-3: Fallback automático configurable

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| `on_error` (default) | Solo cae a wa.me si el provider retorna error | ✅ Elegido |
| `always` | Siempre genera wa.me aunque el envío real funcione | ❌ Opcional |
| `never` | Falla silenciosamente, no genera link | ❌ Opcional |

**Rationale**: `on_error` es el balance óptimo — intenta envío real, falla gracefulmente a wa.me. Los otros modos existen para entornos donde el provider no está configurado o se requiere depuración.

### ADR-4: Fetch nativo sobre axios/node-fetch

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| `fetch` nativo (Node 24) | 0 dependencias, soporte nativo de HTTP/2 | ✅ Elegido |
| `axios` | Interceptors, timeout configurable, pero dependencia extra | ❌ Rechazado |
| `node-fetch` | Deprecado desde Node 18 (nativo disponible) | ❌ Rechazado |

**Rationale**: Node 24 tiene fetch nativo estable. Para timeout envolveremos con `AbortController` — patrón estándar sin librerías.

---

## Data Flow

### Scheduler — tick diario

```
cron tick
  → leer config (recordatorio_auto, provider_mode, fallback_mode)
  → Recordatorio.findMany({ estado: 'pendiente', fechaProgramada: hoy })
  → for each:
      → ProviderResolver.sendWithFallback({ telefono, mensaje })

sendWithFallback():
  → provider = resolver.getActive()          // waba | twilio | wa
  → if provider === wa:
      → generar wa.me URL, success=true
  → else:
      → result = await provider.send(...)
      → if result.success:
          → UPDATE estado='enviado', providerMessageId, enviadoEn
      → else if fallback_mode === 'on_error':
          → generar wa.me URL en whatsappUrl
          → UPDATE estado='pendiente', whatsappUrl, providerError
      → else if fallback_mode === 'always':
          → (wa.me generado junto al envío real)
      → else (never):
          → UPDATE estado='fallido', providerError
```

### Trigger — agenda.create()

```
POST /api/agenda
  → crear Cita (existente)
  → si recordatorio_auto=true AND paciente.tieneWhatsapp AND telefono:
      → resolverTemplate() → mensaje
      → calcular fechaProgramada = cita.fecha - anticipacion
      → verificar duplicado (citaId + destinatario)
      → provider = ProviderResolver.getActive()
      → result = await provider.send({ telefono, mensaje })
      → si success:
          → Recordatorio.create({ estado: 'enviado', providerMessageId })
      → si fail:
          → Recordatorio.create({ estado: 'pendiente', whatsappUrl: wa.me fallback })
```

### enviar() y enviarMasivo()

Ambos endpoints ahora llaman a `ProviderResolver.sendWithFallback()` en vez de construir `wa.me` URLs directamente. La respuesta al frontend incluye `whatsappUrl` (como hasta ahora) más `providerMessageId` si el envío real fue exitoso.

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/whatsapp/provider.js` | Create | `ProviderResolver` + interfaz base |
| `backend/src/whatsapp/providers/waba.js` | Create | WhatsApp Business Cloud API via fetch |
| `backend/src/whatsapp/providers/twilio.js` | Create | Twilio API via fetch |
| `backend/src/whatsapp/providers/wa.js` | Create | Legacy wa.me URL generator |
| `backend/prisma/schema.prisma` | Modify | +`providerMessageId`, +`providerError` en Recordatorio |
| `backend/src/scheduler.js` | Modify | Usa `ProviderResolver` en vez de wa.me directo |
| `backend/src/controllers/agenda.js` | Modify | Trigger post-create usa provider |
| `backend/src/controllers/recordatorios.js` | Modify | `enviar`/`enviarMasivo`/`generarProgramado` usan provider; fix fechaProgramada en periódicos |
| `backend/prisma/seed.js` | Modify | +6 config keys (provider_mode, fallback_mode, +4 credenciales placeholder) |

---

## Interfaces / Contracts

### Provider Interface

```js
// backend/src/whatsapp/provider.js

/**
 * @typedef {Object} SendResult
 * @property {boolean} success
 * @property {string|null} providerMessageId
 * @property {string|null} error
 * @property {string|null} waUrl
 */

export class WhatsAppProvider {
  /**
   * @param {{ telefono: string, mensaje: string, paciente?: Object }} params
   * @returns {Promise<SendResult>}
   */
  async send({ telefono, mensaje, paciente }) {
    throw new Error('Not implemented');
  }
}
```

### ProviderResolver

```js
export class ProviderResolver {
  constructor(prisma) { this.prisma = prisma; this.cache = null; }

  async getActive() {
    const config = await this.prisma.configuracion.findUnique({
      where: { clave: 'whatsapp_provider_mode' }
    });
    const mode = config?.valor || 'wa';
    return this.buildProvider(mode);
  }

  buildProvider(mode) {
    const providers = {
      waba: () => new WabaProvider(WABA_TOKEN, WABA_PHONE_ID),
      twilio: () => new TwilioProvider(TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM),
      wa: () => new WaProvider(),
    };
    return (providers[mode] || providers.wa)();
  }

  async sendWithFallback({ telefono, mensaje, paciente }) {
    const provider = await this.getActive();
    const result = await provider.send({ telefono, mensaje, paciente });
    if (result.success) return result;

    const fallbackCfg = await this.prisma.configuracion.findUnique({
      where: { clave: 'whatsapp_fallback_mode' }
    });
    const mode = fallbackCfg?.valor || 'on_error';

    if (mode === 'never') return result;

    // Fallback genera wa.me URL
    const waProvider = new WaProvider();
    return waProvider.send({ telefono, mensaje });
  }
}
```

### Schema Change

```prisma
model Recordatorio {
  ...existing fields...
  providerMessageId  String?   // ID del mensaje en WABA/Twilio
  providerError      String?   // Mensaje de error del provider externo
}
```

---

## Testing Strategy

Sin test runner en el proyecto. Verificación manual:

| Capa | Qué verificar | Cómo |
|------|--------------|------|
| Provider wa | Genera wa.me URL correcta | `send()` con wa mode — verificar URL |
| ProviderResolver | Resuelve provider según config DB | Cambiar `provider_mode` en BD, ver instancia retornada |
| Fallback | `on_error` cae a wa.me cuando provider falla | Mockear WABA para que falle, verificar whatsappUrl generado |
| Scheduler | Recordatorios pendientes se procesan con provider | Ejecutar `procesarLote()` manual, verificar estados |
| Trigger | Agenda.create() crea recordatorio vía provider | POST /api/agenda, ver tabla Recordatorio |
| enviarMasivo | Envío secuencial no bloqueante | Llamar endpoint con múltiples citas, verificar resultados |
| Seed | Config keys se crean con defaults | Ejecutar seed, verificar tabla Configuracion |

---

## Migration / Rollout

1. `npx prisma db push` (campos opcionales — 0 migración de datos)
2. Agregar variables al `.env` (waba_token, twilio_sid, etc.)
3. Seed configuración: `provider_mode='wa'`, `fallback_mode='on_error'` (retrocompatible)
4. Sin feature flag — `provider_mode='wa'` mantiene comportamiento actual

**Rollback**: schema retrocompatible (campos opcionales). Para revertir: cambiar `provider_mode` a `'wa'` en DB. Eliminar `backend/src/whatsapp/` después de verificar que no hay referencias.

---

## Open Questions

- [ ] ¿Validar credenciales WABA/Twilio al iniciar servidor con un `ping`?
- [ ] WABA rate limit: ¿implementar cola de mensajes con reintentos en próximo tick?
- [ ] En recordatorios periódicos (1m/6m), el fix de `fechaProgramada` debe calcularse como `hoy + intervalo` al crearse desde `generarProgramado` — confirmar lógica.

---

## ADR Index

| ADR | Decisión |
|-----|----------|
| ADR-1 | Strategy Pattern sobre herencia |
| ADR-2 | Config modo/fallback en DB, credenciales en .env |
| ADR-3 | Fallback `on_error` por defecto |
| ADR-4 | Fetch nativo (AbortController para timeout) |
