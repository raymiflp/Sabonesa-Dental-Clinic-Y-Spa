# Demo Data Specification

## Purpose

Provide a rich, idempotent seed script that populates the database with realistic Dominican dental clinic data for demonstration and client review.

## Requirements

### Requirement: Patient Data

The seed MUST create at least 20 patients with realistic Dominican names, cédulas, phone numbers, addresses, and varied demographics.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Patients created | Fresh database | Seed runs | 20+ Paciente records with unique cédulas |
| Varied data | Patients created | Seed runs | Mix of ages, sexes, education levels, occupations |

### Requirement: Procedure Catalog

The seed MUST create at least 9 procedure categories with 80+ procedimientos total, each with a suggested price.

#### Scenario: Full Catalog

- GIVEN a fresh database
- WHEN the seed runs
- THEN 9+ CategoriaProcedimiento and 80+ Procedimiento records exist with valid relations

### Requirement: Appointments (Citas)

The seed MUST create appointments for each patient with varied dates (past, present, future) and states (pendiente, realizada, cancelada).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Appointments created | Seed completes | Check Cita table | 20+ citas with pacienteId, fecha, hora, procedimiento, estado |

### Requirement: Credit Transactions

The seed MUST create 2-6 crediticio entries per patient with realistic amounts and varied dates.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Payments created | Seed completes | Check Crediticio table | 40+ entries with montoPagado, montoAbonado linked to pacientes |

### Requirement: Inventory (Insumos)

The seed MUST create at least 50 inventory items across categories (anesthetics, resins, instruments, sterilization, etc.) with realistic stock values.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Inventory seeded | Seed completes | Check Insumo table | 50+ items with nombre, cantidad, precioUnitario |

### Requirement: Reminders (Recordatorios)

The seed MUST create at least one reminder per patient with appropriate type (1-month for ortho, 6-month for general).

#### Scenario: Recordatorios Created

- GIVEN seed completes
- WHEN Recordatorio table is queried
- THEN one recordatorio per patient exists with correct tipo and estado

### Requirement: Idempotency

The seed MUST be safe to re-run. It SHALL use deleteMany followed by recreate (seed.js) or upsert patterns (init-railway.js) so consecutive executions do not fail or create duplicates.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| First run | Empty database | Seed executes | All data created successfully |
| Consecutive run | Database already seeded | Seed executes | No duplicate-key errors, data replaced cleanly |

#### Edge Case: Partial Seed

- GIVEN a seed script fails mid-way (e.g., network error)
- WHEN re-run
- THEN it completes without partial-state errors
