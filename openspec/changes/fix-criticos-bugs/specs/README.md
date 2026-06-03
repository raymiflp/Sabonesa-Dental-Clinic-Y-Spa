# Specs: Fix Críticos Bugs

Corrección de 3 bugs críticos en los módulos de Agenda, Pacientes e Historial Clínico.

---

## 1. Agenda — Auto-precio en Cobro

### Requirement: Cobro auto-completa con precio sugerido

When the user clicks **Cobrar ahora** on a completed appointment, the **Monto Pagado** field MUST auto-fill using `proc.precioSugerido` instead of `proc.precio`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | Completed cita with procedimiento that has `precioSugerido` ≠ null | User clicks "Cobrar ahora" | Monto Pagado auto-fills with `precioSugerido` value |
| Missing field | Procedimiento where `precioSugerido` is null | User clicks "Cobrar ahora" | Monto Pagado shows 0 or empty (no crash) |
| No procedimiento | Cita sin procedimiento asociado | User clicks "Cobrar ahora" | Monto Pagado shows 0 or empty (no crash) |

#### Acceptance Criteria
- [ ] `proc.precio` replaced by `proc.precioSugerido` at Agenda.jsx line ~175
- [ ] Valores nulos o undefined no causan error
- [ ] Sin cambios en el modelo de datos ni backend

---

## 2. Pacientes — Validar unicidad de cédula

### Requirement: Cédula única con error 409 claro

The system MUST validate cédula uniqueness before inserting a new paciente. If the cédula already exists, the endpoint MUST return HTTP 409 with body `{ error: "La cédula ya está registrada" }`. If the cédula is unique, MUST proceed with creation and return 201.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Unique cédula | No paciente con cédula "12345" | POST /api/pacientes with cédula "12345" | 201 + paciente creado |
| Duplicate cédula | Paciente exists with cédula "12345" | POST /api/pacientes with same cédula "12345" | 409 + `"La cédula ya está registrada"` |
| PUT update same cédula | Paciente updates their own record | PUT /api/pacientes/:id without changing cédula | 200 (no false positive on same cédula) |
| Concurrent duplicate | Two simultaneous POST with same cédula | Both processed | At most one 201, others 409 |

#### Acceptance Criteria
- [ ] `pacientes.create()` controller checks `findUnique({ cedula })` before `prisma.paciente.create()`
- [ ] Error 409 con mensaje claro, no 500 genérico
- [ ] Actualización (PUT) no bloquea falsamente por la misma cédula del mismo paciente

---

## 3. HistorialClínico — Fotos fallidas

### Requirement: Filtrar fotos sin URL antes de guardar

The system MUST filter out photos where `url` is `null`, `undefined`, or empty string from the payload sent to the backend when saving a HistorialClínico record.

### Requirement: Indicar error visual en fotos fallidas

The UI SHOULD display a visual error indicator (e.g., red border, error icon, or "Error al subir" text) next to photos that failed to upload, without removing them from the upload list.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| All succeed | 3 photos uploaded, all have url | User saves HC | All 3 sent to backend, saved correctly |
| Some fail | 5 selected, 3 succeed (url), 2 fail (null) | User saves HC | Only 3 photos sent to backend |
| All fail | 2 selected, both fail (null url) | User saves HC | Empty array `[]` sent, no broken images |
| Reload after failures | HC saved with 0 photos (all failed) | User reloads page | No broken image placeholders rendered |
| Error indicator | Photo fails during upload | Upload completes | Red border + "Error al subir" shown on that thumbnail |

#### Acceptance Criteria
- [ ] `filter(p => p.url)` applied before sending photos payload at HistorialClinico.jsx
- [ ] Fotos fallidas muestran indicación visual de error (no desaparecen silenciosamente)
- [ ] Backend nunca recibe objetos foto sin url
- [ ] Al recargar la página no se renderizan imágenes rotas

---

## Archivos afectados

| Archivo | Bug | Cambio |
|---------|-----|--------|
| `frontend/src/pages/Agenda.jsx` | 1 | `proc.precio` → `proc.precioSugerido` (~line 175) |
| `backend/src/controllers/pacientes.js` | 2 | Validar unicidad de cédula antes de insert (~lines 32-38) |
| `frontend/src/pages/HistorialClinico.jsx` | 3 | Filtrar fotos sin url + error UI (~lines 256-261) |

## Límites del cambio

- Sin cambios en schema de BD ni modelos Prisma
- Sin alteraciones en rutas, layouts, o UI/UX mayores
- Solo los 3 archivos listados arriba
