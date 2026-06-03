# Proposal: Recordatorios Personalizados y Automáticos

## Intent

Recordatorios hardcodeados, genéricos y manuales. Flags `recordatorio_auto/hora/anticipacion` en BD pero sin código que las use. Personalizar mensajes por categoría de procedimiento y automatizar envíos.

## Scope

**In**: PlantillaRecordatorio x CategoriaProcedimiento con `{{paciente/fecha/hora/clinica/doctor}}`; trigger en `agenda.create()`; scheduler node-cron diario; panel de templates con preview; respetar `tieneWhatsapp`.
**Out**: API WhatsApp Business; cambiar flujo wa.me; migrar datos existentes; multilenguaje.

## Capabilities

### New
- `recordatorios-templates`: CRUD plantillas por categoría + fallback
- `recordatorios-auto-trigger`: Creación automática al agendar cita
- `recordatorios-scheduler`: Tarea node-cron diaria

### Modified
- `recordatorios`: `enviar`/`enviarMasivo` usan templates. `getPendientes` filtra por `tieneWhatsapp`.

## Approach

3 componentes independientes (paralelizables): (1) modelo `PlantillaRecordatorio` + FK a categoría; (2) trigger en `agenda.create()` lee config y crea Recordatorio; (3) scheduler node-cron busca citas en ventana, genera mensaje con template o fallback, crea Recordatorio pendiente con link wa.me. Frontend: nuevo tab "Plantillas" con editor + preview.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | New | Modelo PlantillaRecordatorio |
| `backend/package.json` | Modified | +node-cron |
| `backend/src/controllers/recordatorios.js` | Modified | Templates + filtro whatsapp |
| `backend/src/controllers/agenda.js` | Modified | Trigger en create |
| `backend/src/index.js` | Modified | Init scheduler |
| `backend/src/routes/recordatorios.js` | Modified | CRUD templates |
| `frontend/src/api.js` | Modified | Métodos templates |
| `frontend/src/pages/Recordatorios.jsx` | Modified | Tab Plantillas + preview |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Duplicados al reiniciar server | Medium | Upsert por citaId+tipo |
| Scheduler muere con el proceso | Low | Best-effort, no crítico |
| Template sin categoría | Low | Fallback a mensaje actual |

## Rollback Plan

1. **Schema**: eliminar modelo, `prisma db push`
2. **Trigger**: comentar bloque en `agenda.create()`
3. **Scheduler**: eliminar init en `index.js`
4. **Frontend**: eliminar tab Plantillas

## Dependencies

- `npm install node-cron`

## Success Criteria

- [ ] Crear cita con `recordatorio_auto=true` → recordatorio pendiente visible
- [ ] Scheduler genera links wa.me con mensajes por categoría
- [ ] Panel templates: editar y preview en vivo
- [ ] `tieneWhatsapp=false` → no genera link
- [ ] Sin template → mensaje genérico de fallback
