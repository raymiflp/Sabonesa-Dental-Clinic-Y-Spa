import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanDemo() {
  console.log('🧹 Limpiando datos demo...');
  console.log('   (Se conservan: Categorías, Procedimientos, Usuarios, Configuración)\n');

  // 1. Contar registros antes de borrar
  const countsBefore = {
    Recordatorio: await prisma.recordatorio.count(),
    Presupuesto: await prisma.presupuesto.count(),
    Crediticio: await prisma.crediticio.count(),
    Cita: await prisma.cita.count(),
    HistorialClinico: await prisma.historialClinico.count(),
    Paciente: await prisma.paciente.count(),
    Insumo: await prisma.insumo.count(),
  };

  console.log('📊 Registros encontrados:');
  for (const [table, count] of Object.entries(countsBefore)) {
    console.log(`   ${table}: ${count}`);
  }

  // 2. Borrar en orden (respetando FK)
  console.log('\n🗑️  Eliminando datos...');
  
  const delRecordatorios = await prisma.recordatorio.deleteMany();
  console.log(`   ✅ Recordatorios: ${delRecordatorios.count} eliminados`);

  const delPresupuestos = await prisma.presupuesto.deleteMany();
  console.log(`   ✅ Presupuestos: ${delPresupuestos.count} eliminados`);

  const delCrediticios = await prisma.crediticio.deleteMany();
  console.log(`   ✅ Crediticios: ${delCrediticios.count} eliminados`);

  const delCitas = await prisma.cita.deleteMany();
  console.log(`   ✅ Citas: ${delCitas.count} eliminadas`);

  const delHC = await prisma.historialClinico.deleteMany();
  console.log(`   ✅ Historiales Clínicos: ${delHC.count} eliminados`);

  const delPacientes = await prisma.paciente.deleteMany();
  console.log(`   ✅ Pacientes: ${delPacientes.count} eliminados`);

  const delInsumos = await prisma.insumo.deleteMany();
  console.log(`   ✅ Insumos: ${delInsumos.count} eliminados`);

  // 3. Verificar que lo que se conserva sigue intacto
  const categorias = await prisma.categoriaProcedimiento.count();
  const procedimientos = await prisma.procedimiento.count();
  const usuarios = await prisma.usuario.count();
  const configs = await prisma.configuracion.count();

  console.log('\n🔒 Datos conservados:');
  console.log(`   ✅ Categorías: ${categorias}`);
  console.log(`   ✅ Procedimientos: ${procedimientos}`);
  console.log(`   ✅ Usuarios: ${usuarios}`);
  console.log(`   ✅ Configuraciones: ${configs}`);

  console.log('\n✨ Limpieza completada.');
  console.log('⚠️  Ahora seed.js NO regenerará estos datos porque los procedimientos existen.');
}

cleanDemo()
  .catch((e) => {
    console.error('❌ Error durante la limpieza:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
