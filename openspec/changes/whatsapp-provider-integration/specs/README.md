# Specs — WhatsApp Provider Integration

Reemplaza links `wa.me` manuales con envío real automatizado vía Strategy Pattern (WABA, Twilio, wa.me legacy). Los recordatorios se envían con fetch nativo desde el backend, sin depender de que el usuario abra WhatsApp manualmente.

## Domains cubiertos

| Domain | Tipo | Requerimientos |
|--------|------|----------------|
| `whatsapp-provider` | Nuevo | 6 |
| `scheduler` | Modificado | 4 |
| `agenda-trigger` | Modificado | 2 |
| `recordatorios` | Modificado | 4 |
| `modelo-recordatorio` | Modificado | 2 |
| `configuracion` | Modificado | 7 |

---

## 1. whatsapp-provider

## Requisitos Funcionales

### R1.1 — Provider interface con Strategy Pattern

El sistema **MUST** definir una interfaz abstracta `WhatsAppProvider` con un único método `async send({ telefono, mensaje, paciente })` que retorne `{ exito: boolean, messageId: string|null, error: string|null }`.

El sistema **MUST** proveer un `ProviderResolver` que lea `config.whatsapp_provider_mode` de la tabla `Configuracion` y retorne la implementación correspondiente:
- `'waba'` → instancia de WABAProvider
- `'twilio'` → instancia de TwilioProvider
- `'wa'` → instancia de WaMeProvider (legacy)

El resolver **MUST** implementar un método `async sendWithFallback({ telefono, mensaje, paciente })` que:
1. Intente enviar con el provider activo.
2. Si falla y `fallback_mode` es `'on_error'`, intente con WaMeProvider.
3. Si `fallback_mode` es `'always'`, genere wa.me URL paralela siempre (opcional, log).
4. Si `fallback_mode` es `'never'`, retorne el error sin fallback.

El resolver **SHOULD** cachear la instancia del provider activo por request (no instanciar en cada `send`).

### R1.2 — Modo wa.me legacy (integrado)

El sistema **MUST** mantener `WaMeProvider` como implementación integrada. Su método `send` **MUST**:
1. Construir URL `https://wa.me/{telefono}?text={mensaje_codificado}`.
2. Retornar `{ exito: true, messageId: null, error: null }` (no hace fetch real, solo genera la URL).
3. Registrar `mensaje` y `whatsappUrl` en el recordatorio.

Este provider **MUST** ser el default cuando `whatsapp_provider_mode = 'wa'`.

### R1.3 — Modo WABA (WhatsApp Business Cloud API)

El sistema **MUST** implementar `WABAProvider` que use **fetch nativo** (sin axios) para llamar a `https://graph.facebook.com/v22.0/{phone_id}/messages` con:
- `Authorization: Bearer {token}` (leído de config `whatsapp_waba_token`)
- Body JSON: `{ "messaging_product": "whatsapp", "to": "{telefono}", "type": "text", "text": { "body": "{mensaje}" } }`

El `send` **MUST** retornar `{ exito: true, messageId: response.messages[0].id, error: null }` en éxito (HTTP 200/201).

El `send` **MUST** retornar `{ exito: false, messageId: null, error: response.error.message }` en error de Graph API (HTTP 4xx/5xx).

El `send` **MUSTN'T** usar SDK ni librerías externas — solo `fetch` global (Node.js 24.11+).

### R1.4 — Modo Twilio

El sistema **MUST** implementar `TwilioProvider` que use **fetch nativo** para llamar a `https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json` con:
- Basic Auth: `{sid}:{token}` (leído de config `whatsapp_twilio_sid` + `whatsapp_twilio_token`)
- Body URL-encoded: `To=whatsapp:{telefono}`, `From=whatsapp:{from}`, `Body={mensaje}`

El `send` **MUST** retornar `{ exito: true, messageId: response.sid, error: null }` en éxito (HTTP 201).

El `send` **MUST** retornar `{ exito: false, messageId: null, error: response.message }` en error (HTTP 4xx/5xx).

El `send` **MUSTN'T** usar SDK ni librerías externas — solo `fetch` global.

### R1.5 — Fallback automático configurable

| Modo fallback | Comportamiento |
|---------------|----------------|
| `on_error` | Provider activo falla → intenta wa.me (legacy). Si wa.me también falla, error final. |
| `always` | Siempre genera wa.me URL en paralelo (opcional, solo log si el provider real falla). |
| `never` | No hay fallback. Si el provider activo falla, el error se propaga al caller. |

El valor default **MUST** ser `'on_error'`.

### R1.6 — Configuración desde DB

El resolver **MUST** leer en cada request (sin cache) las claves `whatsapp_provider_mode` y `whatsapp_fallback_mode` desde la tabla `Configuracion` para permitir cambios en caliente.

Si `whatsapp_provider_mode` no existe en la tabla, el resolver **MUST** usar `'wa'` como default (retrocompatible).

Si `whatsapp_fallback_mode` no existe, el resolver **MUST** usar `'on_error'` como default.

## Escenarios

### HC-1: Provider activo resuelve correctamente desde config

- **GIVEN** `config.whatsapp_provider_mode = 'twilio'`
- **AND** `config.whatsapp_twilio_sid`, `whatsapp_twilio_token`, `whatsapp_twilio_from` existen y son válidos
- **WHEN** el `ProviderResolver` resuelve el provider activo
- **THEN** retorna una instancia de `TwilioProvider`
- **AND** `TwilioProvider.send()` llama a Twilio API con fetch nativo
- **AND** retorna `{ exito: true, messageId: "SM..." }` en éxito

### HC-2: wa.me legacy como provider default

- **GIVEN** `config.whatsapp_provider_mode` no existe en la tabla
- **WHEN** el `ProviderResolver` resuelve el provider activo
- **THEN** retorna una instancia de `WaMeProvider`
- **AND** `WaMeProvider.send()` retorna `{ exito: true, messageId: null }` sin hacer fetch

### HC-3: Fallback on_error — WABA falla, wa.me toma control

- **GIVEN** `config.whatsapp_provider_mode = 'waba'`
- **AND** `config.whatsapp_fallback_mode = 'on_error'`
- **AND** WABA Graph API retorna HTTP 500 (servidor caído)
- **WHEN** `resolver.sendWithFallback()` se ejecuta
- **THEN** primer intento falla con `{ exito: false, error: "Graph API error..." }`
- **AND** segundo intento (fallback) ejecuta `WaMeProvider.send()`
- **AND** el resultado final incluye `fallbackUsado: true`
- **AND** se genera `whatsappUrl` con `https://wa.me/...`

### HC-4: WABA envía mensaje exitosamente

- **GIVEN** `config.whatsapp_provider_mode = 'waba'`
- **AND** token y phone-id son válidos
- **AND** `telefono = "18095551234"` es un número válido de WhatsApp
- **WHEN** `WABAProvider.send({ telefono, mensaje, paciente })`
- **THEN** fetch a Graph API retorna HTTP 200 con `{ messages: [{ id: "wamid.123" }] }`
- **AND** el método retorna `{ exito: true, messageId: "wamid.123", error: null }`

### EC-1: Provider caído / timeout

- **GIVEN** `config.whatsapp_provider_mode = 'twilio'`
- **AND** `fallback_mode = 'on_error'`
- **AND** Twilio API no responde (timeout o DNS failure)
- **WHEN** `resolver.sendWithFallback()` se ejecuta
- **THEN** el fetch lanza una excepción de red (no HTTP response)
- **AND** se captura como error con mensaje "Network timeout / fetch failed"
- **AND** el fallback wa.me se ejecuta
- **AND** el recordatorio se crea con `providerError` conteniendo el error original

### EC-2: Número inválido

- **GIVEN** `whatsapp_provider_mode = 'waba'`
- **AND** `telefono = "000"` (número inválido)
- **WHEN** `WABAProvider.send()` se ejecuta
- **THEN** Graph API retorna HTTP 400 con `{ error: { message: "(#100) Invalid parameter" } }`
- **AND** el método retorna `{ exito: false, error: "(#100) Invalid parameter" }`
- **AND** si `fallback_mode = 'on_error'`, se ejecuta fallback a wa.me

### EC-3: Modo fallback 'never' con provider fallando

- **GIVEN** `config.whatsapp_provider_mode = 'waba'`
- **AND** `config.whatsapp_fallback_mode = 'never'`
- **AND** WABA retorna HTTP 500
- **WHEN** `resolver.sendWithFallback()` se ejecuta
- **THEN** el error de WABA se propaga directamente
- **AND** NO se intenta wa.me como fallback
- **AND** el recordatorio queda en `estado = 'fallido'` con `providerError`

### EC-4: Token expirado

- **GIVEN** `config.whatsapp_provider_mode = 'waba'`
- **AND** `whatsapp_waba_token` es un token expirado
- **WHEN** `WABAProvider.send()` se ejecuta
- **THEN** Graph API retorna HTTP 401 con `{ error: { message: "Error validating access token" } }`
- **AND** el método retorna `{ exito: false, error: "Error validating access token" }`
- **AND** NO se reintenta con el mismo token

### EC-5: Modo 'waba' sin token configurado

- **GIVEN** `config.whatsapp_provider_mode = 'waba'`
- **AND** `config.whatsapp_waba_token` no existe en la tabla
- **WHEN** `WABAProvider` se instancia
- **THEN** lanza un error de configuración: "WABA token no configurado (whatsapp_waba_token)"
- **AND** el resolver captura el error y ejecuta fallback según `fallback_mode`

---

## 2. scheduler (Modificado)

## Requisitos Funcionales

### R2.1 — Scheduler usa provider activo

El scheduler **MUST** usar `ProviderResolver.sendWithFallback()` en lugar de construir wa.me URLs directamente dentro del cron tick.

El flujo actual que hace:
```
const whatsappUrl = `${WA_BASE}/${tel}?text=...`
await prisma.recordatorio.update({ data: { estado: 'enviado', whatsappUrl } })
```

**MUST** reemplazarse por:
```
const provider = new ProviderResolver(prisma);
const resultado = await provider.sendWithFallback({ telefono, mensaje, paciente });
// resultado.exito ? marcar enviado : marcar fallido
```

### R2.2 — Registrar providerMessageId tras envío exitoso

Si `sendWithFallback()` retorna `exito: true` y `messageId` no es nulo, el scheduler **MUST** persistir `providerMessageId` en el `Recordatorio`.

### R2.3 — Registrar providerError si el envío falla

Si `sendWithFallback()` retorna `exito: false`, el scheduler **MUST** persistir `providerError` con el mensaje de error y marcar el recordatorio como `estado = 'fallido'`.

### R2.4 — Estado 'enviado' solo si provider confirma

El scheduler **MUST NOT** marcar un recordatorio como `'enviado'` a menos que `sendWithFallback()` retorne `exito: true`. Si el provider falla y no hay fallback, el estado **MUST** ser `'fallido'`.

## Escenarios

### HC-5: Scheduler envía recordatorio exitosamente con WABA

- **GIVEN** `config.whatsapp_provider_mode = 'waba'`
- **AND** un `Recordatorio` con `estado = 'pendiente'` y `fechaProgramada = hoy`
- **AND** el paciente tiene `tieneWhatsapp = true` y `telefono` válido
- **WHEN** el scheduler procesa el lote
- **THEN** `WABAProvider.send()` retorna éxito con `messageId = "wamid.456"`
- **AND** el recordatorio se actualiza a `estado = 'enviado'`
- **AND** `providerMessageId = "wamid.456"`
- **AND** `enviadoEn` tiene la fecha/hora actual
- **AND** `whatsappUrl` contiene la URL wa.me generada por el fallback o provider

### EC-6: Provider falla, recordatorio marcado como fallido

- **GIVEN** `config.whatsapp_provider_mode = 'waba'`
- **AND** `config.whatsapp_fallback_mode = 'never'`
- **AND** WABA API retorna error
- **WHEN** el scheduler procesa el recordatorio
- **THEN** `sendWithFallback()` retorna `{ exito: false, error: "..." }`
- **AND** el recordatorio se actualiza a `estado = 'fallido'`
- **AND** `providerError` contiene el mensaje de error
- **AND** `estado` NO es `'enviado'`

### EC-7: Fallback on_error en scheduler

- **GIVEN** `config.whatsapp_provider_mode = 'twilio'`
- **AND** `config.whatsapp_fallback_mode = 'on_error'`
- **AND** Twilio API retorna error
- **WHEN** el scheduler procesa el recordatorio
- **THEN** primer intento falla → fallback wa.me se ejecuta
- **AND** `resultado.fallbackUsado = true`
- **AND** el recordatorio se marca como `'enviado'` con `whatsappUrl` generada
- **AND** `providerError` contiene el error de Twilio (para auditoría)

### EC-8: Recordatorio sin paciente asociado

- **GIVEN** un `Recordatorio` con `pacienteId = null` (huérfano)
- **AND** `fechaProgramada = hoy`
- **WHEN** el scheduler procesa el lote
- **THEN** el scheduler salta ese recordatorio con log `[scheduler] Saltado #N: sin paciente asociado`
- **AND** no se lanza excepción
- **AND** el resto del lote continúa procesándose

---

## 3. agenda-trigger (Modificado)

## Requisitos Funcionales

### R3.1 — Trigger usa provider activo al crear cita

Al crear una cita (`POST /api/agenda`), si `config.recordatorio_auto = 'true'`, el trigger **MUST** crear un `Recordatorio` y además intentar enviarlo mediante `ProviderResolver.sendWithFallback()`.

Este es un **cambio respecto al comportamiento actual**: hoy solo crea el recordatorio en `estado = 'pendiente'` con una URL wa.me. El nuevo flujo **MUST** intentar el envío real inmediato.

### R3.2 — Fallback del trigger: pendiente + wa.me URL

Si `sendWithFallback()` falla, el trigger **MUST**:
1. Crear el `Recordatorio` con `estado = 'pendiente'` (para que el scheduler lo reintente)
2. Incluir `whatsappUrl` con la URL wa.me como fallback
3. Incluir `providerError` con el error original
4. No bloquear la creación de la cita (error no bloqueante)

## Escenarios

### HC-6: Trigger envía recordatorio exitosamente

- **GIVEN** `config.recordatorio_auto = 'true'`
- **AND** `config.whatsapp_provider_mode = 'waba'`
- **AND** WABA API responde exitosamente
- **AND** paciente tiene teléfono y WhatsApp
- **WHEN** se crea una cita via `POST /api/agenda`
- **THEN** se crea un `Recordatorio` con `estado = 'enviado'`
- **AND** `providerMessageId` contiene el ID del mensaje de WABA
- **AND** la cita se retorna con HTTP 201 (sin errores)

### EC-9: Trigger falla, recordatorio pendiente con fallback

- **GIVEN** `config.recordatorio_auto = 'true'`
- **AND** `config.whatsapp_provider_mode = 'waba'`
- **AND** WABA API retorna error (token expirado)
- **AND** `fallback_mode = 'on_error'`
- **WHEN** se crea una cita via `POST /api/agenda`
- **THEN** el recordatorio se crea con `estado = 'pendiente'`
- **AND** `whatsappUrl` contiene la URL wa.me generada
- **AND** `providerError` contiene el error de WABA
- **AND** la cita se retorna HTTP 201 (error no bloqueante)
- **AND** se emite `console.warn` con el error

---

## 4. recordatorios controllers (Modificado)

## Requisitos Funcionales

### R4.1 — enviar() usa provider activo

`POST /api/recordatorios/enviar` **MUST** usar `ProviderResolver.sendWithFallback()` en lugar de construir wa.me directamente.

El flujo actual crea un `Recordatorio` con `estado = 'pendiente'` y una URL wa.me. El nuevo flujo **MUST**:
1. Intentar envío real vía provider activo.
2. Si éxito → `estado = 'enviado'`, `providerMessageId` seteado.
3. Si falla + fallback → `estado = 'enviado'` con `whatsappUrl` wa.me.
4. Si falla + no fallback → `estado = 'fallido'`, `providerError` seteado.

### R4.2 — enviarMasivo() usa provider activo

`POST /api/recordatorios/enviar-masivo` **MUST** usar `ProviderResolver.sendWithFallback()` en lugar de construir wa.me directamente.

Misma lógica de estados que `enviar()`.

### R4.3 — generarProgramado incluye fechaProgramada (BUG FIX)

`POST /api/recordatorios/generar-programado` **MUST** incluir `fechaProgramada` en el `Recordatorio` creado.

**Contexto (bug actual):** El endpoint crea un recordatorio periódico (`recordatorio_1m` o `recordatorio_6m`) sin setear `fechaProgramada`. Esto hace que el scheduler nunca lo procese porque filtra por `fechaProgramada = hoy`.

El fix: al crear el recordatorio, **MUST** calcular `fechaProgramada` basado en `proximoEn` del body o en la fecha actual si no se provee.

### R4.4 — Respuesta al frontend mantiene compatibilidad

Todos los endpoints **MUST** seguir incluyendo `whatsappUrl` en la respuesta, incluso si ahora se genera por el provider en lugar de calcularse en el controller.

**Esto es crítico:** el frontend actual usa `response.whatsappUrl` para abrir WhatsApp Web. Si se elimina, el frontend se rompe.

## Escenarios

### HC-7: enviar() con WABA exitoso

- **GIVEN** `whatsapp_provider_mode = 'waba'`
- **AND** WABA responde exitosamente
- **WHEN** `POST /api/recordatorios/enviar` con `{ citaId, destinatario: 'paciente' }`
- **THEN** el recordatorio se crea con `estado = 'enviado'`
- **AND** `providerMessageId = "wamid.789"`
- **AND** `whatsappUrl` está presente en la respuesta
- **AND** la respuesta mantiene el mismo contrato que antes (`{ recordatorio, whatsappUrl }`)

### HC-8: generarProgramado con fechaProgramada (BUG FIX)

- **GIVEN** `POST /api/recordatorios/generar-programado` con `{ pacienteId: 1, intervalo: 1, proximoEn: "2026-07-01" }`
- **WHEN** se ejecuta el endpoint
- **THEN** el `Recordatorio` creado tiene `fechaProgramada = "2026-07-01"`
- **AND** `estado = 'pendiente'`
- **AND** el scheduler puede procesarlo en esa fecha

### EC-10: generarProgramado sin proximoEn

- **GIVEN** `POST /api/recordatorios/generar-programado` con `{ pacienteId: 1, intervalo: 1 }` (sin `proximoEn`)
- **WHEN** se ejecuta el endpoint
- **THEN** retorna HTTP 400 con `{ error: "Faltan datos: pacienteId, intervalo (1|6), proximoEn" }`
- **AND** no se crea ningún recordatorio

### EC-11: enviarMasivo con recordatorio_auto = false

- **GIVEN** `config.recordatorio_auto = 'false'`
- **WHEN** `POST /api/recordatorios/enviar-masivo`
- **THEN** retorna HTTP 400 con `{ error: "Envío automático desactivado" }`
- **AND** no se ejecuta ningún provider

---

## 5. modelo-recordatorio (Modificado)

## Requisitos Funcionales

### R5.1 — Nuevo campo opcional `providerMessageId`

El modelo `Recordatorio` **MUST** incluir un nuevo campo opcional:
- `providerMessageId` de tipo `String?`

Propósito: almacenar el ID devuelto por WABA (`wamid.xxx`) o Twilio (`SMxxx`) tras un envío exitoso.

### R5.2 — Nuevo campo opcional `providerError`

El modelo `Recordatorio` **MUST** incluir un nuevo campo opcional:
- `providerError` de tipo `String?`

Propósito: almacenar el mensaje de error textual si el envío falla (timeout, token inválido, número inválido, etc.).

### Reglas de estado

La máquina de estados del `Recordatorio` queda:

```
pendiente → enviado (provider confirma envío exitoso, con o sin fallback)
pendiente → fallido (provider falla y fallback_mode = 'never')
fallido → pendiente (reintento manual o del scheduler)
```

Cuando `estado = 'enviado'` y `providerMessageId = null`, significa que se usó wa.me legacy (no hay ID de proveedor real).

Cuando `estado = 'fallido'`, `providerError` **SHOULD** contener el error para diagnóstico.

## Escenarios

### HC-9: Recordatorio enviado con messageId de WABA

- **GIVEN** un envío exitoso via `WABAProvider`
- **WHEN** el recordatorio se persiste
- **THEN** `providerMessageId = "wamid.abc123"`
- **AND** `whatsappUrl` también se guarda
- **AND** `providerError = null`

### HC-10: Recordatorio enviado con wa.me legacy

- **GIVEN** `whatsapp_provider_mode = 'wa'`
- **WHEN** `WaMeProvider.send()` se ejecuta
- **THEN** `providerMessageId = null`
- **AND** `providerError = null`
- **AND** `whatsappUrl = "https://wa.me/..."`

### HC-11: Recordatorio fallido con error guardado

- **GIVEN** un envío fallido via provider activo sin fallback
- **WHEN** el recordatorio se persiste
- **THEN** `estado = 'fallido'`
- **AND** `providerError = "(#100) Invalid parameter"` (o el error correspondiente)
- **AND** `providerMessageId = null`

---

## 6. configuracion (Modificado)

## Requisitos Funcionales

### R6.1 — Nueva clave `whatsapp_provider_mode`

| Campo | Valor |
|-------|-------|
| clave | `whatsapp_provider_mode` |
| valor | `'wa'` (default), `'waba'`, `'twilio'` |

### R6.2 — Nueva clave `whatsapp_fallback_mode`

| Campo | Valor |
|-------|-------|
| clave | `whatsapp_fallback_mode` |
| valor | `'on_error'` (default), `'always'`, `'never'` |

### R6.3 — Nueva clave `whatsapp_waba_token`

| Campo | Valor |
|-------|-------|
| clave | `whatsapp_waba_token` |
| valor | Token de acceso de Meta Graph API (string, opcional) |

### R6.4 — Nueva clave `whatsapp_waba_phone_id`

| Campo | Valor |
|-------|-------|
| clave | `whatsapp_waba_phone_id` |
| valor | Phone Number ID de Meta Business (string, opcional) |

### R6.5 — Nueva clave `whatsapp_twilio_sid`

| Campo | Valor |
|-------|-------|
| clave | `whatsapp_twilio_sid` |
| valor | Account SID de Twilio (string, opcional) |

### R6.6 — Nueva clave `whatsapp_twilio_token`

| Campo | Valor |
|-------|-------|
| clave | `whatsapp_twilio_token` |
| valor | Auth Token de Twilio (string, opcional) |

### R6.7 — Nueva clave `whatsapp_twilio_from`

| Campo | Valor |
|-------|-------|
| clave | `whatsapp_twilio_from` |
| valor | Número de origen Twilio en formato `+1XXXXXXXXXX` (string, opcional) |

### Seed

El seed **MUST** incluir `whatsapp_provider_mode = 'wa'` y `whatsapp_fallback_mode = 'on_error'` en la config default para garantizar retrocompatibilidad total.

## Escenarios

### HC-12: Seed incluye nuevas configs

- **GIVEN** el seed se ejecuta en BD vacía
- **WHEN** se completa migración + seed
- **THEN** existen las configs `whatsapp_provider_mode = 'wa'` y `whatsapp_fallback_mode = 'on_error'`
- **AND** los demás valores de config existentes no se alteran

### HC-13: Cambio en caliente de provider

- **GIVEN** el servidor está corriendo con `whatsapp_provider_mode = 'wa'`
- **WHEN** un admin cambia via API `config.whatsapp_provider_mode = 'twilio'`
- **AND** luego se llama a `enviar()`
- **THEN** el resolver lee el nuevo valor de la tabla (sin cache)
- **AND** usa `TwilioProvider` en la siguiente request

### EC-12: Modo provider inválido en config

- **GIVEN** `config.whatsapp_provider_mode = 'telegram'` (valor no soportado)
- **WHEN** el resolver intenta resolver el provider
- **THEN** loggea `[provider] Modo no soportado: "telegram", usando default "wa"`
- **AND** retorna `WaMeProvider`
- **AND** no lanza excepción

---

## Criterios de Aceptación Globales

| # | Criterio | Dominio |
|---|----------|---------|
| CA1 | Provider activo se resuelve desde config DB sin cache | provider |
| CA2 | WABA envía mensaje real con fetch nativo, sin SDK | provider |
| CA3 | Twilio envía mensaje real con fetch nativo, sin SDK | provider |
| CA4 | Fallback on_error: provider falla → wa.me URL se genera | provider |
| CA5 | Fallback never: provider falla → error se propaga sin wa.me | provider |
| CA6 | Scheduler usa provider en vez de wa.me directo | scheduler |
| CA7 | Scheduler registra providerMessageId o providerError según resultado | scheduler |
| CA8 | Scheduler nunca marca 'enviado' si provider no confirma | scheduler |
| CA9 | Recordatorio sin paciente se salta sin crash | scheduler |
| CA10| Trigger en agenda intenta envío real, no bloquea si falla | agenda-trigger |
| CA11| enviar() y enviarMasivo() usan provider activo | recordatorios |
| CA12| generarProgramado() incluye fechaProgramada (BUG FIX) | recordatorios |
| CA13| whatsappUrl sigue presente en todas las respuestas API | recordatorios |
| CA14| providerMessageId y providerError son campos opcionales | modelo |
| CA15| Seed incluye provider_mode='wa' y fallback_mode='on_error' como default | config |
| CA16| Modo inválido en config no causa crash, cae a wa | config |
