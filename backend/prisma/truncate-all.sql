-- Delete demo data, keep Usuarios
TRUNCATE TABLE "Recordatorio" CASCADE;
TRUNCATE TABLE "Crediticio" CASCADE;
TRUNCATE TABLE "Cita" CASCADE;
TRUNCATE TABLE "Presupuesto" CASCADE;
TRUNCATE TABLE "HistorialClinico" CASCADE;
TRUNCATE TABLE "Procedimiento" CASCADE;
TRUNCATE TABLE "CategoriaProcedimiento" CASCADE;
TRUNCATE TABLE "Paciente" CASCADE;
TRUNCATE TABLE "Insumo" CASCADE;
TRUNCATE TABLE "Configuracion" CASCADE;
-- Usuario table INTENTIONALLY NOT TRUNCATED - keep login accounts
