# Tasks — WhatsApp Provider Integration

> Generado desde: proposal.md, specs/README.md, design.md  
> Fecha: 2026-06-02  
> Estimación total: ~390 líneas  
> Review Workload Forecast: 390 líneas — **Chained PRs recommended: No** (under 400, riesgo medio)

---

## Fase 1: Fundación (Modelo + Config)

### T1 — Migración Prisma: agregar providerMessageId y providerError

- **Dependencias**: ninguna
- **Archivos a modificar**: `backend/prisma/schema.prisma`
- **Descripción**: Agregar dos campos opcionales al modelo `Recordatorio` para persistir el ID del mensaje devuelto por el provider externo y el mensaje de error si el envío falla.
- **Criterios de aceptación**:
  - [x] `Recordatorio.providerMessageId` existe como `String?` (opcional)
  - [x] `Recordatorio.providerError` existe como `String?` (opcional)
  - [x] `npx prisma db push` ejecuta sin errores
  - [x] Campos existentes (`whatsappUrl`, `estado`, `enviadoEn`, etc.) no se modifican
  - [x] Migración retrocompatible: datos existentes no se pierden
- **Estimación**: ~5 líneas
- **Riesgo**: bajo

```prisma
// En model Recordatorio, después de enviadoEn:
providerMessageId  String?   // ID del mensaje en WABA (wamid.xxx) o Twilio (SMxxx)
providerError      String?   // Mensaje de error textual del provider externo
```

---

### T2 — Seed: agregar claves de configuración del provider

- **Dependencias**: T1
- **Archivos a modificar**: `backend/prisma/seed.js`
- **Descripción**: Agregar `whatsapp_provider_mode = 'wa'` y `whatsapp_fallback_mode = 'on_error'` al array `configDefault` en el seed. El valor `'wa'` garantiza retrocompatibilidad total (mismo comportamiento actual). Los valores de credenciales (tokens) no van en seed — van en `.env`.
- **Criterios de aceptación**:
  - [x] `whatsapp_provider_mode` existe en seed con valor `'wa'`
  - [x] `whatsapp_fallback_mode` existe en seed con valor `'on_error'`
  - [x] Configuraciones existentes (`doctor_nombre`, `recordatorio_auto`, etc.) no se alteran
  - [x] `console.log` de resumen al final del seed muestra ahora `Config: 8 valores` (eran 6)
- **Estimación**: ~5 líneas
- **Riesgo**: bajo

```js
// Agregar al array configDefault:
{ clave: 'whatsapp_provider_mode', valor: 'wa' },
{ clave: 'whatsapp_fallback_mode', valor: 'on_error' },
```

---

## Fase 2: Provider Layer

### T3 — Crear provider.js: interfaz base + ProviderResolver

- **Dependencias**: T1
- **Archivos a crear**: `backend/src/whatsapp/provider.js`
- **Descripción**: Implementar la clase base `WhatsAppProvider` con método `send()` abstracto y la clase `ProviderResolver` que:
  1. Lee `whatsapp_provider_mode` de tabla `Configuracion` (sin cache, cada request)
  2. Resuelve el provider activo mediante un Map (`'waba'` → WabaProvider, `'twilio'` → TwilioProvider, `'wa'` → WaProvider)
  3. Implementa `sendWithFallback()` con lógica de fallback configurable (`on_error`, `always`, `never`)
  4. Si el modo no es soportado, loggea warning y cae a `'wa'` (graceful degradation)
  5. Cachea instancia del provider activo solo por request (no instanciar en cada send)
- **Criterios de aceptación**:
  - [x] `WhatsAppProvider` es clase exportable con método `async send()` que lanza `'Not implemented'`
  - [x] `ProviderResolver.getActive()` retorna instancia correcta según `whatsapp_provider_mode` en DB
  - [x] `ProviderResolver.sendWithFallback()` implementa los 3 modos de fallback
  - [x] Modo inválido (ej. `'telegram'`) loggea warning y retorna WaMeProvider sin crash
  - [x] Si `whatsapp_provider_mode` no existe en DB, usa `'wa'` como default
  - [x] Si `whatsapp_fallback_mode` no existe, usa `'on_error'` como default
- **Estimación**: ~80 líneas
- **Riesgo**: medio (orquestación del fallback)

```js
// Provider Interface
export class WhatsAppProvider {
  async send({ telefono, mensaje, paciente }) {
    throw new Error('Not implemented');
  }
}

// ProviderResolver
export class ProviderResolver {
  constructor(prisma) { this.prisma = prisma; }

  async getActive() { /* lee config, resuelve provider */ }
  async sendWithFallback({ telefono, mensaje, paciente }) { /* fallback logic */ }
}
```

---

### T4 — Crear providers/wa.js: implementación legacy wa.me

- **Dependencias**: T3
- **Archivos a crear**: `backend/src/whatsapp/providers/wa.js`
- **Descripción**: Implementar `WaMeProvider` que extiende `WhatsAppProvider`. Su `send()`:
  1. Limpia el teléfono (solo dígitos)
  2. Construye URL `https://wa.me/{telefono}?text={mensaje_codificado}`
  3. Retorna `{ exito: true, messageId: null, error: null, waUrl: url }` — sin fetch real
- **Criterios de aceptación**:
  - [x] Extiende `WhatsAppProvider` e implementa `send()`
  - [x] No realiza fetch HTTP (solo genera URL)
  - [x] `exito` es siempre `true`
  - [x] `messageId` es siempre `null`
  - [x] `waUrl` contiene la URL wa.me completa y codificada
  - [x] Teléfono se limpia con `.replace(/[^\d]/g, '')`
- **Estimación**: ~25 líneas
- **Riesgo**: bajo

---

### T5 — Crear providers/waba.js: implementación WhatsApp Business Cloud API

- **Dependencias**: T3
- **Archivos a crear**: `backend/src/whatsapp/providers/waba.js`
- **Descripción**: Implementar `WabaProvider` que usa fetch nativo (Node 24) + `AbortController` para timeout (10s). Llama a `https://graph.facebook.com/v22.0/{phone_id}/messages` con:
  - `Authorization: Bearer {token}` — leído de `process.env.WABA_TOKEN`
  - Phone ID — leído de `process.env.WABA_PHONE_ID`
  - Body JSON con `messaging_product`, `to`, `type: "text"`, `text.body`
- **Criterios de aceptación**:
  - [x] Extiende `WhatsAppProvider` e implementa `send()`
  - [x] Usa fetch nativo — **sin axios, node-fetch, ni SDK**
  - [x] Timeout de 10s con `AbortController`
  - [x] HTTP 200/201 → `{ exito: true, messageId: response.messages[0].id, error: null }`
  - [x] HTTP 4xx/5xx → `{ exito: false, messageId: null, error: response.error.message }`
  - [x] Error de red/timeout → captura como `{ exito: false, error: "mensaje descriptivo" }`
  - [x] Falta token/phone_id → lanza `new Error("WABA token no configurado")`
  - [x] Logging de request/response en consola para depuración
- **Estimación**: ~60 líneas
- **Riesgo**: medio (API externa, manejo de errores de Graph API)

---

### T6 — Crear providers/twilio.js: implementación Twilio API

- **Dependencias**: T3
- **Archivos a crear**: `backend/src/whatsapp/providers/twilio.js`
- **Descripción**: Implementar `TwilioProvider` que usa fetch nativo + `AbortController` (10s timeout). Llama a `https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json` con:
  - Basic Auth: `{sid}:{token}` — de `process.env.TWILIO_SID` y `process.env.TWILIO_TOKEN`
  - Body URL-encoded: `To=whatsapp:{telefono}`, `From=whatsapp:{from}`, `Body={mensaje}`
  - `from` de `process.env.TWILIO_FROM`
- **Criterios de aceptación**:
  - [x] Extiende `WhatsAppProvider` e implementa `send()`
  - [x] Usa fetch nativo — **sin axios, node-fetch, ni SDK de Twilio**
  - [x] Timeout de 10s con `AbortController`
  - [x] Body se envía como `application/x-www-form-urlencoded` (no JSON)
  - [x] HTTP 201 → `{ exito: true, messageId: response.sid, error: null }`
  - [x] HTTP 4xx/5xx → `{ exito: false, messageId: null, error: response.message }`
  - [x] Error de red → captura como error
  - [x] Falta configuración (sid/token/from) → lanza `new Error("Twilio ... no configurado")`
  - [x] Teléfono se pasa como `whatsapp:+1XXXXXXXXXX` (con prefijo)
- **Estimación**: ~65 líneas
- **Riesgo**: medio (API externa, URL-encoding manual, Basic Auth con fetch)

---

## Fase 3: Scheduler

### T7 — Modificar scheduler.js para usar ProviderResolver

- **Dependencias**: T3, T4, T5, T6
- **Archivos a modificar**: `backend/src/scheduler.js`
- **Descripción**: Reemplazar la construcción directa de URLs wa.me en `procesarLote()` con llamadas a `ProviderResolver.sendWithFallback()`.
  1. Importar `ProviderResolver` desde `../whatsapp/provider.js`
  2. Instanciar `ProviderResolver` con `prisma`
  3. Llamar a `sendWithFallback()` en lugar de armar `WA_BASE + telefono + text`
  4. Según resultado:
     - `exito: true` + `messageId` → estado `'enviado'`, guardar `providerMessageId`, `whatsappUrl` (si existe)
     - `exito: true` + `messageId: null` (wa.me) → estado `'enviado'`, guardar solo `whatsappUrl`
     - `exito: false` → estado `'fallido'`, guardar `providerError`
  5. El `WA_BASE` constante ya no es necesario (se puede eliminar o mantener para compatibilidad)
- **Criterios de aceptación**:
  - [x] `ProviderResolver` se importa y se usa en `procesarLote()`
  - [x] Recordatorio sin paciente (huérfano) se salta con log y no crashea el lote
  - [x] `providerMessageId` se persiste si el provider retorna uno
  - [x] `providerError` se persiste si el envío falla
  - [x] `whatsappUrl` se persiste si el provider retorna una URL (wa.me fallback)
  - [x] Estado `'enviado'` solo si `exito: true`
  - [x] Estado `'fallido'` si `exito: false` y no hay fallback
  - [x] Logging muestra qué provider se usó y si hubo fallback
- **Estimación**: ~25 líneas modificadas
- **Riesgo**: medio (cambio en lógica crítica de envío)

---

## Fase 4: Agenda Trigger

### T8 — Modificar agenda.js: trigger de creación usa provider

- **Dependencias**: T3, T4, T5, T6
- **Archivos a modificar**: `backend/src/controllers/agenda.js`
- **Descripción**: Reemplazar la construcción directa de URL wa.me en el trigger post-create (líneas 100-114) con `ProviderResolver.sendWithFallback()`. El flujo nuevo:
  1. Instanciar `ProviderResolver`
  2. Llamar a `sendWithFallback()` para intentar envío real
  3. Si éxito → crear `Recordatorio` con `estado: 'enviado'`, `providerMessageId`
  4. Si falla → crear `Recordatorio` con `estado: 'pendiente'`, `whatsappUrl` wa.me, `providerError`
  5. Error de provider **nunca bloquea** la creación de la cita (error no bloqueante, `console.warn`)
- **Criterios de aceptación**:
  - [x] `ProviderResolver` se importa y se usa en el trigger
  - [x] Si provider envía éxito → recordatorio se crea `'enviado'` con `providerMessageId`
  - [x] Si provider falla con `fallback_mode = 'on_error'` → wa.me URL en `whatsappUrl`, estado `'pendiente'`
  - [x] Si provider falla con `fallback_mode = 'never'` → estado `'fallido'`, `providerError` seteado
  - [x] La cita siempre se retorna HTTP 201, incluso si el trigger falla
  - [x] `console.warn` registra errores de provider sin interrumpir respuesta
  - [x] La comprobación de duplicado (línea 95-98) se mantiene intacta
- **Estimación**: ~35 líneas modificadas
- **Riesgo**: medio (cambio en flujo de creación de citas)

---

## Fase 5: Recordatorios Controllers

### T9 — Modificar recordatorios.js: enviar() y enviarMasivo() usan provider

- **Dependencias**: T3, T4, T5, T6
- **Archivos a modificar**: `backend/src/controllers/recordatorios.js`
- **Descripción**: Reemplazar la construcción directa de URLs wa.me en ambos endpoints con `ProviderResolver.sendWithFallback()`.
  - **`enviar()`** (líneas 112-126): en vez de crear recordatorio con estado `'pendiente'` + wa.me URL, ahora:
    1. Instanciar `ProviderResolver`, llamar `sendWithFallback()`
    2. Si éxito → `estado: 'enviado'`, guardar `providerMessageId` si existe
    3. Si falla + fallback → `estado: 'enviado'` con `whatsappUrl` wa.me, `providerError` registrado
    4. Si falla + no fallback → `estado: 'fallido'`, `providerError`
    5. **Respuesta al frontend siempre incluye `whatsappUrl`** (compatibilidad crítica)
  - **`enviarMasivo()`** (líneas 218-231): misma lógica, procesamiento secuencial sin bloqueo
- **Criterios de aceptación**:
  - [x] `ProviderResolver` se importa y se usa en ambos endpoints
  - [x] `enviar()` retorna `whatsappUrl` en la respuesta siempre (mismo contrato)
  - [x] `enviar()` con WABA exitoso → `providerMessageId` se guarda, estado `'enviado'`
  - [x] `enviar()` con fallback on_error → `whatsappUrl` wa.me, estado `'enviado'`
  - [x] `enviarMasivo()` procesa cada cita secuencialmente sin bloqueo
  - [x] `enviarMasivo()` respeta config `recordatorio_auto` (retorna 400 si false)
  - [x] Duplicados (ya enviados) se detectan y saltan
  - [x] Logging en cada envío (éxito/falla)
- **Estimación**: ~55 líneas modificadas
- **Riesgo**: medio (contrato API debe mantenerse idéntico)

---

### T10 — Bug fix: generarProgramado() incluye fechaProgramada

- **Dependencias**: T1 (el campo existe en schema)
- **Archivos a modificar**: `backend/src/controllers/recordatorios.js`
- **Descripción**: Corregir el bug crítico por el cual `POST /api/recordatorios/generar-programado` crea recordatorios periódicos sin `fechaProgramada`, haciendo que el scheduler nunca los procese.
  1. Al crear el `Recordatorio` (línea 259-267), agregar `fechaProgramada: proximoEn` en los datos
  2. Mantener la validación existente: si `!proximoEn` retorna 400
- **Criterios de aceptación**:
  - [x] `fechaProgramada` se setea con el valor de `proximoEn` recibido en el body
  - [x] Si `proximoEn` no se envía, retorna HTTP 400 (validación existente se mantiene)
  - [x] El recordatorio periódico ahora es visible al scheduler en la fecha programada
  - [x] El resto del flujo (creación en tabla, actualización de HC) no se modifica
- **Estimación**: ~3 líneas modificadas
- **Riesgo**: bajo

```js
// Antes (bug):
const recordatorio = await req.prisma.recordatorio.create({
  data: {
    pacienteId: Number(pacienteId),
    tipo: ...,
    destinatario: 'paciente',
    mensaje: msg,
    estado: 'pendiente',
    // ← falta fechaProgramada
  }
});

// Después (fix):
const recordatorio = await req.prisma.recordatorio.create({
  data: {
    pacienteId: Number(pacienteId),
    tipo: ...,
    destinatario: 'paciente',
    mensaje: msg,
    estado: 'pendiente',
    fechaProgramada: proximoEn,  // ← FIX
  }
});
```

---

## Resumen de Archivos

| Archivo | Acción | Tarea | Líneas aprox |
|---------|--------|-------|-------------|
| `backend/prisma/schema.prisma` | Modificar | T1 | +5 |
| `backend/prisma/seed.js` | Modificar | T2 | +5 |
| `backend/src/whatsapp/provider.js` | Crear | T3 | +80 |
| `backend/src/whatsapp/providers/wa.js` | Crear | T4 | +25 |
| `backend/src/whatsapp/providers/waba.js` | Crear | T5 | +60 |
| `backend/src/whatsapp/providers/twilio.js` | Crear | T6 | +65 |
| `backend/src/scheduler.js` | Modificar | T7 | ~25 |
| `backend/src/controllers/agenda.js` | Modificar | T8 | ~35 |
| `backend/src/controllers/recordatorios.js` | Modificar | T9 + T10 | ~55 + 3 |
| **Total** | | | **~390 líneas** |

## Dependencias entre tareas

```
T1 ──→ T2
  │
  └──→ T3 ──→ T4
         │     T5
         │     T6
         │
         ├──→ T7
         ├──→ T8
         └──→ T9
T1 ──→ T10 (independiente de provider layer)
```

## Review Workload Forecast

| Métrica | Valor |
|---------|-------|
| Líneas nuevas totales | ~230 (4 archivos nuevos) |
| Líneas modificadas totales | ~160 (4 archivos existentes) |
| **Total** | **~390 líneas** |
| Archivos involucrados | 4 nuevos + 4 modificados = 8 |
| **Chained PRs recommended** | **No** (under 400 lines) |
| Riesgo general | Medio — 3 tareas con riesgo medio (T3, T7, T8, T9) |

## Orden de implementación sugerido

1. T1 (schema) + T2 (seed) — en paralelo
2. T3 (provider.js) — bloqueante para todo el provider layer
3. T4, T5, T6 — en paralelo (independientes entre sí, dependen de T3)
4. T7 (scheduler) — después de T3..T6
5. T8 (agenda) — después de T3..T6
6. T9 (recordatorios) — después de T3..T6
7. T10 (bug fix) — puede hacerse en cualquier momento después de T1, incluso en paralelo con T3..T9
