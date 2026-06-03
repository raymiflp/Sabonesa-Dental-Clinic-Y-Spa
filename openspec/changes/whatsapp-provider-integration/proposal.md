# Proposal: Integración WhatsApp Provider — Envío Automatizado Real

## Intent

Reemplazar links `wa.me` manuales con envío real automatizado vía WhatsApp Business API (WABA) o Twilio. Hoy los recordatorios solo abren WhatsApp Web con texto pre-llenado — el usuario debe enviar manualmente. Esto inutiliza la automatización. Además, **bug crítico**: recordatorios periódicos (1m/6m) se crean sin `fechaProgramada`, el scheduler nunca los procesa.

## Scope

**In:**
- Strategy Pattern: Provider base + WABA, Twilio, wa.me (legacy)
- 4 archivos nuevos en `backend/src/whatsapp/`
- Modificar scheduler, agenda.js, recordatorios.js (`enviar`/`enviarMasivo`/`generarProgramado`)
- Modificar modelo `Recordatorio`: `+providerMessageId`, `+providerError`, mejorar estados
- **Bug fix**: recordatorios periódicos ahora incluyen `fechaProgramada`
- Seed: `+config` provider_mode y fallback_mode
- Fallback configurable: `on_error` (default), `always`, `never`
- Mantener `whatsappUrl` como campo opcional de respaldo
- Cero cambios en contrato API del frontend

**Out:**
- UI de administración del provider en frontend
- Dashboard de estadísticas de envío
- Webhook de mensajes entrantes

## Capabilities

### New
- `whatsapp-provider`: Abstracción de provider con Strategy Pattern. Resolución dinámica desde config DB, envío real con fetch nativo, fallback automático configurable.

### Modified
- `recordatorios`: `enviar`/`enviarMasivo`/`generarProgramado` usan provider en vez de wa.me directo. Fix `fechaProgramada` en recordatorios periódicos. Nuevos campos en modelo.

## Approach

3 capas: (1) Provider interface `send({telefono, mensaje, paciente}) → {exito, messageId, error}`; (2) Implementaciones WABA (fetch a Graph API), Twilio (fetch nativo), wa.me (genera URL legacy); (3) `ProviderResolver` lee config `provider_mode` de DB y resuelve provider activo + estrategia de fallback. Los controllers llaman al resolver en vez de construir `wa.me` URLs directamente.

## Affected Areas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `backend/src/whatsapp/provider.js` | Nuevo | Provider base + resolver |
| `backend/src/whatsapp/providers/waba.js` | Nuevo | WABA Graph API |
| `backend/src/whatsapp/providers/twilio.js` | Nuevo | Twilio API |
| `backend/src/whatsapp/providers/wa.js` | Nuevo | wa.me legacy |
| `backend/prisma/schema.prisma` | Modificado | +providerMessageId, +providerError |
| `backend/src/scheduler.js` | Modificado | Usa provider |
| `backend/src/controllers/agenda.js` | Modificado | Usa provider en trigger |
| `backend/src/controllers/recordatorios.js` | Modificado | Provider + fix fechaProgramada |
| `backend/prisma/seed.js` | Modificado | +provider_mode, fallback_mode |

## Risks

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| WABA/Twilio API caído | Baja | Fallback auto a wa.me URL |
| Costos no anticipados | Media | Provider configurable, default wa.me |
| Config inválida al iniciar | Baja | Validación temprana con log |
| Breaking changes API | Baja | Contrato REST sin cambios |

## Rollback Plan

1. Schema: eliminar campos nuevos (son opcionales — retrocompatible)
2. Controllers: revertir a construcción directa de `wa.me` URL
3. Provider module: eliminar `backend/src/whatsapp/` completo
4. Seed: remover configs `provider_mode`, `fallback_mode`

## Dependencies

- Node.js v24.11.1 fetch nativo (sin axios ni librerías extra)
- `.env`: `WABA_TOKEN`, `WABA_PHONE_ID`, `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`

## Success Criteria

- [ ] Recordatorio pendiente con `fechaProgramada` se envía automáticamente sin interacción manual
- [ ] Provider falla → fallback a `wa.me` URL según modo configurado
- [ ] Recordatorios periódicos (1m/6m) se crean con `fechaProgramada` correcta y son procesados
- [ ] Todos los endpoints API existentes retornan el mismo contrato que antes
- [ ] Seed incluye `provider_mode = "wa"` (default retrocompatible) y `fallback_mode = "on_error"`
