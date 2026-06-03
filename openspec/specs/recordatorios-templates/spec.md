# Recordatorios — Templates Specification

## Purpose

Personalized message templates per procedure category (`PlantillaRecordatorio`) with seed defaults, CRUD API, and frontend administration panel. Templates support `{{paciente}}`, `{{fecha}}`, `{{hora}}`, `{{clinica}}`, `{{doctor}}` variables.

## Requirements

### Requirement: PlantillaRecordatorio Model

The system MUST include a `PlantillaRecordatorio` model in Prisma schema with fields: `id` (autoincremental Int), `categoriaProcedimientoId` (Int, unique, FK → `CategoriaProcedimiento` with cascade delete), `mensaje` (String with `{{paciente}}`, `{{fecha}}`, `{{hora}}`, `{{clinica}}`, `{{doctor}}` variable support), `activo` (Boolean, default `true`), `createdAt` (DateTime). The `CategoriaProcedimiento` model MUST have an optional relation `plantillaRecordatorio?`.

#### Scenario: Schema Applied

- GIVEN Prisma schema with PlantillaRecordatorio model
- WHEN `npx prisma db push` executes
- THEN the `PlantillaRecordatorio` table is created with all fields and FK constraint

### Requirement: Seed de templates por defecto

The seed MUST populate one template for each of the 9 procedure categories. Each template MUST use the available variables to build a category-specific message. If a category has no template (e.g., a newly created category), the system SHOULD use the generic fallback message.

#### Scenario: HC-2 Seed completo

- GIVEN a fresh database after migration
- WHEN seed executes
- THEN 9 `PlantillaRecordatorio` records exist, one per `CategoriaProcedimiento`
- AND each has `activo = true` and a distinct, category-relevant `mensaje`

#### Scenario: Categoría nueva sin template seed

- GIVEN a new `CategoriaProcedimiento` created via API
- AND no `PlantillaRecordatorio` exists for that category
- WHEN a procedure of that category is scheduled
- THEN the system uses the generic fallback message

### Requirement: CRUD de templates via API

The system MUST expose REST endpoints: `GET /api/recordatorios/templates` (list all with category join), `PUT /api/recordatorios/templates/:id` (update `mensaje` and/or `activo`), and `POST /api/recordatorios/templates/:id/restaurar` (restore message to seed default). The `:id` parameter references the `PlantillaRecordatorio` internal ID.

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/api/recordatorios/templates` | GET | — | `[{id, categoriaProcedimientoId, categoriaNombre, mensaje, activo}]` |
| `/api/recordatorios/templates/:id` | PUT | `{ mensaje, activo }` | Updated template or 404 |
| `/api/recordatorios/templates/:id/restaurar` | POST | — | Template with restored message or 404 |

#### Scenario: HC-1 Template existe para la categoría

- GIVEN a procedure with `categoriaId = 3 (Periodoncia)`
- AND a `PlantillaRecordatorio` with `mensaje = "Hola {{paciente}}, tu cita de Periodoncia es el {{fecha}} a las {{hora}}"`
- WHEN the system resolves the template
- THEN the message has variables replaced with real patient, appointment, and clinic data
- AND the final message reflects the specific category

#### Scenario: EC-1 Template no existe (fallback)

- GIVEN a procedure whose `categoriaId` has no associated `PlantillaRecordatorio`
- WHEN the system tries to resolve the template
- THEN it returns the generic fallback message

#### Scenario: EC-2 Variable mal escrita

- GIVEN a template with `mensaje = "Hola {{pacient}} (typo)"`
- WHEN the system resolves variables
- THEN `{{pacient}}` remains as literal text
- AND no error is thrown

### Requirement: Frontend — Panel de administración de templates

The frontend MUST display a "Plantillas" tab in the Recordatorios page. It MUST include: (a) a table with all categories and their current template (truncated to ~80 chars); (b) an edit modal (Dialog) with a Textarea for the message; (c) clickable variable chips (`{{paciente}}`, `{{fecha}}`, `{{hora}}`, `{{clinica}}`, `{{doctor}}`) that insert at cursor position; (d) live preview below the textarea with example values; (e) "Restaurar predeterminado" button per row; (f) Active toggle (switch). The UI MUST handle Loading (skeleton), Empty ("No hay plantillas disponibles"), Error (toast alert), and edge case where category has no template ("Usa mensaje genérico").

#### Scenario: CA5 Panel de templates funcional

- GIVEN the Recordatorios page
- WHEN the "Plantillas" tab is clicked
- THEN a table with all categories and their templates is displayed
- AND editing a template via the modal saves changes successfully
- AND restoring defaults works with confirmation
