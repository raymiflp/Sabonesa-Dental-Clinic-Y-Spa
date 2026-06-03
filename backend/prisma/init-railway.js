import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚄 Inicializando base de datos para Railway...');

  // Crear usuarios por defecto si no existen
  const defaultUsers = [
    { nombre: 'Admin Betty', email: 'admin@betty.com', password: 'admin123', rol: 'admin' },
    { nombre: 'Dr. Rodríguez', email: 'doctor@betty.com', password: 'doctor123', rol: 'doctor' },
    { nombre: 'Asistente Betty', email: 'asistente@betty.com', password: 'asistente123', rol: 'asistente' },
  ];

  for (const user of defaultUsers) {
    const existing = await prisma.usuario.findUnique({ where: { email: user.email } });
    if (!existing) {
      const hashed = await bcrypt.hash(user.password, 10);
      await prisma.usuario.create({ data: { ...user, password: hashed } });
      console.log(`  ✅ Usuario creado: ${user.email} (${user.rol})`);
    } else {
      console.log(`  ⏭️  Usuario ya existe: ${user.email}`);
    }
  }

  // Crear categorías y procedimientos si no existen
  const categorias = [
    {
      nombre: 'Odontología General',
      procedimientos: [
        { nombre: 'Examen clínico', precio: 800 },
        { nombre: 'Profilaxis', precio: 1200 },
        { nombre: 'Destartraje', precio: 1500 },
        { nombre: 'Aplicación de flúor', precio: 600 },
        { nombre: 'Selladores de fosas y fisuras', precio: 800 },
        { nombre: 'Radiografía periapical', precio: 500 },
        { nombre: 'Radiografía panorámica', precio: 1500 },
      ],
    },
    {
      nombre: 'Endodoncia',
      procedimientos: [
        { nombre: 'Pulpotomía', precio: 2500 },
        { nombre: 'Pulpectomía', precio: 3500 },
        { nombre: 'Biopulpectomía', precio: 5000 },
        { nombre: 'Apicoformación', precio: 4000 },
        { nombre: 'Reimplante intencional', precio: 6000 },
        { nombre: 'Cirugía endodóntica (apicectomía)', precio: 8000 },
      ],
    },
    {
      nombre: 'Periodoncia',
      procedimientos: [
        { nombre: 'Raspado y alisado radicular (curetaje)', precio: 3000 },
        { nombre: 'Gingivectomía', precio: 3500 },
        { nombre: 'Gingivoplastia', precio: 3000 },
        { nombre: 'Colgajo periodontal', precio: 5000 },
        { nombre: 'Injerto gingival', precio: 6000 },
        { nombre: 'Mantenimiento periodontal', precio: 1500 },
      ],
    },
    {
      nombre: 'Cirugía Oral y Maxilofacial',
      procedimientos: [
        { nombre: 'Exodoncia simple', precio: 1500 },
        { nombre: 'Exodoncia compleja (quirúrgica)', precio: 3000 },
        { nombre: 'Tercer molar incluido (muela del juicio)', precio: 5000 },
        { nombre: 'Biopsia', precio: 3000 },
        { nombre: 'Frenectomía', precio: 4000 },
        { nombre: 'Cirugía pre-protésica', precio: 5000 },
        { nombre: 'Reducción de fractura maxilar', precio: 15000 },
      ],
    },
    {
      nombre: 'Rehabilitación Oral / Prostodoncia',
      procedimientos: [
        { nombre: 'Corona de metal-porcelana', precio: 8000 },
        { nombre: 'Corona libre de metal (Zirconia)', precio: 12000 },
        { nombre: 'Puente de 3 unidades', precio: 20000 },
        { nombre: 'Prótesis parcial removible', precio: 15000 },
        { nombre: 'Prótesis total (dentadura completa)', precio: 25000 },
        { nombre: 'Incrustación (inlay/onlay)', precio: 6000 },
        { nombre: 'Carilla estética (porcelana)', precio: 10000 },
        { nombre: 'Reconstrucción de muñón', precio: 3000 },
      ],
    },
    {
      nombre: 'Ortodoncia y Ortopedia',
      procedimientos: [
        { nombre: 'Consulta de ortodoncia', precio: 1000 },
        { nombre: 'Mantenimiento de ortodoncia', precio: 1500 },
        { nombre: 'Retenedor fijo', precio: 3000 },
        { nombre: 'Retenedor removible', precio: 3500 },
        { nombre: 'Aparatología ortopédica funcional', precio: 15000 },
      ],
    },
    {
      nombre: 'Odontopediatría',
      procedimientos: [
        { nombre: 'Examen clínico pediátrico', precio: 600 },
        { nombre: 'Profilaxis pediátrica', precio: 800 },
        { nombre: 'Selladores de fosas y fisuras', precio: 600 },
        { nombre: 'Pulpotomía (nervio)', precio: 2000 },
        { nombre: 'Corona de acero', precio: 2500 },
        { nombre: 'Extración pediátrica', precio: 1000 },
        { nombre: 'Mantenedor de espacio', precio: 3000 },
      ],
    },
    {
      nombre: 'Odontología Estética',
      procedimientos: [
        { nombre: 'Blanqueamiento dental', precio: 8000 },
        { nombre: 'Carilla de composite directa', precio: 4000 },
      ],
    },
    {
      nombre: 'Patología y Radiología Oral',
      procedimientos: [
        { nombre: 'Toma de biopsia', precio: 3000 },
        { nombre: 'Interpretación de estudios imagenológicos', precio: 1000 },
      ],
    },
  ];

  for (const cat of categorias) {
    let categoria = await prisma.categoriaProcedimiento.findUnique({ where: { nombre: cat.nombre } });
    if (!categoria) {
      categoria = await prisma.categoriaProcedimiento.create({ data: { nombre: cat.nombre } });
      console.log(`  ✅ Categoría creada: ${cat.nombre}`);
    }
    for (const proc of cat.procedimientos) {
      const exists = await prisma.procedimiento.findFirst({
        where: { nombre: proc.nombre, categoriaId: categoria.id },
      });
      if (!exists) {
        await prisma.procedimiento.create({
          data: { nombre: proc.nombre, precioSugerido: proc.precio, categoriaId: categoria.id },
        });
      }
    }
  }

  // Crear configuración por defecto
  const defaultConfig = [
    { clave: 'clinica_nombre', valor: 'Sabonesa Dental Clinic Y Spa' },
    { clave: 'clinica_direccion', valor: '' },
    { clave: 'clinica_telefono', valor: '' },
    { clave: 'whatsapp_provider_mode', valor: 'wa' },
    { clave: 'recordatorio_habilitado', valor: 'false' },
    { clave: 'recordatorio_hora', valor: '08:00' },
    { clave: 'recordatorio_anticipacion_dias', valor: '1' },
    { clave: 'backup_hora', valor: '23:00' },
  ];

  for (const cfg of defaultConfig) {
    const existing = await prisma.configuracion.findUnique({ where: { clave: cfg.clave } });
    if (!existing) {
      await prisma.configuracion.create({ data: cfg });
      console.log(`  ✅ Config creada: ${cfg.clave}`);
    }
  }

  console.log('✅ Inicialización completada.');
}

main()
  .catch((e) => {
    console.error('❌ Error en inicialización:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
