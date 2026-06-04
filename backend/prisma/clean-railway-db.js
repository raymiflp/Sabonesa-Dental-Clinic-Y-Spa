// Use DATABASE_PUBLIC_URL directly with a simple SQL approach
// We need to pipe SQL to postgres. Let's use child_process instead.
import { spawnSync } from 'child_process';

const DB_URL = 'postgresql://postgres:INIMtlcbevrhZRExNSppUKogSeXkljAy@zephyr.proxy.rlwy.net:30774/railway';

// Delete in order respecting FK constraints
const sql = `
DELETE FROM "Recordatorio";
DELETE FROM "Presupuesto";
DELETE FROM "Crediticio";
DELETE FROM "Cita";
DELETE FROM "HistorialClinico";
DELETE FROM "Paciente";
DELETE FROM "Procedimiento";
DELETE FROM "CategoriaProcedimiento";
DELETE FROM "Insumo";
DELETE FROM "Configuracion";

-- Verify Usuarios preserved
SELECT 'Usuarios preservados:' as info, COUNT(*) as total FROM "Usuario";
`;

const result = spawnSync('psql', [DB_URL, '-c', sql], { encoding: 'utf8', shell: true });
console.log(result.stdout);
if (result.stderr) console.error(result.stderr);

// Now count remaining
const countSql = `
SELECT 'Paciente' as tabla, COUNT(*) FROM "Paciente"
UNION ALL SELECT 'Usuario', COUNT(*) FROM "Usuario"
UNION ALL SELECT 'Cita', COUNT(*) FROM "Cita"
UNION ALL SELECT 'Crediticio', COUNT(*) FROM "Crediticio"
UNION ALL SELECT 'HistorialClinico', COUNT(*) FROM "HistorialClinico"
UNION ALL SELECT 'Procedimiento', COUNT(*) FROM "Procedimiento"
UNION ALL SELECT 'CategoriaProcedimiento', COUNT(*) FROM "CategoriaProcedimiento"
UNION ALL SELECT 'Insumo', COUNT(*) FROM "Insumo"
UNION ALL SELECT 'Configuracion', COUNT(*) FROM "Configuracion"
UNION ALL SELECT 'Presupuesto', COUNT(*) FROM "Presupuesto"
UNION ALL SELECT 'Recordatorio', COUNT(*) FROM "Recordatorio"
ORDER BY tabla;
`;

const result2 = spawnSync('psql', [DB_URL, '-c', countSql], { encoding: 'utf8', shell: true });
console.log(result2.stdout);
if (result2.stderr) console.error(result2.stderr);
