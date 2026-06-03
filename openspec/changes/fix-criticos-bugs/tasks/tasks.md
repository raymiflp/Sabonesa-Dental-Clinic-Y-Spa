# Tasks: Fix críticos bugs

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~26 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR (3 bugs independientes) |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Agenda — Auto-precio en Cobro

- [x] **1.1** Agenda.jsx ~L175: cambiar `proc.precio` → `proc.precioSugerido`
- [x] **1.2** Verificar que valores `null`/`undefined` en `precioSugerido` no causan crash (optional chaining o fallback a 0)

**Archivo**: `frontend/src/pages/Agenda.jsx`
**AC**: Cobro auto-completa con `precioSugerido`; valores nulos no rompen el UI

## Phase 2: Pacientes — Validar unicidad de cédula

- [x] **2.1** En `pacientes.create()`, antes de `prisma.paciente.create()`, buscar `findUnique({ cedula })`
- [x] **2.2** Si existe, devolver `res.status(409).json({ error: "La cédula ya está registrada" })`
- [x] **2.3** En `pacientes.update()` (PUT), excluir al mismo paciente de la validación para evitar falso positivo

**Archivo**: `backend/src/controllers/pacientes.js`
**AC**: POST duplicado → 409 claro; PUT con misma cédula → 200; concurrencia tolerada

## Phase 3: HistorialClínico — Fotos fallidas

- [x] **3.1** Antes de enviar fotos al backend, aplicar `filter(p => p.url)` para excluir objetos sin URL
- [x] **3.2** Mostrar indicador visual de error (borde rojo + texto "Error al subir") en thumbnails de fotos fallidas
- [x] **3.3** Verificar que al recargar la página no se renderizan imágenes rotas

**Archivo**: `frontend/src/pages/HistorialClinico.jsx`
**AC**: Payload nunca incluye fotos sin url; UI muestra error visual; recarga limpia

## Verificación

- [ ] **4.1** Smoke test manual: flujo de Cobro en Agenda con y sin precio sugerido
- [ ] **4.2** Smoke test manual: POST paciente cédula duplicada → 409; PUT misma cédula → 200
- [ ] **4.3** Smoke test manual: subir fotos mixtas (éxito/fallo) y verificar filtro + error visual
