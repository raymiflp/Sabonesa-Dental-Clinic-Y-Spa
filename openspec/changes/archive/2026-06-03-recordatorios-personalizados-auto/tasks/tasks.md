# Tasks — Recordatorios Personalizados y Automáticos

> **Estado: COMPLETADO ✅** — 16/16 tareas implementadas y verificadas.
> Auto-forecast entregado con review budget de **800 líneas**.
> Feature nueva — todos los archivos listados son creación o modificación.
> **Verify status**: PASS WITH WARNINGS 🟡 (3 warnings, 4 suggestions)

---

## Fase 1: Modelo + Seed + Helpers Compartidos

### T-1.1 — Agregar modelo `PlantillaRecordatorio` a schema.prisma ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 1 — Modelo + Seed |
| **Descripción** | Agregar el modelo `PlantillaRecordatorio` con FK opcional a `CategoriaProcedimiento`. Incluir relación `plantillaRecordatorio` en `CategoriaProcedimiento`. El campo `mensaje` soporta `{{paciente}}`, `{{fecha}}`, `{{hora}}`, `{{clinica}}`, `{{doctor}}`. |
| **Archivo(s)** | `backend/prisma/schema.prisma` |
| **Dependencias** | — |
| **Criterios de aceptación** | — `PlantillaRecordatorio` definido con: `id`, `categoriaProcedimientoId` (Int, @unique), `mensaje` (String), `activo` (Boolean @default(true)), `createdAt`. — `CategoriaProcedimiento` tiene relación `plantillaRecordatorio?`. — Cascade delete on FK. — `npx prisma db push` ejecuta sin errores. |

---

### T-1.2 — Ejecutar migración vía `prisma db push` ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 1 — Modelo + Seed |
| **Descripción** | Ejecutar `npx prisma db push` para sincronizar el schema con la BD SQLite existente. Verificar que la tabla `PlantillaRecordatorio` se crea correctamente. |
| **Archivo(s)** | `backend/prisma/schema.prisma` (ya modificado en T-1.1) |
| **Dependencias** | T-1.1 |
| **Criterios de aceptación** | — `npx prisma db push` exitoso. — `npx prisma db push` no elimina datos existentes. — Tabla `PlantillaRecordatorio` visible en `npx prisma studio`. |

---

### T-1.3 — Crear constante con templates por defecto ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 1 — Modelo + Seed |
| **Descripción** | Crear `src/constants/defaultTemplates.js` con un array/map de mensajes predeterminados para cada una de las 9 categorías (Odontología General, Endodoncia, Periodoncia, Cirugía Oral, Rehabilitación Oral, Ortodoncia, Odontopediatría, Odontología Estética, Patología y Radiología Oral). Cada template usa las variables `{{paciente}}`, `{{fecha}}`, `{{hora}}`, `{{clinica}}`, `{{doctor}}` con texto adaptado a la especialidad. |
| **Archivo(s)** | `backend/src/constants/defaultTemplates.js` **(CREAR)** |
| **Dependencias** | — |
| **Criterios de aceptación** | — Exporta `DEFAULT_TEMPLATES` como `{ [categoriaNombre]: string }`. — Cada una de las 9 categorías tiene un mensaje distinto. — Los mensajes incluyen al menos 3 variables diferentes. — Archivo ESM (`export const`). |

---

### T-1.4 — Agregar seed de templates al seed.js ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 1 — Modelo + Seed |
| **Descripción** | Agregar al seed existente (`prisma/seed.js`) la creación de 9 `PlantillaRecordatorio`, una por cada `CategoriaProcedimiento`, usando los valores de `DEFAULT_TEMPLATES`. Crear después de las categorías y antes de la configuración. Usar upsert o create para evitar duplicados en re-ejecución. |
| **Archivo(s)** | `backend/prisma/seed.js` |
| **Dependencias** | T-1.1, T-1.2, T-1.3 |
| **Criterios de aceptación** | — Ejecutar `node prisma/seed.js` crea 9 registros en `PlantillaRecordatorio`. — Cada registro tiene `activo = true`. — Re-ejecutar seed no lanza error (upsert). — Mensajes coinciden con `DEFAULT_TEMPLATES`. |

---

### T-1.5 — Crear helper compartido `resolverTemplate.js` ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 1 — Modelo + Seed |
| **Descripción** | Crear `src/helpers/resolverTemplate.js` con función `resolverTemplate(prisma, { categoriaNombre, procedimientoNombre, paciente, cita, config })` que: busca `PlantillaRecordatorio` activa por `categoriaNombre`, reemplaza `{{paciente}}`, `{{fecha}}`, `{{hora}}`, `{{clinica}}`, `{{doctor}}` con datos reales. Si no encuentra template activo o no existe, retorna mensaje genérico de fallback. Retorna `{ mensaje, fuente: 'template' | 'fallback' }`. Fallback = mensaje hardcodeado actual (`"🦷 *Betty Dental*\n\nHola..."). |
| **Archivo(s)** | `backend/src/helpers/resolverTemplate.js` **(CREAR)** + crear directorio si no existe |
| **Dependencias** | T-1.3 (usa `DEFAULT_TEMPLATES` como fallback) |
| **Criterios de aceptación** | — Template activo existente: reemplaza las 5 variables correctamente. — Template no existe: retorna `fuente: 'fallback'` con mensaje genérico. — Variable mal escrita (`{{pacient}}`): se deja literal sin error (EC-2). — Variable sin template para esa categoría: fallback. — Función async, ESM export. |

---

## Fase 2: API Endpoints de Templates

### T-2.1 — Crear controller `plantillasRecordatorio.js` ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 2 — API Templates |
| **Descripción** | Crear `src/controllers/plantillasRecordatorio.js` con 3 funciones exportadas: `list(req, res)` — GET devuelve todas las plantillas con join a categoría (id, categoriaProcedimientoId, categoriaNombre, mensaje, activo). `update(req, res)` — PUT actualiza `mensaje` y/o `activo` por id. Verificar que la plantilla existe (404 si no). `restore(req, res)` — POST reemplaza `mensaje` con el valor de `DEFAULT_TEMPLATES[catNombre]`, 404 si no existe. |
| **Archivo(s)** | `backend/src/controllers/plantillasRecordatorio.js` **(CREAR)** |
| **Dependencias** | T-1.3, T-1.5 |
| **Criterios de aceptación** | — `list()` retorna array con join a `CategoriaProcedimiento.nombre`. — `update()` acepta `{ mensaje, activo }`, retorna 404 si id no existe. — `restore()` restaura al valor de `DEFAULT_TEMPLATES`. — Cada endpoint maneja errores con try/catch → 500. |

---

### T-2.2 — Agregar rutas de templates en `routes/recordatorios.js` ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 2 — API Templates |
| **Descripción** | Agregar 3 rutas al router de recordatorios: `GET /templates` → `plantillasRecordatorio.list`, `PUT /templates/:id` → `plantillasRecordatorio.update`, `POST /templates/:id/restaurar` → `plantillasRecordatorio.restore`. |
| **Archivo(s)** | `backend/src/routes/recordatorios.js` |
| **Dependencias** | T-2.1 |
| **Criterios de aceptación** | — Importa `plantillasRecordatorio` controller. — Rutas registradas en orden correcto. — `GET /api/recordatorios/templates` responde 200 con JSON array. — `PUT /api/recordatorios/templates/1` con body válido responde 200. — `POST /api/recordatorios/templates/1/restaurar` responde 200. |

---

## Fase 3: Trigger Automático en `agenda.create()`

### T-3.1 — Agregar trigger de recordatorio automático post-creación de cita ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 3 — Trigger automático |
| **Descripción** | Modificar `controllers/agenda.js` función `create()`: después de crear la cita exitosamente (res.status(201)), agregar bloque try/catch que: (1) lee `config.recordatorio_auto`; (2) si es `'true'`, busca el procedimiento por nombre (`cita.procedimiento`) para obtener su `categoriaId`; (3) obtiene `CategoriaProcedimiento.nombre`; (4) llama `resolverTemplate()` con datos de paciente y cita; (5) calcula `fechaProgramada = cita.fecha - config.recordatorio_anticipacion` días; (6) verifica duplicado con `findFirst({ citaId, destinatario: 'paciente' })`; (7) si no existe duplicado, crea `Recordatorio` con estado='pendiente'. Todo envuelto en try/catch silencioso (console.warn). |
| **Archivo(s)** | `backend/src/controllers/agenda.js` |
| **Dependencias** | T-1.5 (resolverTemplate) |
| **Criterios de aceptación** | — Cita con `recordatorio_auto=true` y paciente con teléfono+whatsapp → recordatorio creado (HC-3). — Cita con `recordatorio_auto=false` → no se crea recordatorio (EC-7). — Paciente sin teléfono → console.warn + no crear (EC-4). — Paciente con `tieneWhatsapp=false` → console.warn + no crear (EC-5). — Misma cita dos veces → no duplica (EC-6). — `fechaProgramada` = cita.fecha - anticipacion días. — Error interno no interrumpe el flujo de creación de cita (try/catch silencioso). |

---

### T-3.2 — Importar y usar resolverTemplate en agenda.create() ✅

Sub-tarea de T-3.1 — incluir `import { resolverTemplate } from '../helpers/resolverTemplate.js'` al inicio de `agenda.js` y pasar los parámetros correctos (prisma, { categoriaNombre, procedimientoNombre, paciente, cita, config }).

| Archivo(s) | `backend/src/controllers/agenda.js` |
|------------|--------------------------------------|
| **Criterio** | Import correcto ESM. Llamada a `resolverTemplate()` con los 3 datos de cita recién creada. |

---

## Fase 4: Scheduler node-cron

### T-4.1 — Instalar dependencia `node-cron` ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 4 — Scheduler |
| **Descripción** | Ejecutar `npm install node-cron` en el directorio backend. Verificar que se agrega a `package.json` dependencies. |
| **Archivo(s)** | `backend/package.json`, `backend/node_modules/`, `backend/package-lock.json` |
| **Dependencias** | — |
| **Criterios de aceptación** | — `node-cron` aparece en `package.json` dependencies. — `import cron from 'node-cron'` funciona sin error. |

---

### T-4.2 — Crear módulo `scheduler.js` ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 4 — Scheduler |
| **Descripción** | Crear `src/scheduler.js` que exporta `initScheduler(prisma)`. La función: (1) lee `config.recordatorio_hora` y `config.recordatorio_auto`; (2) si `recordatorio_auto='true'`, registra cron job con `cron.schedule()` para la hora configurada; (3) el handler: lee `recordatorio_auto` nuevamente (por si cambió), si es 'false' aborta; busca `Recordatorio` con `estado='pendiente'` y `fechaProgramada = hoy (YYYY-MM-DD)`; por cada uno: carga paciente con `tieneWhatsapp` y `telefono`, si cumple genera `whatsappUrl` y actualiza a `estado='enviado'`, `enviadoEn=new Date()`, `whatsappUrl`; si no cumple: log + skip (no marcar fallido). |
| **Archivo(s)** | `backend/src/scheduler.js` **(CREAR)** |
| **Dependencias** | T-4.1 (node-cron instalado) |
| **Criterios de aceptación** | — `initScheduler(prisma)` registra cron. — Handler: busca solo `fechaProgramada = hoy`. — Recordatorio encontrado + paciente ok → `estado = 'enviado'`, `whatsappUrl = https://wa.me/{telefono}?text={mensaje_codificado}`. — Paciente sin WhatsApp → log + skip (no marca fallido) (EC-10). — No hay pendientes → no modifica nada (EC-8). — `recordatorio_auto = false` → handler aborta (EC-9). |

---

### T-4.3 — Integrar scheduler en `index.js` ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 4 — Scheduler |
| **Descripción** | Modificar `src/index.js`: importar `initScheduler` desde `./scheduler.js`. Después de `app.listen()`, llamar a `initScheduler(prisma)`. |
| **Archivo(s)** | `backend/src/index.js` |
| **Dependencias** | T-4.2 |
| **Criterios de aceptación** | — Import ESM correcto. — `initScheduler(prisma)` se llama después de que el servidor empieza a escuchar. — No bloquea el startup. — Si `recordatorio_auto=false`, no registra cron (o lo registra pero el handler aborta). |

---

## Fase 5: Refactor de Controllers Existentes

### T-5.1 — Refactor `enviar()` para usar `resolverTemplate()` ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 5 — Refactor |
| **Descripción** | Modificar `controllers/recordatorios.js` función `enviar()`: cuando `destinatario === 'paciente'`, reemplazar el mensaje hardcodeado con llamada a `resolverTemplate()`. Obtener `categoriaNombre` resolviendo `cita.procedimiento` → `Procedimiento.findFirst({nombre})` → `categoria.nombre`. Mantener el destinatario 'doctor' sin cambios (no aplica template). |
| **Archivo(s)** | `backend/src/controllers/recordatorios.js` |
| **Dependencias** | T-1.5 |
| **Criterios de aceptación** | — `enviar()` con cita que tiene categoría con template → mensaje personalizado (HC-5). — `enviar()` sin template para esa categoría → fallback genérico (EC-12). — Destinatario 'doctor' mantiene mensaje actual. — Comportamiento de duplicado y creación de recordatorio se mantiene igual. |

---

### T-5.2 — Refactor `enviarMasivo()` para usar `resolverTemplate()` ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 5 — Refactor |
| **Descripción** | Modificar `controllers/recordatorios.js` función `enviarMasivo()`: reemplazar mensaje hardcodeado con llamada a `resolverTemplate()` para cada cita. Resolver categoría via `cita.procedimiento` → `Procedimiento.findFirst()` → `categoria.nombre`. Agregar verificación de `config.recordatorio_auto` al inicio: si es `'false'`, retornar 400 con `"Envío automático desactivado"` (EC-11). |
| **Archivo(s)** | `backend/src/controllers/recordatorios.js` |
| **Dependencias** | T-1.5 |
| **Criterios de aceptación** | — `recordatorio_auto=true` + citas → procesa con template o fallback (HC-6). — `recordatorio_auto=false` → 400 (EC-11). — Mensajes generados usan template de categoría cuando existe. — Filtra pacientes sin `tieneWhatsapp` o sin teléfono. |

---

### T-5.3 — Refactor `getPendientes()` para filtrar por `tieneWhatsapp` ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 5 — Refactor |
| **Descripción** | Modificar `controllers/recordatorios.js` función `getPendientes()`: en el `where` de citas, agregar filtro para incluir solo pacientes con `tieneWhatsapp = true`. Usar `include.paciente` con `where` anidado o post-filter. También filtrar recordatorios periódicos por `tieneWhatsapp`. |
| **Archivo(s)** | `backend/src/controllers/recordatorios.js` |
| **Dependencias** | — |
| **Criterios de aceptación** | — `GET /api/recordatorios/pendientes` solo retorna citas de pacientes con `tieneWhatsapp = true`. — Recordatorios periódicos también filtrados. — Pacientes con `tieneWhatsapp=false` excluidos del listado. — No rompe estructura de respuesta existente `{ citas, periodicos }`. |

---

## Fase 6: Frontend — Panel de Templates

### T-6.1 — Agregar métodos de templates en `api.js` ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 6 — Frontend |
| **Descripción** | Agregar 3 métodos al objeto `api` en `frontend/src/api.js`: `getTemplates: () => request('/recordatorios/templates')`, `updateTemplate: (id, data) => request(\`/recordatorios/templates/${id}\`, { method: 'PUT', body: JSON.stringify(data) })`, `restoreTemplate: (id) => request(\`/recordatorios/templates/${id}/restaurar\`, { method: 'POST' })`. |
| **Archivo(s)** | `frontend/src/api.js` |
| **Dependencias** | T-2.2 (rutas backend implementadas) |
| **Criterios de aceptación** | — `api.getTemplates()` retorna array de templates. — `api.updateTemplate(1, { mensaje: '...' })` hace PUT. — `api.restoreTemplate(1)` hace POST. — Siguen el patrón offline-aware del resto de la API. |

---

### T-6.2 — Agregar pestaña "Plantillas" en Recordatorios.jsx ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 6 — Frontend |
| **Descripción** | Agregar un nuevo `<TabsTrigger value="plantillas">Plantillas</TabsTrigger>` y su `<TabsContent value="plantillas">` en `pages/Recordatorios.jsx`. El contenido muestra una tabla con columnas: Categoría, Template actual (truncado a ~80 chars), Activo (switch/toggle), Acciones (Editar, Restaurar). La tabla se carga via `api.getTemplates()`. Incluir estados: Loading (skeleton/spinner), Empty (mensaje "No hay plantillas disponibles"), Error (alerta/toast). |
| **Archivo(s)** | `frontend/src/pages/Recordatorios.jsx` |
| **Dependencias** | T-6.1 |
| **Criterios de aceptación** | — Pestaña "Plantillas" visible en el tab bar. — Al hacer clic, muestra tabla con todas las categorías. — Switch "Activo" cambia el estado visualmente (llama a `updateTemplate`). — Categoría sin template muestra "Usa mensaje genérico". — Estados loading/empty/error manejados. |

---

### T-6.3 — Editor modal con preview en vivo ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 6 — Frontend |
| **Descripción** | Agregar modal de edición (usando shadcn `Dialog`) que se abre al hacer clic en "Editar". Contiene: (1) `Textarea` con el mensaje actual; (2) chips clickeables de variables disponibles (`{{paciente}}`, `{{fecha}}`, `{{hora}}`, `{{clinica}}`, `{{doctor}}`) que insertan en cursor position; (3) preview en vivo debajo del textarea con valores de ejemplo (María González, 05/06/2026, 10:30, Betty Dental, Dr. Rodríguez); (4) botón "Guardar" que llama a `api.updateTemplate()`; (5) botón "Cancelar". Manejar error en save con alert o toast. |
| **Archivo(s)** | `frontend/src/pages/Recordatorios.jsx` |
| **Dependencias** | T-6.1, T-6.2 |
| **Criterios de aceptación** | — Modal se abre con datos correctos de la fila. — Chips de variables insertan en el texto al hacer clic. — Preview en vivo se actualiza con cada cambio. — Guardar exitoso → cierra modal y recarga tabla. — Error en guardar → muestra mensaje de error. |

---

### T-6.4 — Botón "Restaurar predeterminado" por fila ✅

| Campo | Valor |
|-------|-------|
| **Fase** | 6 — Frontend |
| **Descripción** | Agregar botón "Restaurar predeterminado" en cada fila de la tabla y también dentro del modal de edición. Al hacer clic, muestra confirmación (`confirm()` o diálogo), luego llama a `api.restoreTemplate(id)`. Si la categoría no tiene default en `DEFAULT_TEMPLATES`, mostrar mensaje "No hay valor predeterminado para esta categoría". Al restaurar exitosamente, actualizar la fila en la tabla con el mensaje restaurado. |
| **Archivo(s)** | `frontend/src/pages/Recordatorios.jsx` |
| **Dependencias** | T-6.1, T-6.3 |
| **Criterios de aceptación** | — Botón visible en cada fila de la tabla y dentro del modal. — Confirmación antes de restaurar. — Restauración exitosa recarga la tabla. — Error (id no existe) muestra mensaje. |

---

## Resumen de Archivos Afectados

| Archivo | Acción | Líneas estimadas | Fase |
|---------|--------|------------------|------|
| `backend/prisma/schema.prisma` | Modificar | +15 | 1 |
| `backend/src/constants/defaultTemplates.js` | **Crear** | +50 | 1 |
| `backend/prisma/seed.js` | Modificar | +40 | 1 |
| `backend/src/helpers/resolverTemplate.js` | **Crear** | +45 | 1 |
| `backend/src/controllers/plantillasRecordatorio.js` | **Crear** | +65 | 2 |
| `backend/src/routes/recordatorios.js` | Modificar | +8 | 2 |
| `backend/src/controllers/agenda.js` | Modificar | +45 | 3 |
| `backend/package.json` | Modificar | +1 | 4 |
| `backend/src/scheduler.js` | **Crear** | +55 | 4 |
| `backend/src/index.js` | Modificar | +3 | 4 |
| `backend/src/controllers/recordatorios.js` | Modificar | +45 | 5 |
| `frontend/src/api.js` | Modificar | +5 | 6 |
| `frontend/src/pages/Recordatorios.jsx` | Modificar | +160 | 6 |
| **Total estimado** | | **~537 líneas** | |

---

## Dependencias entre Tareas

```mermaid
graph TD
    T11[T-1.1 schema.prisma] --> T12[T-1.2 db push]
    T13[T-1.3 defaultTemplates] --> T14[T-1.4 seed]
    T13 --> T15[T-1.5 resolverTemplate]
    T11 --> T14
    T12 --> T14
    T15 --> T21[T-2.1 controller]
    T13 --> T21
    T21 --> T22[T-2.2 routes]
    T15 --> T31[T-3.1 trigger agenda]
    T41[T-4.1 npm install] --> T42[T-4.2 scheduler.js]
    T42 --> T43[T-4.3 index.js]
    T15 --> T42
    T15 --> T51[T-5.1 refactor enviar]
    T15 --> T52[T-5.2 refactor enviarMasivo]
    T53[T-5.3 getPendientes filter] --> (independiente)
    T22 --> T61[T-6.1 api.js]
    T61 --> T62[T-6.2 tab Plantillas]
    T62 --> T63[T-6.3 modal editor]
    T63 --> T64[T-6.4 restore button]
```

**Paralelizables**: Fase 1 completa (secuencial interna). Fase 2 depende de Fase 1. Fase 3 depende de T-1.5. Fase 4 depende de T-1.5. Fase 5 depende de T-1.5. Las fases 3, 4 y 5 son paralelizables entre sí (solo dependen de T-1.5). Fase 6 depende de Fase 2.

---

## Review Workload Forecast

| Fase | Líneas | Review effort |
|------|--------|---------------|
| Fase 1 — Modelo + Seed | ~150 | Medio (schema + lógica nueva) |
| Fase 2 — API Templates | ~73 | Bajo (CRUD estándar) |
| Fase 3 — Trigger | ~45 | Medio (lógica de negocios) |
| Fase 4 — Scheduler | ~59 | Medio (nueva dependencia + cron) |
| Fase 5 — Refactor | ~45 | Bajo (reemplazar strings por función) |
| Fase 6 — Frontend | ~165 | Alto (JSX + estados + modal) |
| **Total estimado** | **~537** | **Dentro del budget de 800 líneas** |

El forecast de ~537 líneas está cómodamente dentro del budget de 800 líneas, dejando margen para ajustes y correcciones.
