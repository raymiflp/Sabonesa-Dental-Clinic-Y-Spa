# Specs — Recordatorios Personalizados y Automáticos

## Domains cubiertos

| Domain | Tipo | Requerimientos |
|--------|------|----------------|
| `recordatorios-templates` | Nuevo | 3 |
| `recordatorios-auto-trigger` | Nuevo | 2 |
| `recordatorios-scheduler` | Nuevo | 2 |
| `recordatorios` | Modificado | 2 (modificados) |

---

# 1. recordatorios-templates

## Requisitos Funcionales

### R1.1 Modelo PlantillaRecordatorio

El sistema **MUST** incluir una tabla `PlantillaRecordatorio` en Prisma con los campos: `id` (autoincremental), `categoriaProcedimientoId` (FK → `CategoriaProcedimiento`, único), `mensaje` (String, texto con soporte de variables `{{paciente}}`, `{{fecha}}`, `{{hora}}`, `{{clinica}}`, `{{doctor}}`), `activo` (Boolean, default `true`).

### R1.2 Seed de templates por defecto

El seed **MUST** poblar un template por cada una de las 9 categorías de procedimiento. Cada template **MUST** usar las variables disponibles para construir un mensaje específico para esa categoría. Si una categoría no tiene template (nueva categoría creada después del seed), el sistema **SHOULD** usar el mensaje genérico actual como fallback.

### R1.3 CRUD de templates via API

El sistema **MUST** exponer endpoints REST para listar (`GET /api/recordatorios/templates`), actualizar (`PUT /api/recordatorios/templates/:id`) y restaurar predeterminado (`POST /api/recordatorios/templates/:id/restaurar`) las plantillas. El endpoint de actualización **MUST** aceptar `mensaje` y `activo`. El endpoint de restaurar **MUST** reemplazar el mensaje actual por el valor del seed correspondiente. Los endpoints usan el `id` interno de `PlantillaRecordatorio` (no el `categoriaProcedimientoId`).

> **Nota de implementación**: El diseño original contemplaba un endpoint por `categoriaId` (`/:categoriaId`). La implementación real usa el `id` interno del template y no incluye un endpoint dedicado para obtener por categoría.

### R1.4 Frontend — Panel de administración de templates

El frontend **MUST** mostrar una nueva pestaña "Plantillas" (o "Templates") en la página Recordatorios. **MUST** incluir: (a) tabla con todas las categorías y su template actual; (b) editor inline o modal para editar el mensaje; (c) preview en vivo con variables reemplazadas por valores de ejemplo; (d) botón "Restaurar predeterminado" por fila.

## Escenarios

### HC-1: Template existe para la categoría del procedimiento

- **GIVEN** un procedimiento con `categoriaId = 3 (Periodoncia)`
- **AND** existe `PlantillaRecordatorio` con `mensaje = "Hola {{paciente}}, tu cita de Periodoncia es el {{fecha}} a las {{hora}}"`
- **WHEN** el sistema resuelve el template
- **THEN** retorna el mensaje con las variables reemplazadas por los datos reales del paciente, cita y clínica
- **AND** el mensaje final refleja la categoría específica

### HC-2: Seed de templates completo

- **GIVEN** el seed se ejecuta en una BD vacía
- **WHEN** se completa la migración + seed
- **THEN** existen 9 registros en `PlantillaRecordatorio`, uno por cada `CategoriaProcedimiento`
- **AND** cada uno tiene `activo = true` y un `mensaje` distinto y relevante a su categoría

### EC-1: Template no existe (fallback)

- **GIVEN** un procedimiento con `categoriaId` que no tiene `PlantillaRecordatorio` asociada
- **WHEN** el sistema intenta obtener el template
- **THEN** retorna `null`
- **AND** el caller usa el mensaje genérico actual (`"🦷 *Betty Dental*\n\nHola *{paciente}* 👋\nTe recordamos que tienes una cita..."`)

### EC-2: Variable mal escrita no se reemplaza

- **GIVEN** un template con `mensaje = "Hola {{pacient}} (error typo)"`
- **WHEN** el sistema resuelve variables
- **THEN** `{{pacient}}` se deja literal en el mensaje final
- **AND** no se lanza ningún error

### EC-3: Categoría nueva sin template seed

- **GIVEN** se crea una nueva `CategoriaProcedimiento` "Odontología Deportiva" via API
- **AND** no existe `PlantillaRecordatorio` para esa categoría
- **WHEN** se agenda un procedimiento de esa categoría
- **THEN** el sistema usa el mensaje genérico de fallback

---

# 2. recordatorios-auto-trigger

## Requisitos Funcionales

### R2.1 Trigger automático al crear cita (envío inmediato)

El sistema **MUST**, al crear una cita via `POST /api/agenda`, leer `config.recordatorio_auto`. Si su valor es `'true'`, **MUST**:
1. Buscar el `PlantillaRecordatorio` correspondiente a la categoría del procedimiento de la cita (o fallback genérico si no existe)
2. Resolver las variables del template con los datos reales del paciente, cita, clínica y doctor
3. Enviar el recordatorio **inmediatamente** via `ProviderResolver` (en lugar de solo crear un registro pendiente)
4. Crear un `Recordatorio` con `estado = 'enviado'`, `tipo = 'recordatorio_cita'`, `destinatario = 'paciente'`, `whatsappUrl` generada, y `fechaProgramada = cita.fecha - config.recordatorio_anticipacion` (en días)

> **Nota de implementación**: A diferencia del diseño original que solo creaba un recordatorio pendiente, la implementación real utiliza `ProviderResolver` para enviar el mensaje inmediatamente después de crear la cita, marcando el estado como `'enviado'`.

### R2.2 Validación de requisitos del paciente

El sistema **MUST NOT** crear el recordatorio automático si: (a) el paciente no tiene `telefono`, o (b) el paciente tiene `tieneWhatsapp = false`. En esos casos, **MUST** registrar un log (console.warn) indicando el motivo.

### R2.3 No duplicar recordatorios

El sistema **MUST NOT** crear un nuevo recordatorio si ya existe un `Recordatorio` para la misma `citaId` con el mismo `destinatario` (paciente). **MUST** verificar con `findFirst` antes de insertar.

## Escenarios

### HC-3: Creación de cita dispara recordatorio automático (envío inmediato)

- **GIVEN** `config.recordatorio_auto = 'true'`
- **AND** `config.recordatorio_anticipacion = '1'`
- **AND** el paciente tiene `telefono` y `tieneWhatsapp = true`
- **AND** el procedimiento tiene categoría con template
- **WHEN** se crea una cita via `POST /api/agenda` con `fecha = "2026-06-05"`
- **THEN** se envía el recordatorio **inmediatamente** via `ProviderResolver`
- **AND** se crea un `Recordatorio` con `estado = 'enviado'` (no pendiente), `whatsappUrl` generada, `fechaProgramada = "2026-06-04"` (fecha - 1 día)
- **AND** el `mensaje` contiene los datos resueltos del paciente y la cita

### EC-4: Paciente sin teléfono — no crea recordatorio

- **GIVEN** `config.recordatorio_auto = 'true'`
- **AND** el paciente tiene `telefono = null`
- **WHEN** se crea una cita
- **THEN** no se crea ningún `Recordatorio`
- **AND** se emite `console.warn("Recordatorio automático omitido: paciente X sin teléfono")`

### EC-5: Paciente sin WhatsApp — no crea recordatorio

- **GIVEN** `config.recordatorio_auto = 'true'`
- **AND** el paciente tiene `tieneWhatsapp = false`
- **WHEN** se crea una cita
- **THEN** no se crea ningún `Recordatorio`
- **AND** se emite `console.warn("Recordatorio automático omitido: paciente X sin WhatsApp")`

### EC-6: Recordatorio ya existe para la misma cita

- **GIVEN** ya existe un `Recordatorio` con `citaId = 5` y `destinatario = 'paciente'`
- **WHEN** se crea la misma cita (o se reintenta el trigger)
- **THEN** no se crea un duplicado
- **AND** el recordatorio existente no se modifica

### EC-7: recordatorio_auto desactivado

- **GIVEN** `config.recordatorio_auto = 'false'`
- **WHEN** se crea una cita
- **THEN** no se ejecuta ninguna lógica de recordatorio automático

---

# 3. recordatorios-scheduler

## Requisitos Funcionales

### R3.1 Inicialización del scheduler (ejecución cada minuto)

El sistema **MUST**, al iniciar el servidor Express (`index.js`), registrar un cron job usando `node-cron`. El cron **MUST** ejecutarse **cada minuto** (`* * * * *`) en lugar de a una hora configurada. Al ejecutarse, el handler **MUST** leer todas las configuraciones actuales (incluyendo `recordatorio_hora`) en cada tick para reflejar cambios en caliente.

> **Nota de implementación**: El diseño original especificaba una ejecución diaria a la hora configurada (`config.recordatorio_hora`). La implementación real ejecuta el scheduler cada minuto para simplificar el reinicio de cron y permitir que los cambios de configuración surtan efecto inmediatamente sin reiniciar el servidor. Cada tick lee `config.recordatorio_hora` para determinar si debe procesar o no.

### R3.2 Ejecución del scheduler

En cada tick, el scheduler **MUST**:
1. Leer `config.recordatorio_auto`. Si es `'false'`, abortar sin ejecutar nada.
2. Buscar `Recordatorio` con `estado = 'pendiente'` y `fechaProgramada <= hoy` (lte — menor o igual a la fecha actual en formato ISO `YYYY-MM-DD`). Esto garantiza que recordatorios cuya fecha programada ya pasó también sean procesados.

> **Nota de implementación**: El diseño original especificaba una comparación exacta (`fechaProgramada = hoy`). La implementación real usa `lte` (less than or equal) para procesar recordatorios atrasados que no se hayan enviado por cualquier motivo, ofreciendo mayor tolerancia a fallos.
3. Para cada recordatorio encontrado, verificar que el paciente asociado tenga `tieneWhatsapp = true` y `telefono` no vacío.
4. Si el paciente cumple: generar `whatsappUrl` (URL wa.me con mensaje codificado), actualizar el recordatorio a `estado = 'enviado'`, `enviadoEn = new Date()`, `whatsappUrl = url_generada`.
5. Si el paciente no cumple: marcar como `estado = 'fallido'` o registrar log (el comportamiento exacto **SHOULD** ser configurable; por defecto, log + saltar).

## Escenarios

### HC-4: Scheduler envía recordatorios pendientes (cada minuto, query lte)

- **GIVEN** `config.recordatorio_auto = 'true'`
- **AND** el scheduler se ejecuta **cada minuto** (`* * * * *`)
- **AND** existen 3 `Recordatorio` con `estado = 'pendiente'` y `fechaProgramada <= '2026-06-02'`
- **AND** los 3 pacientes tienen `tieneWhatsapp = true`
- **WHEN** el cron ejecuta (en cualquier minuto)
- **THEN** los 3 recordatorios cambian a `estado = 'enviado'`
- **AND** cada uno tiene `whatsappUrl` con formato `https://wa.me/{telefono}?text={mensaje_codificado}`
- **AND** `enviadoEn` tiene la fecha/hora actual

### EC-8: No hay recordatorios pendientes con fechaProgramada <= hoy

- **GIVEN** `config.recordatorio_auto = 'true'`
- **AND** no hay `Recordatorio` con `fechaProgramada <= '2026-06-02'` y `estado = 'pendiente'`
- **WHEN** el cron ejecuta
- **THEN** no se modifica ningún registro
- **AND** no se lanza error

### EC-9: recordatorio_auto = false en scheduler

- **GIVEN** `config.recordatorio_auto = 'false'`
- **WHEN** el cron ejecuta
- **THEN** no se ejecuta ninguna lógica (aborta temprano)

### EC-10: Paciente sin WhatsApp en scheduler

- **GIVEN** un `Recordatorio` pendiente para hoy
- **AND** el paciente asociado tiene `tieneWhatsapp = false`
- **WHEN** el cron ejecuta
- **THEN** el recordatorio se marca como `estado = 'fallido'` (o se salta con log)
- **AND** no se genera `whatsappUrl`

---

# 4. recordatorios (modificado)

## Requisitos Funcionales

### R4.1 enviar y enviarMasivo usan templates

Los endpoints `POST /api/recordatorios/enviar` y `POST /api/recordatorios/enviar-masivo` **MUST** usar el template correspondiente a la categoría del procedimiento (via `PlantillaRecordatorio`) en lugar de los mensajes hardcodeados actuales.
(Anteriormente: los mensajes estaban hardcodeados en el controlador con emojis y texto fijo.)

### R4.2 enviarMasivo respeta recordatorio_auto

El endpoint `enviarMasivo` **MUST** verificar `config.recordatorio_auto` antes de procesar. Si es `'false'`, **MUST** retornar un error 400 o un mensaje indicando que la automatización está desactivada.
(Anteriormente: `enviarMasivo` no verificaba `recordatorio_auto`.)

### R4.3 getPendientes filtra por tieneWhatsapp

El endpoint `GET /api/recordatorios/pendientes` **SHOULD** filtrar las citas devueltas para incluir solo pacientes con `tieneWhatsapp = true`. El filtrado **MAY** hacerse en el `where` de Prisma o post-query.
(Anteriormente: no se filtraba por `tieneWhatsapp`.)

## Escenarios

### HC-5: enviar usa template de categoría

- **GIVEN** una cita con procedimiento de categoría "Ortodoncia"
- **AND** existe `PlantillaRecordatorio` para esa categoría
- **WHEN** se llama a `POST /api/recordatorios/enviar` con `{ citaId, destinatario: 'paciente' }`
- **THEN** el `mensaje` del recordatorio creado usa el template de Ortodoncia con variables resueltas
- **AND** el mensaje NO es el hardcodeado original

### HC-6: enviarMasivo con recordatorio_auto = true

- **GIVEN** `config.recordatorio_auto = 'true'`
- **AND** hay citas para mañana
- **WHEN** se llama a `POST /api/recordatorios/enviar-masivo`
- **THEN** se procesan las citas y se crean recordatorios con mensajes basados en templates (o fallback genérico)
- **AND** se respeta `tieneWhatsapp` del paciente

### EC-11: enviarMasivo con recordatorio_auto = false

- **GIVEN** `config.recordatorio_auto = 'false'`
- **WHEN** se llama a `POST /api/recordatorios/enviar-masivo`
- **THEN** retorna error 400 con mensaje "Envío automático desactivado"
- **AND** no se crean registros

### EC-12: enviar sin template existente (fallback)

- **GIVEN** una cita con procedimiento cuya categoría no tiene template
- **WHEN** se llama a `POST /api/recordatorios/enviar`
- **THEN** el mensaje generado es el genérico de fallback (mismo que el hardcodeado actual)

---

# Criterios de Aceptación Globales

| # | Criterio | Dominio |
|---|----------|---------|
| CA1 | Crear cita con `recordatorio_auto=true`, paciente con teléfono+whatsapp → recordatorio pendiente creado con fecha programada correcta | auto-trigger |
| CA2 | Crear cita con `recordatorio_auto=true`, paciente sin teléfono → no se crea recordatorio (log visible) | auto-trigger |
| CA3 | Scheduler corre a hora configurada, envía recordatorios pendientes de hoy, marca como enviado con URL wa.me | scheduler |
| CA4 | `recordatorio_auto=false` → scheduler no ejecuta, trigger no ejecuta, enviarMasivo rechaza | todos |
| CA5 | Panel de templates: tabla con todas las categorías, editor modal, preview en vivo, restaurar predeterminado | templates |
| CA6 | Template existe → mensaje personalizado por categoría. Template no existe → fallback genérico | templates + recordatorios |
| CA7 | Variable mal escrita (`{{pacient}}`) → se deja literal, no causa error | templates |
| CA8 | No se duplican recordatorios para misma cita-destinatario | auto-trigger |
| CA9 | `enviar` y `enviarMasivo` usan templates en vez de mensajes hardcodeados | recordatorios |
