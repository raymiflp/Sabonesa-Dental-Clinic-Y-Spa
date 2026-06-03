# Recordatorios — Auto Trigger Specification

## Purpose

Automatic reminder creation upon appointment scheduling. When `config.recordatorio_auto` is enabled, creating a `POST /api/agenda` triggers immediate reminder sending via `ProviderResolver` and generates a `Recordatorio` with status `'enviado'`.

## Requirements

### Requirement: Trigger automático al crear cita (envío inmediato)

The system MUST, when creating an appointment via `POST /api/agenda`, read `config.recordatorio_auto`. If its value is `'true'`, the system MUST:
1. Look up the `PlantillaRecordatorio` corresponding to the procedure category (or fallback if none exists)
2. Resolve template variables with real patient, appointment, clinic, and doctor data
3. Send the reminder **immediately** via `ProviderResolver` (instead of only creating a pending record)
4. Create a `Recordatorio` with `estado = 'enviado'`, `tipo = 'recordatorio_cita'`, `destinatario = 'paciente'`, `whatsappUrl` generated, and `fechaProgramada = cita.fecha - config.recordatorio_anticipacion` (in days)

> Implementation note: Unlike the original design that only created a pending recordatorio, the actual implementation uses `ProviderResolver` to send the message immediately after creating the appointment, marking the status as `'enviado'`.

#### Scenario: HC-3 Creación de cita dispara recordatorio automático (envío inmediato)

- GIVEN `config.recordatorio_auto = 'true'`
- AND `config.recordatorio_anticipacion = '1'`
- AND the patient has `telefono` and `tieneWhatsapp = true`
- AND the procedure has a category with a template
- WHEN an appointment is created via `POST /api/agenda` with `fecha = "2026-06-05"`
- THEN the reminder is sent **immediately** via `ProviderResolver`
- AND a `Recordatorio` is created with `estado = 'enviado'` (not pending), `whatsappUrl` generated, `fechaProgramada = "2026-06-04"` (fecha - 1 day)
- AND the `mensaje` contains the resolved patient and appointment data

### Requirement: Validación de requisitos del paciente

The system MUST NOT create the automatic reminder if: (a) the patient has no `telefono`, or (b) the patient has `tieneWhatsapp = false`. In these cases, the system MUST log via `console.warn` with the reason.

#### Scenario: EC-4 Paciente sin teléfono

- GIVEN `config.recordatorio_auto = 'true'`
- AND the patient has `telefono = null`
- WHEN an appointment is created
- THEN no `Recordatorio` is created
- AND `console.warn("Recordatorio automático omitido: paciente X sin teléfono")` is emitted

#### Scenario: EC-5 Paciente sin WhatsApp

- GIVEN `config.recordatorio_auto = 'true'`
- AND the patient has `tieneWhatsapp = false`
- WHEN an appointment is created
- THEN no `Recordatorio` is created
- AND `console.warn("Recordatorio automático omitido: paciente X sin WhatsApp")` is emitted

### Requirement: No duplicar recordatorios

The system MUST NOT create a new recordatorio if one already exists for the same `citaId` and `destinatario` (paciente). The system MUST check with `findFirst` before inserting.

#### Scenario: EC-6 Recordatorio ya existe

- GIVEN a `Recordatorio` already exists with `citaId = 5` and `destinatario = 'paciente'`
- WHEN the same appointment trigger runs again
- THEN no duplicate is created
- AND the existing recordatorio is not modified

### Requirement: Desactivación por configuración

The system MUST NOT execute any automatic reminder logic when `config.recordatorio_auto = 'false'`.

#### Scenario: EC-7 recordatorio_auto desactivado

- GIVEN `config.recordatorio_auto = 'false'`
- WHEN an appointment is created
- THEN no automatic reminder logic executes
