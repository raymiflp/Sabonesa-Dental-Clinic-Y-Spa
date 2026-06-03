# Recordatorios — Scheduler Specification

## Purpose

A `node-cron` background job that processes pending recordatorios. Runs every minute, queries recordatorios with `fechaProgramada <= today`, and sends them via WhatsApp URL generation.

## Requirements

### Requirement: Inicialización del scheduler (ejecución cada minuto)

The system MUST, when starting the Express server (`index.js`), register a cron job using `node-cron`. The cron MUST run **every minute** (`* * * * *`). On each tick, the handler MUST read all current configuration (including `recordatorio_hora`) to reflect hot changes. The server MUST import `initScheduler` from `./scheduler.js` and call it after `app.listen()`.

> Implementation note: The original design specified daily execution at a configured hour (`config.recordatorio_hora`). The actual implementation runs every minute to simplify cron management and allow configuration changes to take effect immediately without server restart.

### Requirement: Ejecución del scheduler

On each tick, the scheduler MUST:
1. Read `config.recordatorio_auto`. If `'false'`, abort without executing.
2. Query `Recordatorio` with `estado = 'pendiente'` and `fechaProgramada <= hoy` (lte — less than or equal to current date in ISO `YYYY-MM-DD` format).
3. For each recordatorio found, verify the associated patient has `tieneWhatsapp = true` and `telefono` is not empty.
4. If the patient qualifies: generate `whatsappUrl` (wa.me URL with encoded message), update the recordatorio to `estado = 'enviado'`, `enviadoEn = new Date()`, `whatsappUrl = generated_url`.
5. If the patient does not qualify: log and skip (do NOT mark as `'fallido'`).

> Implementation note: The original design specified an exact date match (`fechaProgramada = hoy`). The actual implementation uses `lte` (less than or equal) to process backlogged reminders that were not sent for any reason, offering greater fault tolerance.

## Scenarios

### HC-4: Scheduler envía recordatorios pendientes (cada minuto, query lte)

- GIVEN `config.recordatorio_auto = 'true'`
- AND the scheduler runs **every minute** (`* * * * *`)
- AND 3 `Recordatorio` exist with `estado = 'pendiente'` and `fechaProgramada <= '2026-06-02'`
- AND all 3 patients have `tieneWhatsapp = true`
- WHEN the cron executes (at any minute)
- THEN all 3 recordatorios change to `estado = 'enviado'`
- AND each has `whatsappUrl` formatted as `https://wa.me/{telefono}?text={mensaje_codificado}`
- AND `enviadoEn` has the current date/time

### EC-8: No hay recordatorios pendientes con fechaProgramada <= hoy

- GIVEN `config.recordatorio_auto = 'true'`
- AND no `Recordatorio` exists with `fechaProgramada <= '2026-06-02'` and `estado = 'pendiente'`
- WHEN the cron executes
- THEN no records are modified
- AND no error is thrown

### EC-9: recordatorio_auto = false en scheduler

- GIVEN `config.recordatorio_auto = 'false'`
- WHEN the cron executes
- THEN no logic runs (aborts early)

### EC-10: Paciente sin WhatsApp en scheduler

- GIVEN a pending `Recordatorio` for today
- AND the associated patient has `tieneWhatsapp = false`
- WHEN the cron executes
- THEN the recordatorio is skipped with a log entry
- AND no `whatsappUrl` is generated
- AND the recordatorio remains in `'pendiente'` state
