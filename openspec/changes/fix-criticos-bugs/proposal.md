# Proposal: Fix críticos bugs

## Intent
Corregir 3 bugs críticos identificados en la auditoría de código del Sistema Betty que causan pérdida de datos, errores silenciosos y malfuncionamiento de funcionalidades core.

## Bugs a corregir

### Bug 1: Agenda — Auto-precio en Cobro usa propiedad incorrecta
**Archivo**: `frontend/src/pages/Agenda.jsx` línea 175
**Problema**: Busca `proc.precio` pero el modelo Prisma devuelve `precioSugerido`. El auto-fill del monto a cobrar nunca funciona.
**Fix**: Cambiar `proc.precio` → `proc.precioSugerido`

### Bug 2: Pacientes — Error 500 feo al duplicar cédula
**Archivo**: `backend/src/controllers/pacientes.js` líneas 32-38
**Problema**: `create()` no valida unicidad de cédula antes de insertar. Prisma lanza error `Unique constraint failed` y se devuelve como 500 genérico.
**Fix**: Validar si la cédula ya existe antes de crear, devolver error 409 claro.

### Bug 3: HistorialClínico — Fotos con error de subida se pierden al guardar
**Archivo**: `frontend/src/pages/HistorialClinico.jsx` líneas 256-261
**Problema**: Si una foto falla al subir al servidor, queda con `url: null`. Al guardar el HC, el `map()` persiste objetos incompletos. Al recargar, la foto aparece como rota.
**Fix**: Filtrar fotos sin `url` antes de guardar, y mostrar estado de error claro.

## Scope
- Solo código fuente, no toca schema de BD ni modelos
- 3 archivos: 1 backend (pacientes controller), 2 frontend (Agenda, HistorialClinico)
- Sin cambios en UI/UX mayores
