import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding E2E test database...');

  const hashedPassword = await bcrypt.hash('Test1234!', 10);

  // ===== USUARIOS =====
  const usuarios = [
    { email: 'admin@betty.com', nombre: 'Admin', password: hashedPassword, rol: 'admin' },
    { email: 'doctor@betty.com', nombre: 'Dr. Gómez', password: hashedPassword, rol: 'doctor' },
    { email: 'asistente@betty.com', nombre: 'Ana Asistente', password: hashedPassword, rol: 'asistente' },
  ];
  for (const u of usuarios) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: { nombre: u.nombre, password: u.password, rol: u.rol, activo: true },
      create: u,
    });
  }
  console.log(`  ✅ ${usuarios.length} usuarios`);

  // ===== PACIENTES =====
  const pacientesData = [
    { nombres: 'Juan', apellidos: 'Pérez', cedula: '001-1111111-1', telefono: '809-555-1001' },
    { nombres: 'María', apellidos: 'García', cedula: '001-2222222-2', telefono: '809-555-1002' },
    { nombres: 'Carlos', apellidos: 'López', cedula: '001-3333333-3', telefono: '809-555-1003' },
  ];

  const pacientes = [];
  for (const pd of pacientesData) {
    const p = await prisma.paciente.upsert({
      where: { cedula: pd.cedula },
      update: { nombres: pd.nombres, apellidos: pd.apellidos, telefono: pd.telefono },
      create: pd,
    });
    pacientes.push(p);
  }
  console.log(`  ✅ ${pacientes.length} pacientes`);

  // Historial clínico para Juan Pérez
  await prisma.historialClinico.upsert({
    where: { pacienteId: pacientes[0].id },
    update: {
      antecedentes: ['Alergia a penicilina'],
      saludGeneral: 'Buena',
      observaciones: 'Paciente de prueba E2E',
    },
    create: {
      pacienteId: pacientes[0].id,
      antecedentes: ['Alergia a penicilina'],
      saludGeneral: 'Buena',
      observaciones: 'Paciente de prueba E2E',
    },
  });

  // ===== CITAS =====
  // Delete existing citas for these patients first to avoid conflicts
  await prisma.cita.deleteMany({
    where: { pacienteId: { in: pacientes.map((p) => p.id) } },
  });

  const citas = [
    { pacienteId: pacientes[2].id, fecha: '2026-06-20', hora: '09:00', procedimiento: 'Consulta general', estado: 'pendiente' },
    { pacienteId: pacientes[0].id, fecha: '2026-06-22', hora: '10:30', procedimiento: 'Limpieza dental', estado: 'confirmada' },
  ];
  for (const c of citas) {
    await prisma.cita.create({ data: c });
  }
  console.log(`  ✅ ${citas.length} citas`);

  // ===== CREDITICIOS =====
  // Delete existing crediticios for these patients first
  await prisma.crediticio.deleteMany({
    where: { pacienteId: { in: pacientes.map((p) => p.id) } },
  });

  const crediticios = [
    { pacienteId: pacientes[1].id, procedimiento: 'Limpieza dental', montoPagado: 1500, montoAbonado: 500, descuento: 10, fecha: '2026-06-10' },
    { pacienteId: pacientes[1].id, procedimiento: 'Consulta', montoPagado: 800, montoAbonado: 0, descuento: 0, fecha: '2026-06-12' },
  ];
  for (const cr of crediticios) {
    await prisma.crediticio.create({ data: cr });
  }
  console.log(`  ✅ ${crediticios.length} crediticios`);

  // ===== CATEGORÍAS Y PROCEDIMIENTOS =====
  const categoriasData = [
    {
      nombre: 'Odontología General',
      procedimientos: [
        { nombre: 'Consulta general', precioSugerido: 800 },
        { nombre: 'Limpieza dental', precioSugerido: 1200 },
        { nombre: 'Destartraje', precioSugerido: 1500 },
      ],
    },
    {
      nombre: 'Cirugía',
      procedimientos: [
        { nombre: 'Exodoncia simple', precioSugerido: 1500 },
        { nombre: 'Exodoncia compleja', precioSugerido: 3000 },
      ],
    },
  ];

  for (const cd of categoriasData) {
    const cat = await prisma.categoriaProcedimiento.upsert({
      where: { nombre: cd.nombre },
      update: {},
      create: { nombre: cd.nombre },
    });

    // Get existing procedures for this category
    const existingProcs = await prisma.procedimiento.findMany({
      where: { categoriaId: cat.id },
    });
    const existingNames = new Set(existingProcs.map((p) => p.nombre));

    for (const pd of cd.procedimientos) {
      if (!existingNames.has(pd.nombre)) {
        await prisma.procedimiento.create({
          data: {
            nombre: pd.nombre,
            precioSugerido: pd.precioSugerido,
            categoriaId: cat.id,
          },
        });
      }
    }
  }
  console.log(`  ✅ ${categoriasData.length} categorías con procedimientos`);

  // ===== INSUMOS =====
  // Delete existing insumos first for clean state
  await prisma.insumo.deleteMany();

  const insumos = [
    { nombre: 'Guantes', cantidad: 50, precioUnitario: 450, proveedor: 'Descartables RD' },
    { nombre: 'Mascarillas', cantidad: 10, precioUnitario: 350, proveedor: 'Descartables RD' },
    { nombre: 'Anestesia', cantidad: 0, precioUnitario: 55, proveedor: 'DentalFarma' },
  ];
  for (const i of insumos) {
    await prisma.insumo.create({ data: i });
  }
  console.log(`  ✅ ${insumos.length} insumos`);

  // ===== CONFIGURACIONES =====
  const configs = [
    { clave: 'whatsapp_provider_mode', valor: 'manual' },
    { clave: 'notificaciones_activas', valor: 'false' },
  ];
  for (const cfg of configs) {
    await prisma.configuracion.upsert({
      where: { clave: cfg.clave },
      update: { valor: cfg.valor },
      create: cfg,
    });
  }
  console.log(`  ✅ ${configs.length} configuraciones`);

  console.log('✅ E2E seed completado');
}

seed()
  .catch((e) => {
    console.error('❌ Error seeding E2E database:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
