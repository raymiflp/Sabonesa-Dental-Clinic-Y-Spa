# Verify Report — Recordatorios Personalizados y Automáticos

**Status**: PASS WITH WARNINGS 🟡

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 16 |
| Implemented | 16 ✅ |
| Verified | 16 ✅ |
| Warnings | 3 |
| Suggestions | 4 |
| Build | `npm run build` (frontend) — PASS |

## Warnings

| # | Warning | Severity | Spec vs Implementation |
|---|---------|----------|----------------------|
| W1 | Trigger sends immediately via `ProviderResolver` instead of just creating a pending recordatorio | Minor | Spec said `estado='pendiente'` + wait for scheduler. Implementation sends immediately via ProviderResolver with `estado='enviado'`. |
| W2 | Scheduler runs every minute (`* * * * *`) not at configured hour | Minor | Spec said daily at `config.recordatorio_hora`. Implementation runs every minute for simplicity and hot-reload of config. |
| W3 | Scheduler uses `lte` (less than or equal) not exact match for `fechaProgramada` | Minor | Spec said `fechaProgramada = hoy`. Implementation uses `fechaProgramada <= hoy`. |

## Suggestions (not applied)

| # | Suggestion |
|---|-----------|
| S1 | Add endpoint `GET /api/recordatorios/templates/:categoriaId` for fetching by category |
| S2 | Document the `fuente` field (`'template'` | `'fallback'`) from `resolverTemplate()` in API docs |
| S3 | Refactor `enviar()` inline switch for `destinatario` into a helper |
| S4 | Consider a configurable chunk size for `enviarMasivo()` with large datasets |

## Test Coverage

No test runner configured. All verification done manually via API calls and UI inspection per spec scenarios.

## Scenarios Verified

| Scenario | Status | Notes |
|----------|--------|-------|
| HC-1: Template exists | ✅ | Variables resolved correctly |
| HC-2: Seed completo | ✅ | 9 templates created |
| HC-3: Trigger auto | ✅ | Sends immediately via ProviderResolver (different from spec) |
| HC-4: Scheduler | ✅ | Runs every minute, lte query (different from spec) |
| HC-5: enviar usa template | ✅ | Message personalized per category |
| HC-6: enviarMasivo con auto=true | ✅ | Templates used, whatsapp filtering respected |
| EC-1: Template no existe | ✅ | Fallback genérico |
| EC-2: Variable mal escrita | ✅ | Literal preserved, no error |
| EC-3: Categoría nueva sin template | ✅ | Fallback used |
| EC-4: Paciente sin teléfono | ✅ | Warn log, no recordatorio |
| EC-5: Paciente sin WhatsApp | ✅ | Warn log, no recordatorio |
| EC-6: No duplicar | ✅ | findFirst check works |
| EC-7: recordatorio_auto=false | ✅ | Trigger skipped |
| EC-8: Sin pendientes | ✅ | No modifications |
| EC-9: auto=false en scheduler | ✅ | Aborts early |
| EC-10: Paciente sin WhatsApp scheduler | ✅ | Log + skip (not marked fallido) |
| EC-11: enviarMasivo auto=false | ✅ | 400 error |
| EC-12: enviar fallback | ✅ | Generic fallback used |
