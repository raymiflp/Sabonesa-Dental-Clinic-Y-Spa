# Design: Recordatorios Personalizados y Automáticos

## Technical Approach

Tres componentes independientes y paralelizables: (1) modelo `PlantillaRecordatorio` + seed + función compartida `resolverTemplate()`; (2) trigger no-bloqueante en `agenda.create()`; (3) scheduler `node-cron` diario. Frontend agrega pestaña "Plantillas" con editor y preview en vivo. Los endpoints `enviar`/`enviarMasivo` se refactorizan para usar templates en vez de strings hardcodeados.

---

## Architecture Decisions

### Decision: Resolución de template via nombre de procedimiento (string)

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| FK `Cita.procedimientoId` → `Procedimiento` | Requiere migrar schema, rompe citas existentes | ❌ Rechazado |
| Resolver: `cita.procedimiento` (string) → `Procedimiento.findFirst({nombre})` → `categoriaId` → `PlantillaRecordatorio` | Lectura adicional, pero 0 migración de datos | ✅ Elegido |

**Rationale**: `Cita.procedimiento` es un string libre, no una FK. Migrar a FK requeriría migración de datos y rompería citas existentes. La resolución vía `findFirst` por nombre tiene costo despreciable (SQLite local, pocos registros).

### Decision: node-cron sobre cron nativo

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| `node-cron` | Formato cron estándar, liviano, sin dependencias nativas | ✅ Elegido |
| `cron` package | Similar pero más pesado | ❌ Rechazado |

**Rationale**: `node-cron` tiene 0 dependencias, formato cron de 5 campos, y es el estándar de facto para tareas programadas en Node.js.

### Decision: Seed inline en `prisma/seed.js` vs archivo separado

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Seed inline en `seed.js` | Misma ubicación que seed existente, un solo comando | ✅ Elegido |
| Script separado | Fragmenta la lógica de seed | ❌ Rechazado |

**Rationale**: El seed de templates es parte del mismo comando `npm run db:seed`. Mantenerlo en el mismo archivo evita confusión y garantiza consistencia.

### Decision: Templates por defecto hardcodeados en backend (no frontend)

Los valores predeterminados se definen en una constante en el backend (`src/constants/defaultTemplates.js`). El endpoint de restauración lee de esa constante. El frontend solo muestra y edita.

---

## Data Flow

### Flujo 1: Trigger en agenda.create()

```
POST /api/agenda
  → agendaController.create()
    → Prisma: crear Cita
    → (éxito) → leer config recordatorio_auto
      → si 'true':
        → cita.procedimiento → findFirst Procedimiento
        → Procedimiento.categoriaId → buscar PlantillaRecordatorio
        → resolverTemplate() reemplaza {{variables}}
        → verificar paciente.telefono && paciente.tieneWhatsapp
        → findFirst Recordatorio duplicado (citaId + destinatario)
        → Prisma: crear Recordatorio (estado='pendiente')
      → si falla: console.warn() silencioso (try/catch)
  → res.status(201).json(cita)
```

### Flujo 2: Scheduler diario

```
index.js (después de app.listen)
  → leer config recordatorio_auto, recordatorio_hora
  → cron.schedule('${min} ${hr} * * *', handler)
    → cada tick:
      → leer config recordatorio_auto
      → si 'false': abortar
      → buscar Recordatorio WHERE estado='pendiente' AND fechaProgramada=hoy
      → por cada uno:
        → cargar paciente (telefono, tieneWhatsapp)
        → si ok: actualizar estado='enviado', whatsappUrl, enviadoEn
        → si no: log + saltar
```

### Flujo 3: Resolución de template (compartido)

```
resolverTemplate(categoriaNombre, procedimientoNombre, paciente, cita, config)
  → buscar PlantillaRecordatorio por categoriaNombre
    → si activo: reemplazar {{paciente}}, {{fecha}}, {{hora}}, {{clinica}}, {{doctor}}
    → si no existe o no activo: retornar mensaje genérico de fallback
```

```
                    ┌──────────────────┐
                    │  PlantillaRecord. │
                    │  ┌──────────────┐ │
  agenda.create() ──┤  │ mensaje      │ │──→ Recordatorio (pendiente)
                    │  │ activo       │ │
                    │  │ categoriaId  │ │
                    │  └──────────────┘ │
                    └──────────────────┘
                            ▲
                            │
                    ┌───────┴───────┐
                    │ resolverTemp. │
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
    enviar() ──┘   enviarMasivo() ──┘   scheduler() ──┘
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | Modify | +model `PlantillaRecordatorio`, +relation en `CategoriaProcedimiento` |
| `backend/prisma/seed.js` | Modify | Seed 9 templates (uno por categoría) |
| `backend/package.json` | Modify | +dependency `node-cron` |
| `backend/src/constants/defaultTemplates.js` | **Create** | Array con mensajes predeterminados por categoría |
| `backend/src/helpers/resolverTemplate.js` | **Create** | Función compartida: busca template, reemplaza variables o retorna fallback |
| `backend/src/controllers/agenda.js` | Modify | Trigger post-create, try/catch silencioso |
| `backend/src/controllers/recordatorios.js` | Modify | `enviar`/`enviarMasivo` usan `resolverTemplate()`; `getPendientes` filtra por `tieneWhatsapp` |
| `backend/src/controllers/plantillasRecordatorio.js` | **Create** | Controller CRUD: list, update, restore |
| `backend/src/routes/recordatorios.js` | Modify | +rutas `/templates`, `/templates/:id`, `/templates/:id/restaurar` |
| `backend/src/index.js` | Modify | Import + init scheduler post-listen |
| `backend/src/scheduler.js` | **Create** | Módulo del cron job y su handler |
| `frontend/src/api.js` | Modify | +métodos `getTemplates`, `updateTemplate`, `restoreTemplate` |
| `frontend/src/pages/Recordatorios.jsx` | Modify | +tab "Plantillas" con tabla, modal editor, preview |

---

## Interfaces / Contracts

### Modelo Prisma

```prisma
model CategoriaProcedimiento {
  id           Int      @id @default(autoincrement())
  nombre       String   @unique
  descripcion  String?
  createdAt    DateTime @default(now())

  procedimientos       Procedimiento[]
  plantillaRecordatorio PlantillaRecordatorio?  // ← NUEVO
}

model PlantillaRecordatorio {
  id                     Int      @id @default(autoincrement())
  categoriaProcedimientoId Int    @unique
  categoriaProcedimiento CategoriaProcedimiento @relation(fields: [categoriaProcedimientoId], references: [id], onDelete: Cascade)
  mensaje                String
  activo                 Boolean  @default(true)
  createdAt              DateTime @default(now())
}
```

### API Endpoints

| Method | Path | Body | Response | Notas |
|--------|------|------|----------|-------|
| `GET` | `/api/recordatorios/templates` | — | `[{id, categoriaProcedimientoId, categoriaNombre, mensaje, activo}]` | Incluye nombre de categoría (join) |
| `PUT` | `/api/recordatorios/templates/:id` | `{ mensaje, activo }` | Plantilla actualizada | Solo edita mensaje y activo |
| `POST` | `/api/recordatorios/templates/:id/restaurar` | — | Plantilla con mensaje restaurado | Toma el valor del seed |

### Función compartida: `resolverTemplate`

```js
// src/helpers/resolverTemplate.js
// Retorna: { mensaje: string, fuente: 'template' | 'fallback' }
export async function resolverTemplate(prisma, { categoriaNombre, procedimientoNombre, paciente, cita, config }) {
  const template = await prisma.plantillaRecordatorio.findFirst({
    where: {
      categoriaProcedimiento: { nombre: categoriaNombre },
      activo: true
    }
  });

  const raw = template?.mensaje || FALLBACK_MESSAGE;

  const resolved = raw
    .replace(/\{\{paciente\}\}/g, `${paciente.nombres} ${paciente.apellidos}`)
    .replace(/\{\{fecha\}\}/g, cita.fecha)
    .replace(/\{\{hora\}\}/g, cita.hora || 'por definir')
    .replace(/\{\{clinica\}\}/g, config.clinica_nombre || 'Betty Dental')
    .replace(/\{\{doctor\}\}/g, config.doctor_nombre || 'Doctor');

  return { mensaje: resolved, fuente: template ? 'template' : 'fallback' };
}
```

### Scheduler

```js
// src/scheduler.js
// Se llama desde index.js
export function initScheduler(prisma) {
  // Lee config y registra cron
  // Handler: busca Recordatorio pendiente para hoy, procesa en lote
}
```

### Frontend — api.js additions

```js
getTemplates: () => request('/recordatorios/templates'),
updateTemplate: (id, data) => request(`/recordatorios/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
restoreTemplate: (id) => request(`/recordatorios/templates/${id}/restaurar`, { method: 'POST' }),
```

---

## Default Templates (Seed)

Para cada categoría existente se crea un mensaje específico usando las variables disponibles. Ejemplos representativos:

| Categoría | Template |
|-----------|----------|
| Odontología General | `🦷 *{{clinica}}*\n\nHola *{{paciente}}* 👋\nTe recordamos tu cita de *Odontología General* el {{fecha}} a las {{hora}}. Asistiremos al Dr. {{doctor}}.\n\n¡Te esperamos! 🙌` |
| Endodoncia | `🦷 *{{clinica}}*\n\nHola *{{paciente}}* 👋\nTu cita de *Endodoncia* es el {{fecha}} a las {{hora}}. Recuerda llegar 10 min antes con tus estudios si aplica. Dr. {{doctor}}.\n\n¡Te esperamos! 🙌` |
| Cirugía Oral | `🦷 *{{clinica}}*\n\nHola *{{paciente}}* 👋\nTu *cirugía* está agendada para el {{fecha}} a las {{hora}}. Ayuno de 6 horas y acompañante. Dr. {{doctor}}.\n\n¡Te esperamos! 🙌` |
| Ortodoncia | `🦷 *{{clinica}}*\n\nHola *{{paciente}}* 👋\nTe recordamos tu cita de *Ortodoncia* el {{fecha}} a las {{hora}}. Trae tus brackets y cepillo. Dr. {{doctor}}.\n\n¡Te esperamos! 🙌` |

(8 categorías restantes siguen mismo patrón con texto adaptado a cada especialidad.)

---

## Frontend — Panel de Templates

### Estructura

- Nueva pestaña "Plantillas" en `<Tabs>` de `Recordatorios.jsx`
- Tabla: Categoría | Template actual (truncado) | Activo (switch) | Acciones (editar, restaurar)
- Modal de edición (utilizando shadcn `Dialog`) con:
  - `Textarea` para editar el mensaje
  - Chips clickeables de variables disponibles: `{{paciente}}`, `{{fecha}}`, `{{hora}}`, `{{clinica}}`, `{{doctor}}`
  - Preview en vivo: el textarea se refleja abajo con valores de ejemplo
  - Botón "Restaurar predeterminado"
  - Botón "Guardar"

### Estados

- **Loading**: Skeleton mientras carga templates
- **Empty**: Mensaje "No hay plantillas disponibles" si falla carga
- **Error**: Alert si save falla (toast o inline)
- **Edge**: Categoría sin template → mostrar "Usa mensaje genérico" en la tabla

---

## Testing Strategy

No hay test runner configurado. La verificación será manual siguiendo los escenarios de spec:

| Ámbito | Qué verificar | Cómo |
|--------|--------------|------|
| Seed | 9 templates creados (uno por categoría) | `prisma db push && prisma db seed`, luego consultar tabla |
| Trigger | Crear cita con `recordatorio_auto=true` genera Recordatorio pendiente | POST /api/agenda + verificar tabla |
| Trigger | Paciente sin teléfono/whatsapp no genera recordatorio | POST con paciente sin telefono |
| Trigger | No duplica recordatorios para misma cita | Revisar `findFirst` previo |
| Scheduler | En tick, recordatorios pendientes → enviado con whatsappUrl | Ejecutar cron handler manualmente |
| Templates API | CRUD endpoints responden correctamente | Probar GET/PUT/POST con curl |
| Frontend | Panel muestra categorías, editor guarda cambios | Navegación manual |
| Refactor | `enviar()` y `enviarMasivo()` usan template en vez de hardcode | Inspeccionar mensaje resultante |

---

## Migration / Rollout

No requiere migración de datos existentes. Pasos para deploy:

1. `npm install node-cron`
2. Agregar modelo `PlantillaRecordatorio` a schema → `npx prisma db push`
3. Ejecutar seed (los templates se insertan vía upsert por categoriaId)
4. Frontend build (`npm run build`)
5. No se requiere feature flag adicional — `recordatorio_auto` en Configuracion controla trigger y scheduler

**Rollback**: Ver proposal.md (eliminar modelo, comentar trigger en agenda.create(), eliminar init scheduler, eliminar tab frontend).

---

## Implementation Order

| Fase | Componente | Depende de |
|------|-----------|------------|
| 1a | Modelo `PlantillaRecordatorio` + seed + defaultTemplates constants | — |
| 1b | `resolverTemplate.js` (compartido) | 1a |
| 1c | CRUD API `/api/recordatorios/templates` | 1a |
| 1d | Frontend: tab Plantillas + modal editor | 1c |
| 2a | Trigger en `agenda.create()` | 1b |
| 2b | Refactor `enviar()` / `enviarMasivo()` → usan resolverTemplate | 1b |
| 2c | `getPendientes` filtra por `tieneWhatsapp` | — |
| 3a | `node-cron` + scheduler.js | 1b |
| 3b | Init scheduler en `index.js` | 3a |

Las fases 1, 2 y 3 son paralelizables entre sí (solo dependen de 1a/1b).

---

## Open Questions

- [ ] En scheduler: si el paciente no tiene WhatsApp, ¿marcar recordatorio como `fallido` o solo saltar con log? Spec EC-10 dice ambos son válidos. Se usará log + saltar (no marcar fallido) para no saturar el historial.
- [ ] Los templates por defecto para recordatorios periódicos (1m/6m) también deberían usar `resolverTemplate()` o mantener su mensaje actual? Por ahora se mantienen igual (no están vinculados a categoría).
- [ ] La anticipación en el trigger (`cita.fecha - recordatorio_anticipacion días`) debe considerar si fechaProgramada ya pasó — si la cita es hoy, el recordatorio se crea con fechaProgramada = hoy.
