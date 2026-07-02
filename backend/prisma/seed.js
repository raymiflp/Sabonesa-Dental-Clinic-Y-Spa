import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

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
      { nombre: 'Radiografía aleta de mordida', precio: 400 },
    ]
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
    ]
  },
  {
    nombre: 'Periodoncia',
    procedimientos: [
      { nombre: 'Raspado y alisado radicular (curetaje)', precio: 3000 },
      { nombre: 'Gingivectomía', precio: 3500 },
      { nombre: 'Gingivoplastia', precio: 3000 },
      { nombre: 'Cirugía de colgajo', precio: 5000 },
      { nombre: 'Frenulectomía', precio: 2500 },
      { nombre: 'Frenuloplastia', precio: 3000 },
      { nombre: 'Injerto gingival', precio: 8000 },
      { nombre: 'Alargamiento coronario', precio: 4000 },
      { nombre: 'Regeneración tisular guiada', precio: 12000 },
    ]
  },
  {
    nombre: 'Cirugía Oral y Maxilofacial',
    procedimientos: [
      { nombre: 'Exodoncia simple', precio: 1500 },
      { nombre: 'Exodoncia compleja', precio: 3000 },
      { nombre: 'Odontosección', precio: 3500 },
      { nombre: 'Germectomía', precio: 3000 },
      { nombre: 'Alveoloplastia', precio: 4000 },
      { nombre: 'Osteotomía', precio: 8000 },
      { nombre: 'Cirugía de terceros molares', precio: 5000 },
      { nombre: 'Biopsia oral', precio: 3000 },
      { nombre: 'Tratamiento de quistes maxilares', precio: 10000 },
      { nombre: 'Tratamiento de tumores maxilares', precio: 15000 },
      { nombre: 'Reducción de fracturas maxilofaciales', precio: 20000 },
      { nombre: 'Injerto óseo autólogo', precio: 25000 },
      { nombre: 'Injerto óseo heterólogo', precio: 20000 },
      { nombre: 'Injerto óseo sintético', precio: 18000 },
      { nombre: 'Implantología dental', precio: 30000 },
      { nombre: 'Elevación de seno maxilar', precio: 25000 },
    ]
  },
  {
    nombre: 'Rehabilitación Oral / Prostodoncia',
    procedimientos: [
      { nombre: 'Obturación (resina/amalgama)', precio: 1500 },
      { nombre: 'Incrustación (inlay/onlay/overlay)', precio: 5000 },
      { nombre: 'Corona metal-porcelana', precio: 6000 },
      { nombre: 'Corona cerámica pura', precio: 10000 },
      { nombre: 'Corona zirconio', precio: 15000 },
      { nombre: 'Puente fijo', precio: 8000 },
      { nombre: 'Prótesis total', precio: 25000 },
      { nombre: 'Prótesis parcial removible', precio: 15000 },
      { nombre: 'Prótesis sobre implantes (híbridas/sobredentaduras)', precio: 35000 },
      { nombre: 'Perno muñón', precio: 3000 },
      { nombre: 'Carillas de porcelana', precio: 8000 },
      { nombre: 'Carillas de composite', precio: 4000 },
      { nombre: 'Valplast', precio: 12000 },
    ]
  },
  {
    nombre: 'Ortodoncia y Ortopedia',
    procedimientos: [
      { nombre: 'Cefalometría', precio: 2000 },
      { nombre: 'Análisis de modelos', precio: 1500 },
      { nombre: 'Instalación de aparatología fija (brackets)', precio: 15000 },
      { nombre: 'Expansión maxilar', precio: 8000 },
      { nombre: 'Ortodoncia interceptiva', precio: 10000 },
      { nombre: 'Distalización molar', precio: 5000 },
      { nombre: 'Mentonera', precio: 4000 },
      { nombre: 'Máscara facial', precio: 6000 },
      { nombre: 'Alineadores transparentes', precio: 25000 },
      { nombre: 'Mantenedor de espacio', precio: 2500 },
      { nombre: 'Retenedores fijos', precio: 3000 },
      { nombre: 'Retenedores removibles', precio: 4000 },
    ]
  },
  {
    nombre: 'Odontopediatría',
    procedimientos: [
      { nombre: 'Mantenedor de espacio', precio: 2500 },
      { nombre: 'Corona de acero cromo', precio: 2000 },
      { nombre: 'Pulpotomía', precio: 2000 },
      { nombre: 'Exodoncia de dientes temporales', precio: 1000 },
      { nombre: 'Operatorio', precio: 2500 },
    ]
  },
  {
    nombre: 'Odontología Estética',
    procedimientos: [
      { nombre: 'Blanqueamiento dental profesional', precio: 8000 },
      { nombre: 'Blanqueamiento dental ambulatorio', precio: 5000 },
      { nombre: 'Microabrasión', precio: 3000 },
      { nombre: 'Contorneo estético', precio: 2500 },
      { nombre: 'Gingivoplastia estética', precio: 3500 },
    ]
  },
  {
    nombre: 'Patología y Radiología Oral',
    procedimientos: [
      { nombre: 'Biopsia incisional', precio: 3000 },
      { nombre: 'Biopsia excisional', precio: 4000 },
      { nombre: 'Citología exfoliativa', precio: 1500 },
      { nombre: 'Tomografía computarizada de haz cónico (CBCT)', precio: 5000 },
      { nombre: 'Sialografía', precio: 4000 },
      { nombre: 'Resonancia magnética de la ATM', precio: 8000 },
    ]
  }
];

const pacientes = [
  // === 5 originales con datos mejorados ===
  {
    nombres: 'María', apellidos: 'González Reyes',
    cedula: '001-1234567-8', telefono: '809-555-0101', email: 'maria.gonzalez@gmail.com',
    tieneWhatsapp: true, direccion: 'Calle Principal #45', sector: 'Los Prados', edad: 35,
    sexo: 'Femenino', estadoCivil: 'Casado/a', ocupacion: 'Abogada', nivelEducativo: 'Universitario',
    esOrtodoncia: false, tieneAntecedentes: ['Alergias Medicamentosas'], tienePatologias: ['Apiñamiento'],
  },
  {
    nombres: 'Juan', apellidos: 'Pérez Martínez',
    cedula: '001-2345678-9', telefono: '809-555-0202', email: 'juan.perez@hotmail.com',
    tieneWhatsapp: true, direccion: 'Av. Independencia #123', sector: 'Gazcue', edad: 42,
    sexo: 'Masculino', estadoCivil: 'Divorciado/a', ocupacion: 'Ingeniero Civil', nivelEducativo: 'Universitario',
    esOrtodoncia: false, tieneAntecedentes: [], tienePatologias: [],
  },
  {
    nombres: 'Ana', apellidos: 'Ramírez de la Cruz',
    cedula: '402-3456789-0', telefono: '829-555-0303', email: 'ana.ramirez@outlook.com',
    tieneWhatsapp: true, direccion: 'Calle Las Flores #7', sector: 'Ensanche Ozama', edad: 28,
    sexo: 'Femenino', estadoCivil: 'Soltero/a', ocupacion: 'Diseñadora Gráfica', nivelEducativo: 'Universitario',
    esOrtodoncia: true, tieneAntecedentes: [], tienePatologias: ['Gingivitis'],
  },
  {
    nombres: 'Pedro Antonio', apellidos: 'Santana Castillo',
    cedula: '001-4567890-1', telefono: '849-555-0404', email: 'pedro.santana@gmail.com',
    tieneWhatsapp: false, direccion: 'Residencial El Cafe #22', sector: 'Los Mina', edad: 55,
    sexo: 'Masculino', estadoCivil: 'Casado/a', ocupacion: 'Médico', nivelEducativo: 'Universitario',
    esOrtodoncia: false, tieneAntecedentes: ['Hipertensión'], tienePatologias: [],
  },
  {
    nombres: 'Carmen', apellidos: 'Vásquez Núñez',
    cedula: '001-5678901-2', telefono: '809-555-0505', email: 'carmen.vasquez@gmail.com',
    tieneWhatsapp: true, direccion: 'Calle 3ra #15', sector: 'Villa Consuelo', edad: 65,
    sexo: 'Femenino', estadoCivil: 'Viudo/a', ocupacion: 'Ama de Casa', nivelEducativo: 'Básico',
    esOrtodoncia: false, tieneAntecedentes: ['Artritis Reumatoide'], tienePatologias: ['Abrasión', 'Atrición'],
  },
  // === 15 nuevos ===
  {
    nombres: 'Roberto', apellidos: 'Fernández Cruz',
    cedula: '001-6789012-3', telefono: '809-555-0606', email: 'roberto.fernandez@gmail.com',
    tieneWhatsapp: true, direccion: 'Calle Del Sol #10', sector: 'Los Jardines', edad: 30,
    sexo: 'Masculino', estadoCivil: 'Soltero/a', ocupacion: 'Arquitecto', nivelEducativo: 'Universitario',
    esOrtodoncia: true, tieneAntecedentes: ['Asma'], tienePatologias: ['Apiñamiento'],
  },
  {
    nombres: 'Sofía', apellidos: 'Martínez de la Rosa',
    cedula: '001-7890123-4', telefono: '829-555-0707', email: 'sofia.martinez@yahoo.com',
    tieneWhatsapp: true, direccion: 'Av. Sarasota #55', sector: 'Bella Vista', edad: 24,
    sexo: 'Femenino', estadoCivil: 'Soltero/a', ocupacion: 'Estudiante', nivelEducativo: 'Universitario',
    esOrtodoncia: true, tieneAntecedentes: [], tienePatologias: ['Mordida Cruzada'],
  },
  {
    nombres: 'Luis Alberto', apellidos: 'Castillo Peralta',
    cedula: '001-8901234-5', telefono: '849-555-0808', email: 'luis.castillo@gmail.com',
    tieneWhatsapp: true, direccion: 'Calle La Paz #31', sector: 'Villa Juana', edad: 48,
    sexo: 'Masculino', estadoCivil: 'Casado/a', ocupacion: 'Contador', nivelEducativo: 'Universitario',
    esOrtodoncia: false, tieneAntecedentes: ['Diabetes'], tienePatologias: ['Caries profunda'],
  },
  {
    nombres: 'Diana Carolina', apellidos: 'Méndez Polanco',
    cedula: '402-9012345-6', telefono: '809-555-0909', email: 'diana.mendez@hotmail.com',
    tieneWhatsapp: true, direccion: 'Calle 5ta #22', sector: 'Ensanche Luperón', edad: 32,
    sexo: 'Femenino', estadoCivil: 'Soltero/a', ocupacion: 'Odontóloga', nivelEducativo: 'Universitario',
    esOrtodoncia: true, tieneAntecedentes: [], tienePatologias: [],
  },
  {
    nombres: 'Carlos Manuel', apellidos: 'Peña Jiménez',
    cedula: '001-0123456-7', telefono: '829-555-1010', email: 'carlos.pena@gmail.com',
    tieneWhatsapp: false, direccion: 'Residencial El Dorado #8', sector: 'Los Jardines Norte', edad: 60,
    sexo: 'Masculino', estadoCivil: 'Casado/a', ocupacion: 'Empresario', nivelEducativo: 'Universitario',
    esOrtodoncia: false, tieneAntecedentes: ['Hipertensión', 'Diabetes'], tienePatologias: ['Edentulismo parcial'],
  },
  {
    nombres: 'Laura', apellidos: 'Reyes Almonte',
    cedula: '001-1122334-5', telefono: '849-555-1111', email: 'laura.reyes@gmail.com',
    tieneWhatsapp: true, direccion: 'Calle Sol Naciente #3', sector: 'Los Cacicazgos', edad: 19,
    sexo: 'Femenino', estadoCivil: 'Soltero/a', ocupacion: 'Estudiante', nivelEducativo: 'Secundario',
    esOrtodoncia: true, tieneAntecedentes: ['Alergias Medicamentosas'], tienePatologias: ['Diastema', 'Apiñamiento'],
  },
  {
    nombres: 'Miguel Ángel', apellidos: 'Díaz Cabrera',
    cedula: '001-2233445-6', telefono: '809-555-1212', email: 'miguel.diaz@outlook.com',
    tieneWhatsapp: true, direccion: 'Calle 27 de Febrero #100', sector: 'El Millón', edad: 38,
    sexo: 'Masculino', estadoCivil: 'Casado/a', ocupacion: 'Ingeniero de Sistemas', nivelEducativo: 'Universitario',
    esOrtodoncia: false, tieneAntecedentes: [], tienePatologias: [],
  },
  {
    nombres: 'Rosa Elena', apellidos: 'Ventura Santos',
    cedula: '001-3344556-7', telefono: '829-555-1313', email: 'rosa.ventura@gmail.com',
    tieneWhatsapp: true, direccion: 'Av. Bolívar #75', sector: 'San Gerónimo', edad: 45,
    sexo: 'Femenino', estadoCivil: 'Casado/a', ocupacion: 'Enfermera', nivelEducativo: 'Técnico Superior',
    esOrtodoncia: false, tieneAntecedentes: ['Problemas Tiroideos'], tienePatologias: ['Retracción gingival'],
  },
  {
    nombres: 'José Rafael', apellidos: 'Herrera Figueroa',
    cedula: '001-4455667-8', telefono: '849-555-1414', email: 'jose.herrera@gmail.com',
    tieneWhatsapp: false, direccion: 'Calle Principal #200', sector: 'Villa Mella', edad: 52,
    sexo: 'Masculino', estadoCivil: 'Divorciado/a', ocupacion: 'Chofer', nivelEducativo: 'Básico',
    esOrtodoncia: false, tieneAntecedentes: ['Cardiopatías'], tienePatologias: [],
  },
  {
    nombres: 'Patricia', apellidos: 'Jiménez Guerrero',
    cedula: '001-5566778-9', telefono: '809-555-1515', email: 'patricia.jimenez@yahoo.com',
    tieneWhatsapp: true, direccion: 'Residencial Paraíso #12', sector: 'Engombe', edad: 27,
    sexo: 'Femenino', estadoCivil: 'Soltero/a', ocupacion: 'Maestra', nivelEducativo: 'Universitario',
    esOrtodoncia: false, tieneAntecedentes: ['Anemia'], tienePatologias: [],
  },
  {
    nombres: 'Fernando', apellidos: 'Lora Castillo',
    cedula: '001-6677889-0', telefono: '829-555-1616', email: 'fernando.lora@gmail.com',
    tieneWhatsapp: true, direccion: 'Calle Los Maestros #5', sector: 'Los Ríos', edad: 22,
    sexo: 'Masculino', estadoCivil: 'Soltero/a', ocupacion: 'Estudiante', nivelEducativo: 'Universitario',
    esOrtodoncia: true, tieneAntecedentes: [], tienePatologias: ['Mordida Abierta'],
  },
  {
    nombres: 'Gloria', apellidos: 'Santana Tejada',
    cedula: '001-7788990-1', telefono: '809-555-1717', email: 'gloria.santana@gmail.com',
    tieneWhatsapp: true, direccion: 'Av. Núñez de Cáceres #66', sector: 'Los Prados', edad: 58,
    sexo: 'Femenino', estadoCivil: 'Casado/a', ocupacion: 'Comerciante', nivelEducativo: 'Básico',
    esOrtodoncia: false, tieneAntecedentes: ['Hipertensión', 'Diabetes'], tienePatologias: ['Edentulismo total'],
  },
  {
    nombres: 'Héctor', apellidos: 'Valdez Pineda',
    cedula: '001-8899001-2', telefono: '849-555-1818', email: 'hector.valdez@gmail.com',
    tieneWhatsapp: true, direccion: 'Calle 4ta #17', sector: 'Los Alcarrizos', edad: 33,
    sexo: 'Masculino', estadoCivil: 'Soltero/a', ocupacion: 'Mecánico', nivelEducativo: 'Técnico',
    esOrtodoncia: false, tieneAntecedentes: ['Asma'], tienePatologias: [],
  },
  {
    nombres: 'Yanet', apellidos: 'Morillo de los Santos',
    cedula: '001-9900112-3', telefono: '829-555-1919', email: 'yanet.morillo@hotmail.com',
    tieneWhatsapp: true, direccion: 'Calle Las Palmas #9', sector: 'Villa María', edad: 40,
    sexo: 'Femenino', estadoCivil: 'Casado/a', ocupacion: 'Abogada', nivelEducativo: 'Universitario',
    esOrtodoncia: false, tieneAntecedentes: [], tienePatologias: [],
  },
  {
    nombres: 'Ramón', apellidos: 'Peralta García',
    cedula: '001-0011223-4', telefono: '809-555-2020', email: 'ramon.peralta@gmail.com',
    tieneWhatsapp: false, direccion: 'Calle El Progreso #33', sector: 'Yamasa', edad: 70,
    sexo: 'Masculino', estadoCivil: 'Viudo/a', ocupacion: 'Jubilado', nivelEducativo: 'Básico',
    esOrtodoncia: false, tieneAntecedentes: ['Problemas Renales', 'Hipertensión'], tienePatologias: ['Desdentado total'],
  },
];

const formatDate = (d) => d.toISOString().split('T')[0];
const getDate = (daysOffset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d;
};

function elegirProcedimiento(catMap, idx) {
  const todas = Object.values(catMap).flatMap(c => c.nombres);
  return todas[idx % todas.length];
}

async function seed() {
  // Verificar si ya hay datos base (proteccion para produccion)
  // OJO: Chequeamos PROCEDIMIENTOS, no pacientes.
  // Si borras los pacientes pero los procedimientos existen,
  // NO se debe recrear data demo. Así evitamos que al reiniciar
  // Railway se regeneren los datos demo que borraste.
  const existingPacientes = await prisma.paciente.count();
  const existingProcs = await prisma.procedimiento.count();
  const existingConfig = await prisma.configuracion.count();

  if (existingProcs > 0) {
    console.log('📌 Base de datos ya tiene datos. Solo asegurando config y procedimientos...');

    // Solo asegurar que existan configs basicas
    const configDefault = [
      { clave: 'doctor_nombre', valor: 'Dr. Rodríguez' },
      { clave: 'doctor_telefono', valor: '18095551234' },
      { clave: 'clinica_nombre', valor: 'Sabonesa Dental Clinic Y Spa' },
      { clave: 'whatsapp_provider_mode', valor: 'manual' },
      { clave: 'whatsapp_fallback_mode', valor: 'on_error' },
      { clave: 'recordatorio_habilitado', valor: 'false' },
      { clave: 'recordatorio_hora', valor: '08:00' },
      { clave: 'recordatorio_anticipacion_dias', valor: '1' },
      { clave: 'plantilla_recordatorio', valor: 'Hola {nombre}, recordatorio: tienes una cita en {clinica} mañana a las {hora}. Te esperamos.' },
      { clave: 'plantilla_confirmacion', valor: 'Hola {nombre}, tu cita en {clinica} del {fecha} a las {hora} ha sido confirmada. Gracias.' },
      { clave: 'plantilla_cancelacion', valor: 'Hola {nombre}, tu cita en {clinica} del {fecha} ha sido cancelada. Para reagendar, contactanos.' },
    ];
    for (const cfg of configDefault) {
      await prisma.configuracion.upsert({
        where: { clave: cfg.clave },
        update: {}, // no sobrescribir valores existentes
        create: cfg,
      });
    }

    // Asegurar categorias y procedimientos base si no existen
    if (existingProcs === 0) {
      let totalProcs = 0;
      for (const cat of categorias) {
        const categoria = await prisma.categoriaProcedimiento.create({
          data: { nombre: cat.nombre, descripcion: '' },
        });
        for (const proc of cat.procedimientos) {
          await prisma.procedimiento.create({
            data: { nombre: proc.nombre, precioSugerido: proc.precio, categoriaId: categoria.id },
          });
          totalProcs++;
        }
      }
      console.log(`  ✅ ${categorias.length} categorías, ${totalProcs} procedimientos creados`);
    }

    console.log('✅ Seed completado (modo preservar datos)');
    return;
  }

  console.log('🗑️  Base de datos vacía — sembrando datos demo...');
  await prisma.recordatorio.deleteMany();
  await prisma.presupuesto.deleteMany();
  await prisma.crediticio.deleteMany();
  await prisma.cita.deleteMany();
  await prisma.historialClinico.deleteMany();
  await prisma.paciente.deleteMany();
  await prisma.procedimiento.deleteMany();
  await prisma.categoriaProcedimiento.deleteMany();
  await prisma.insumo.deleteMany();
  await prisma.usuario.deleteMany();

  // Crear usuarios por defecto (idempotent: upsert by email)
  console.log('👤 Creando usuarios por defecto...');
  const defaultUsers = [
    { nombre: 'Admin Betty', email: 'admin@betty.com', password: await bcrypt.hash('admin123', 10), rol: 'admin', passwordChanged: false },
    { nombre: 'Dr. Rodríguez', email: 'doctor@betty.com', password: await bcrypt.hash('doctor123', 10), rol: 'doctor', passwordChanged: false },
    { nombre: 'Asistente Betty', email: 'asistente@betty.com', password: await bcrypt.hash('asistente123', 10), rol: 'asistente', passwordChanged: false },
  ];
  for (const user of defaultUsers) {
    await prisma.usuario.upsert({
      where: { email: user.email },
      update: { password: user.password, passwordChanged: user.passwordChanged, rol: user.rol, nombre: user.nombre, activo: true },
      create: user,
    });
    console.log(`  ✅ ${user.nombre} (${user.rol})`);
  }

  // Crear catálogo
  console.log('📋 Creando catálogo de procedimientos...');
  const catMap = {};
  for (const cat of categorias) {
    const categoria = await prisma.categoriaProcedimiento.create({ data: { nombre: cat.nombre } });
    catMap[cat.nombre] = { id: categoria.id, nombres: [] };
    for (const proc of cat.procedimientos) {
      const p = await prisma.procedimiento.create({
        data: { nombre: proc.nombre, precioSugerido: proc.precio, categoriaId: categoria.id }
      });
      catMap[cat.nombre].nombres.push(p.nombre);
    }
  }
  console.log('  ✅ 9 categorías, 80 procedimientos');

  // Crear pacientes
  console.log(`👤 Creando ${pacientes.length} pacientes...`);
  const today = new Date();

  for (let i = 0; i < pacientes.length; i++) {
    const p = pacientes[i];
    const intervalo = p.esOrtodoncia ? 1 : 6;
    const paciente = await prisma.paciente.create({ data: { ...p, esOrtodoncia: undefined, tieneAntecedentes: undefined, tienePatologias: undefined } });

    // Calcular próximas fechas de recordatorio
    const proximoEn = getDate(intervalo === 1 ? 45 : 180);
    const ultimoEn = getDate(-90);

    // Historial Clínico con recordatorioProgramado incluido
    const cuestionarioDentalBase = ['Se cepilla los dientes a diario', 'Usa hilo dental?'];
    if (p.esOrtodoncia) cuestionarioDentalBase.push('Usa ortodoncia?');

    const historiaData = {
      pacienteId: paciente.id,
      antecedentes: p.tieneAntecedentes || [],
      cuestionarioGeneral: i % 3 === 0 ? ['Embarazada o sospecha estarlo?'] : [],
      cuestionarioDental: cuestionarioDentalBase,
      saludGeneral: p.tieneAntecedentes?.includes('Hipertensión') ? 'Hipertenso controlado' :
                    p.tieneAntecedentes?.includes('Diabetes') ? 'Diabético tipo 2 controlado' :
                    p.tieneAntecedentes?.includes('Asma') ? 'Asmático controlado' : 'Buena',
      enfermedadPadece: '',
      ultimaVisitaMedico: formatDate(getDate(-180)),
      porqueVisita: i === 0 ? 'Control anual' : i === 3 ? 'Dolor en muela' : i === 5 ? 'Colocación de brackets' : '',
      dieta: i % 4 === 0 ? 'Alta en azúcares' : 'Balanceada',
      comentarios: '',
      examenCara: 'Simétrico, sin alteraciones',
      examenCuello: 'Palpación normal',
      examenATM: 'Sin dolor ni limitación',
      tejidosBlandos: p.tienePatologias?.includes('Gingivitis') ? ['Gingivitis'] : [],
      anomaliasDentarias: p.tienePatologias || [],
      higieneBucal: i % 3 === 1 ? 'Buena' : i % 3 === 2 ? 'Regular, requiere mejorar técnica' : 'Excelente',
      dxRadiografico: i === 3 ? 'Caries interproximal en 16 y 26' :
                      i === 8 ? 'Sospecha de quiste en mandíbula' :
                      i === 14 ? 'Edentulismo total superior e inferior' : '',
      odontograma: {},
      presupuestoTexto: '',
      evolucion: 'Paciente consciente, orientado. Buena actitud.',
      observaciones: `Se recomienda control cada ${intervalo} meses.`,
      agendaPaciente: [],
      recordatorioProgramado: { intervalo, activo: true, proximoEn: formatDate(proximoEn), ultimoEn: formatDate(ultimoEn) },
    };
    const historia = await prisma.historialClinico.create({ data: historiaData });

    // Recordatorio periódico en la tabla Recordatorio (pendiente)
    const periodicMsg = intervalo === 1
      ? `🦷 *Betty Dental*\n\nHola *${p.nombres}* 👋\nTe recordamos tu control de *ortodoncia* de este mes. Agendemos tu cita lo antes posible 🙌`
      : `🦷 *Betty Dental*\n\nHola *${p.nombres}* 👋\nHa pasado 6 meses desde tu última visita. Te recordamos agendar tu *chequeo general* 🙌`;

    await prisma.recordatorio.create({
      data: {
        pacienteId: paciente.id,
        tipo: intervalo === 1 ? 'recordatorio_1m' : 'recordatorio_6m',
        destinatario: 'paciente',
        telefono: p.telefono,
        mensaje: periodicMsg,
        whatsappUrl: p.tieneWhatsapp && p.telefono
          ? `https://wa.me/${p.telefono.replace(/[^\d]/g, '')}?text=${encodeURIComponent(periodicMsg)}`
          : null,
        estado: i % 5 === 0 ? 'enviado' : 'pendiente',
        enviadoEn: i % 5 === 0 ? ultimoEn : null,
      }
    });

    // Citas en la agenda general
    const diasOffset = [0, 1, 3, -5, 7, 1, 2, -3, 14, 0, 1, -1, 5, 2, 7, 0, 3, 4, -2, 1];
    const citaFecha = getDate(diasOffset[i % diasOffset.length]);
    const proc1 = elegirProcedimiento(catMap, i * 3);

    const cita1 = await prisma.cita.create({
      data: {
        pacienteId: paciente.id,
        fecha: formatDate(citaFecha),
        hora: `${8 + (i % 9)}:${(i * 10) % 60}`.replace(/^(\d):/, '0$1:'),
        procedimiento: proc1,
        estado: i < 3 ? 'realizada' : i >= 17 ? 'cancelada' : 'pendiente',
        origen: 'manual',
      }
    });

    // Segunda cita para la mitad
    if (i % 2 === 0) {
      const citaFecha2 = getDate(i < 10 ? 14 : -3);
      const proc2 = elegirProcedimiento(catMap, i * 3 + 7);
      const cita2 = await prisma.cita.create({
        data: {
          pacienteId: paciente.id,
          fecha: formatDate(citaFecha2),
          hora: `${10 + (i % 8)}:30`.replace(/^(\d):/, '0$1:'),
          procedimiento: proc2,
          estado: i < 5 ? 'realizada' : 'pendiente',
          origen: 'automatico',
        }
      });
    }

    // Crediticios (2-6 por paciente)
    const cantCreditos = 2 + (i % 5);
    for (let j = 0; j < cantCreditos; j++) {
      // j=0 siempre en fecha reciente (hoy), j>0 progresivamente más atrás
      const offsets = [0, 15, 45, 90, 135, 180];
      const d = getDate(-offsets[j]);
      await prisma.crediticio.create({
        data: {
          pacienteId: paciente.id,
          procedimiento: elegirProcedimiento(catMap, i * 7 + j * 13),
          montoPagado: 800 + Math.random() * 5000,
          montoAbonado: 300 + Math.random() * 2000,
          descuento: j === 0 ? (5 + Math.random() * 15) : 0,
          fecha: formatDate(d),
        }
      });
    }

    console.log(`  ✅ ${i + 1}. ${p.nombres} ${p.apellidos} — ${intervalo === 1 ? '1 mes' : '6 meses'} — ${p.tieneWhatsapp ? '📱 WhatsApp' : '📵 No WhatsApp'} — ${cantCreditos} créditos`);
  }

  // Configuración por defecto (solo crear si no existe)
  console.log('⚙️  Creando configuración...');
  const configDefault = [
    { clave: 'doctor_nombre', valor: 'Dr. Rodríguez' },
    { clave: 'doctor_telefono', valor: '18095551234' },
    { clave: 'clinica_nombre', valor: 'Sabonesa Dental Clinic Y Spa' },
    { clave: 'whatsapp_provider_mode', valor: 'manual' },
    { clave: 'whatsapp_fallback_mode', valor: 'on_error' },
    { clave: 'recordatorio_habilitado', valor: 'false' },
    { clave: 'recordatorio_hora', valor: '08:00' },
    { clave: 'recordatorio_anticipacion_dias', valor: '1' },
    { clave: 'plantilla_recordatorio', valor: 'Hola {nombre}, recordatorio: tienes una cita en {clinica} mañana a las {hora}. Te esperamos.' },
    { clave: 'plantilla_confirmacion', valor: 'Hola {nombre}, tu cita en {clinica} del {fecha} a las {hora} ha sido confirmada. Gracias.' },
    { clave: 'plantilla_cancelacion', valor: 'Hola {nombre}, tu cita en {clinica} del {fecha} ha sido cancelada. Para reagendar, contactanos.' },
  ];
  for (const cfg of configDefault) {
    await prisma.configuracion.upsert({
      where: { clave: cfg.clave },
      update: {},
      create: cfg
    });
  }
  console.log('  ✅ Configuración creada');

  // Inventario de Insumos
  console.log('📦 Creando inventario de insumos...');
  const insumos = [
    // Anestésicos y medicamentos
    { nombre: 'Lidocaína 2% con epinefrina 1:100,000', descripcion: 'Cartucho 1.8ml', cantidad: 120, precioUnitario: 45, proveedor: 'DentalMarket' },
    { nombre: 'Lidocaína 2% sin vasoconstrictor', descripcion: 'Cartucho 1.8ml', cantidad: 60, precioUnitario: 42, proveedor: 'DentalMarket' },
    { nombre: 'Articaína 4% con epinefrina 1:100,000', descripcion: 'Cartucho 1.8ml', cantidad: 80, precioUnitario: 55, proveedor: 'DentalFarma' },
    { nombre: 'Mepivacaína 3% sin vasoconstrictor', descripcion: 'Cartucho 1.8ml', cantidad: 40, precioUnitario: 50, proveedor: 'DentalFarma' },
    { nombre: 'Agujas dentales desechables 27G', descripcion: 'Caja x 100 unidades, corta', cantidad: 15, precioUnitario: 350, proveedor: 'MediDent' },
    { nombre: 'Agujas dentales desechables 30G', descripcion: 'Caja x 100 unidades, larga', cantidad: 10, precioUnitario: 380, proveedor: 'MediDent' },
    { nombre: 'Jeringas de anestesia tipo Carpule', descripcion: 'Reutilizables, acero inoxidable', cantidad: 8, precioUnitario: 1200, proveedor: 'DentalMarket' },
    // Resinas y composites
    { nombre: 'Resina composite A1 (3M Filtek)', descripcion: 'Jeringa 4g', cantidad: 12, precioUnitario: 1800, proveedor: '3M Dental' },
    { nombre: 'Resina composite A2 (3M Filtek)', descripcion: 'Jeringa 4g', cantidad: 20, precioUnitario: 1800, proveedor: '3M Dental' },
    { nombre: 'Resina composite A3 (3M Filtek)', descripcion: 'Jeringa 4g', cantidad: 15, precioUnitario: 1800, proveedor: '3M Dental' },
    { nombre: 'Resina composite A3.5 (3M Filtek)', descripcion: 'Jeringa 4g', cantidad: 10, precioUnitario: 1800, proveedor: '3M Dental' },
    { nombre: 'Resina composite color esmalte', descripcion: 'Jeringa 4g', cantidad: 8, precioUnitario: 1900, proveedor: '3M Dental' },
    { nombre: 'Resina composite dentina opaca', descripcion: 'Jeringa 4g', cantidad: 6, precioUnitario: 1900, proveedor: '3M Dental' },
    { nombre: 'Sistema adhesivo universal (Single Bond)', descripcion: 'Frasco 5ml', cantidad: 10, precioUnitario: 2500, proveedor: '3M Dental' },
    { nombre: 'Ácido grabador ortofosfórico 37%', descripcion: 'Jeringa 5ml', cantidad: 15, precioUnitario: 400, proveedor: 'DentalMarket' },
    // Coronas y prótesis
    { nombre: 'Corona de acero cromo #4', descripcion: 'Primer molar temporal, caja x 6', cantidad: 5, precioUnitario: 1200, proveedor: 'DentKids' },
    { nombre: 'Corona de acero cromo #5', descripcion: 'Segundo molar temporal, caja x 6', cantidad: 5, precioUnitario: 1200, proveedor: 'DentKids' },
    { nombre: 'Corona provisional (bis-acrílico)', descripcion: 'Kit de 12 piezas', cantidad: 4, precioUnitario: 2500, proveedor: 'DentalMarket' },
    // Material de impresión
    { nombre: 'Alginato (irreversible hidrocoloide)', descripcion: 'Saco 500g, sabor fresa', cantidad: 8, precioUnitario: 600, proveedor: 'DentalFarma' },
    { nombre: 'Silicona por adición (heavy body)', descripcion: 'Cartucho 380ml', cantidad: 6, precioUnitario: 3200, proveedor: 'DentalMarket' },
    { nombre: 'Silicona por adición (light body)', descripcion: 'Cartucho 380ml', cantidad: 6, precioUnitario: 3400, proveedor: 'DentalMarket' },
    { nombre: 'Yeso piedra tipo III', descripcion: 'Saco 1kg', cantidad: 10, precioUnitario: 250, proveedor: 'DentalFarma' },
    { nombre: 'Yeso extra duro tipo IV (Vel-Mix)', descripcion: 'Saco 1kg', cantidad: 5, precioUnitario: 500, proveedor: 'DentalFarma' },
    // Material de endodoncia
    { nombre: 'Limas K-file #15-40', descripcion: 'Caja x 6 unidades', cantidad: 12, precioUnitario: 800, proveedor: 'MediDent' },
    { nombre: 'Limas K-file #45-80', descripcion: 'Caja x 6 unidades', cantidad: 8, precioUnitario: 850, proveedor: 'MediDent' },
    { nombre: 'Limas rotatorias ProTaper', descripcion: 'Set completo S1-F3', cantidad: 6, precioUnitario: 4500, proveedor: 'Dentsply' },
    { nombre: 'Puntas de papel absorbente', descripcion: 'Caja x 200, cono #20-40', cantidad: 10, precioUnitario: 350, proveedor: 'Dentsply' },
    { nombre: 'Sellador endodóntico AH Plus', descripcion: 'Kit jeringa dual', cantidad: 5, precioUnitario: 3800, proveedor: 'Dentsply' },
    { nombre: 'Hidróxido de calcio (UltraCal XS)', descripcion: 'Jeringa 2g', cantidad: 8, precioUnitario: 900, proveedor: 'DentalMarket' },
    { nombre: 'Puntos de gutapercha #15-40', descripcion: 'Caja x 120 unidades', cantidad: 10, precioUnitario: 400, proveedor: 'Dentsply' },
    // Cirugía e implantes
    { nombre: 'Bisturí hoja #15', descripcion: 'Caja x 100', cantidad: 10, precioUnitario: 500, proveedor: 'MediDent' },
    { nombre: 'Bisturí hoja #12', descripcion: 'Caja x 100', cantidad: 5, precioUnitario: 500, proveedor: 'MediDent' },
    { nombre: 'Sutura seda 3-0', descripcion: 'Caja x 36 unidades', cantidad: 8, precioUnitario: 1200, proveedor: 'MediDent' },
    { nombre: 'Sutura reabsorbible Vicryl 4-0', descripcion: 'Caja x 36 unidades', cantidad: 6, precioUnitario: 2500, proveedor: 'MediDent' },
    { nombre: 'Gasas estériles 10x10', descripcion: 'Paquete x 25', cantidad: 40, precioUnitario: 80, proveedor: 'MediDent' },
    { nombre: 'Guantes de examen talla M', descripcion: 'Caja x 100, nitrilo', cantidad: 20, precioUnitario: 450, proveedor: 'Descartables RD' },
    { nombre: 'Guantes de examen talla L', descripcion: 'Caja x 100, nitrilo', cantidad: 25, precioUnitario: 450, proveedor: 'Descartables RD' },
    { nombre: 'Mascarillas KN95', descripcion: 'Caja x 50', cantidad: 15, precioUnitario: 350, proveedor: 'Descartables RD' },
    { nombre: 'Baberos desechables', descripcion: 'Paquete x 100', cantidad: 15, precioUnitario: 250, proveedor: 'Descartables RD' },
    { nombre: 'Campo quirúrgico estéril', descripcion: 'Paquete x 10', cantidad: 8, precioUnitario: 350, proveedor: 'Descartables RD' },
    { nombre: 'Gorro quirúrgico desechable', descripcion: 'Caja x 100', cantidad: 10, precioUnitario: 200, proveedor: 'Descartables RD' },
    // Higiene y profilaxis
    { nombre: 'Pasta profiláctica (fluorada)', descripcion: 'Tarro 500g, grano fino', cantidad: 10, precioUnitario: 350, proveedor: 'DentalMarket' },
    { nombre: 'Cepillo profiláctico tipo copa', descripcion: 'Caja x 50 unidades', cantidad: 10, precioUnitario: 300, proveedor: 'DentalMarket' },
    { nombre: 'Hilo dental', descripcion: 'Caja x 50 unidades', cantidad: 10, precioUnitario: 150, proveedor: 'DentalMarket' },
    { nombre: 'Barniz de flúor', descripcion: 'Jeringa 2ml, x 10 unidades', cantidad: 6, precioUnitario: 1800, proveedor: 'DentalMarket' },
    { nombre: 'Sellante de fosas y fisuras', descripcion: 'Jeringa 3ml', cantidad: 8, precioUnitario: 1200, proveedor: 'DentalMarket' },
    // Radiología
    { nombre: 'Película radiográfica periapical', descripcion: 'Caja x 150, velocidad K', cantidad: 5, precioUnitario: 3500, proveedor: 'DentalFarma' },
    { nombre: 'Película radiográfica aleta de mordida', descripcion: 'Caja x 100', cantidad: 3, precioUnitario: 2800, proveedor: 'DentalFarma' },
    { nombre: 'Revelador radiográfico', descripcion: 'Líquido 1 galón', cantidad: 4, precioUnitario: 1200, proveedor: 'DentalFarma' },
    { nombre: 'Fijador radiográfico', descripcion: 'Líquido 1 galón', cantidad: 4, precioUnitario: 1000, proveedor: 'DentalFarma' },
    // Esterilización
    { nombre: 'Bolsa para autoclave (cabina)', descripcion: 'Paquete x 200, 20x30cm', cantidad: 10, precioUnitario: 400, proveedor: 'MediDent' },
    { nombre: 'Indicador químico para autoclave', descripcion: 'Cinta adhesiva, rollo 50m', cantidad: 5, precioUnitario: 350, proveedor: 'MediDent' },
    { nombre: 'Desinfectante de superficies', descripcion: 'Spray 750ml', cantidad: 12, precioUnitario: 250, proveedor: 'Descartables RD' },
    { nombre: 'Gel desinfectante antibacterial', descripcion: 'Botella 500ml', cantidad: 15, precioUnitario: 150, proveedor: 'Descartables RD' },
    // Accesorios/equipos menores
    { nombre: 'Espejo bucal (cara plana)', descripcion: 'Caja x 12 unidades', cantidad: 6, precioUnitario: 600, proveedor: 'DentalMarket' },
    { nombre: 'Explorador dental (sonda recta)', descripcion: 'Caja x 6 unidades', cantidad: 5, precioUnitario: 800, proveedor: 'DentalMarket' },
    { nombre: 'Pinza algodonera', descripcion: 'Acero inoxidable, x 6', cantidad: 4, precioUnitario: 700, proveedor: 'DentalMarket' },
    { nombre: 'Sonda periodontal (Williams)', descripcion: 'Caja x 6 unidades', cantidad: 3, precioUnitario: 1500, proveedor: 'DentalMarket' },
    { nombre: 'Cucharilla de dentina (cureta)', descripcion: 'Juego de 4, acero inoxidable', cantidad: 4, precioUnitario: 2200, proveedor: 'DentalMarket' },
    { nombre: 'Algodón en rollo', descripcion: 'Paquete 500g', cantidad: 10, precioUnitario: 180, proveedor: 'DentalMarket' },
    { nombre: 'Cubrebandejas desechables', descripcion: 'Paquete x 100', cantidad: 12, precioUnitario: 200, proveedor: 'Descartables RD' },
    { nombre: 'Vaso odontológico desechable', descripcion: 'Paquete x 100', cantidad: 20, precioUnitario: 100, proveedor: 'Descartables RD' },
  ];
  for (const insumo of insumos) {
    await prisma.insumo.create({ data: insumo });
  }
  console.log(`  ✅ ${insumos.length} insumos creados`);

  const totalPac = await prisma.paciente.count();
  const totalHC = await prisma.historialClinico.count();
  const totalCitas = await prisma.cita.count();
  const totalCred = await prisma.crediticio.count();
  const totalRecordatorios = await prisma.recordatorio.count();
  const totalInsumos = await prisma.insumo.count();
  const totalUsuarios = await prisma.usuario.count();
  console.log('\n📊 Resumen:');
  console.log(`  Pacientes:     ${totalPac}`);
  console.log(`  HC:           ${totalHC}`);
  console.log(`  Citas:         ${totalCitas}`);
  console.log(`  Crediticios:   ${totalCred}`);
  console.log(`  Recordatorios: ${totalRecordatorios}`);
  console.log(`  Insumos:       ${totalInsumos}`);
  console.log(`  Usuarios:      ${totalUsuarios}`);
  console.log(`  Config:        8 valores`);
  console.log('  ✅ Seed completado exitosamente');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
