# Recordatorios Specification

## Purpose

Existing reminder endpoints (`enviar`, `enviarMasivo`, `getPendientes`) refactored to use personalized templates from `PlantillaRecordatorio` and respect `tieneWhatsapp` filtering.

## Requirements

### Requirement: enviar y enviarMasivo usan templates

The `POST /api/recordatorios/enviar` and `POST /api/recordatorios/enviar-masivo` endpoints MUST use the template corresponding to the procedure category (via `resolverTemplate()` from `helpers/resolverTemplate.js`) instead of hardcoded messages. When `destinatario === 'paciente'`, the system resolves `cita.procedimiento` → `Procedimiento.findFirst({nombre})` → `categoria.nombre` → `PlantillaRecordatorio`. The `'doctor'` destinatario remains unchanged.

#### Scenario: HC-5 enviar usa template de categoría

- GIVEN an appointment with a procedure in category "Ortodoncia"
- AND a `PlantillaRecordatorio` exists for that category
- WHEN `POST /api/recordatorios/enviar` is called with `{ citaId, destinatario: 'paciente' }`
- THEN the `mensaje` in the created recordatorio uses the Ortodoncia template with resolved variables
- AND the message is NOT the original hardcoded one

#### Scenario: EC-12 enviar sin template existente (fallback)

- GIVEN an appointment whose procedure category has no template
- WHEN `POST /api/recordatorios/enviar` is called
- THEN the generated message is the generic fallback (same as the current hardcoded message)

### Requirement: enviarMasivo respeta recordatorio_auto

The `enviarMasivo` endpoint MUST verify `config.recordatorio_auto` before processing. If `'false'`, the endpoint MUST return a 400 error with message "Envío automático desactivado".

#### Scenario: HC-6 enviarMasivo con recordatorio_auto = true

- GIVEN `config.recordatorio_auto = 'true'`
- AND there are appointments for tomorrow
- WHEN `POST /api/recordatorios/enviar-masivo` is called
- THEN appointments are processed and recordatorios are created with template-based messages (or generic fallback)
- AND `tieneWhatsapp` is respected per patient

#### Scenario: EC-11 enviarMasivo con recordatorio_auto = false

- GIVEN `config.recordatorio_auto = 'false'`
- WHEN `POST /api/recordatorios/enviar-masivo` is called
- THEN a 400 error with "Envío automático desactivado" is returned
- AND no records are created

### Requirement: getPendientes filtra por tieneWhatsapp

The `GET /api/recordatorios/pendientes` endpoint SHOULD filter returned appointments to include only patients with `tieneWhatsapp = true`. The filtering MAY be done in the Prisma `where` clause or as a post-query. Periodic reminders MUST also be filtered. The response structure `{ citas, periodicos }` MUST NOT break.
