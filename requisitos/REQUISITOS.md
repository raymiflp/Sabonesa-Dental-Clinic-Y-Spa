# Sistema de Gestión Dental — Betty

## 1. Visión General

Aplicación de gestión para la clínica dental **Betty**. Permite administrar pacientes,
historiales clínicos, agenda de citas, historial crediticio y catálogo de procedimientos.
La agenda se alimenta automáticamente desde el historial clínico del paciente.

---

## 2. Módulos del Sistema

### 2.1 Módulo: Pacientes

Registro maestro de pacientes.

**Campos:**
| Campo | Tipo | Obligatorio |
|-------|------|-------------|
| Nombres | Texto | Sí |
| Apellidos | Texto | Sí |
| Dirección | Texto | No |
| No. Casa | Texto | No |
| Sector | Texto | No |
| Teléfono | Texto | No |
| Ocupación | Texto | No |
| Cédula No. | Texto | No |
| Estado Civil | Texto | No |
| Sexo | Texto (M/F) | No |
| Edad | Número | No |
| Nivel Educativo | Texto | No |
| Correo electrónico | Texto | No |

**Funcionalidades:**
- CRUD completo (Crear, Leer, Actualizar, Eliminar)
- Búsqueda por nombre, cédula o teléfono
- Vista de historial completo del paciente (clínico + crediticio + citas)

---

### 2.2 Módulo: Historial Clínico

Formulario completo basado en el documento `HISTORIAL MEDICo.docx`.

#### 2.2.1 Antecedentes Generales (Sección 12)

Checklist de condiciones médicas con Si/No:

| Condición |
|----------|
| Del Corazón |
| Alta Presión |
| Baja Presión |
| Fiebre reumática |
| De los nervios |
| Epilepsia (gota) |
| Sinusitis |
| Asma (pecho apretado) |
| Tuberculosis |
| De los riñones |
| De la vejiga |
| Hemorragia |
| Artritis |
| Anemia |
| Diabetes |
| Hepatitis |
| Sífilis |
| Gonorrea |
| Cáncer |
| Radioterapia |
| Alergia a: Medicina |
| Alimenticia |
| (otros) |

#### 2.2.2 Cuestionario General / Mujeres y Cuestionario Dental (Sección 13, 14, 15)

Checklist con Si/No:

**Preguntas Generales / Mujeres:**
- ¿Está bajo tratamiento médico?
- ¿Está tomando alguna droga o medicina?
- ¿Ha sido sometido a alguna operación?
- ¿Bebe mucha agua?
- ¿Orina mucho?
- ¿Ingiere alcohol en exceso?
- ¿Fuma cigarrillos?
- ¿Toma café en exceso?
- [M] ¿Está embarazada?
- [M] ¿Menstrúa regularmente?
- [M] ¿Se le ha ido la regla permanente?
- [M] ¿Tiene hijos?

**Preguntas Dentales:**
- ¿Se cepilla los dientes a diario?
- ¿Sangra por las encías?
- ¿Dolor después de la extracción?
- ¿Respira por la boca?
- ¿Reacción anestésica?
- ¿Dolor al abrir y cerrar la boca?
- ¿Molestia al tragar?
- ¿Dientes flojos?
- ¿Úlceras en la boca?
- ¿Cruje o aprieta los dientes?
- ¿Hemorragia después de las extracciones?
- ¿Se examina cada 6 meses?
- ¿Ha recibido algún trauma?

#### 2.2.3 Estado Actual (Sección 16)

| Campo |
|-------|
| Salud General |
| Enfermedad que padece |
| Última visita al médico |
| ¿Por qué? |
| Dieta |
| Comentarios |

#### 2.2.4 Examen Facial (Sección 17)

- Cara
- Cuello
- A.T.M. (Articulación Temporomandibular)

#### 2.2.5 Tejidos Blandos (Sección 18)

Checklist con S (Sano) / N (No sano):

| # | Ítem |
|---|------|
| 1 | Labios |
| 2 | Carrillos |
| 3 | Paladar Duro |
| 4 | Paladar Blando |
| 5 | Piso de la Boca |
| 6 | Glándulas Salivales |
| 7 | Lengua |
| 8 | Amígdalas |
| 9 | Enfermedad Periodontal |
| 10 | Lesiones Papilares |

#### 2.2.6 Anomalías Dentarias

Checklist con S / N:

- Mancha
- Mal posición
- Atrición
- Erosión
- Abrasión
- Número
- Hipoplasia
- Descalsificación
- Moteado
- Fractura
- Diastema
- Impactado

#### 2.2.7 Evolución y Observaciones

Campo de texto libre para:
- **Evolución** del paciente (multilínea)
- **Observaciones** generales
- **HIGIENE BUCAL** — campo de texto
- **Dx RADIOGRÁFICO** — campo multilínea

#### 2.2.8 Odontograma / Diagnóstico Dental

Representación gráfica o referencia al estado dental del paciente.
Campo para **Presupuesto** asociado al plan de tratamiento.

#### 2.2.9 Agenda del Paciente (desde Historial Clínico)

Tabla embebida en el historial clínico:

| Campo | Tipo |
|-------|------|
| Procedimiento | Texto |
| Fecha | Fecha |
| Pendiente | Sí/No |

> **Regla de negocio:** Al guardar un registro en esta tabla, se debe crear automáticamente una cita en la **Agenda General** del sistema.

---

### 2.3 Módulo: Agenda General

Vista central de citas programadas.

**Origen de datos:**
- Creación manual de citas
- **Automático:** desde la tabla "Agenda del Paciente" en el historial clínico

**Vistas:**
- Vista diaria
- Vista semanal
- Vista mensual
- Lista de próximas citas

**Campos de una cita:**
| Campo | Tipo | Origen |
|-------|------|--------|
| Paciente | Relación | Selección / Automático |
| Fecha | Fecha | Automático / Manual |
| Hora | Hora | Manual |
| Procedimiento | Texto | Desde historial clínico |
| Estado | Pendiente/Confirmada/Realizada/Cancelada | Manual |
| Notas | Texto | Manual |

**Funcionalidades:**
- Filtrar por fecha, paciente, estado
- Marcar asistencia / ausencia
- Cancelar / reagendar citas
- Notificación de citas próximas

---

### 2.4 Módulo: Historial Crediticio

Control de pagos y montos por paciente, basado en `Historial crediticio.docx`.

**Campos:**
| Campo | Tipo | Obligatorio |
|-------|------|-------------|
| Paciente | Relación | Sí |
| Procedimiento | Texto (o relación a catálogo) | Sí |
| Monto pagado | Decimal | No |
| Monto abonado | Decimal | No |
| Fecha | Fecha | Sí |

**Funcionalidades:**
- CRUD de registros crediticios
- Vista por paciente: resumen de pagos, total pagado, total adeudado
- Asociar cada movimiento a un procedimiento del catálogo
- Reporte de morosidad / deuda pendiente

---

### 2.5 Módulo: Catálogo de Procedimientos

Basado en `Procedimientos_Odontologicos(1).docx`.

**Categorías:**
1. Odontología General
2. Endodoncia
3. Periodoncia
4. Cirugía Oral y Maxilofacial
5. Rehabilitación Oral / Prostodoncia
6. Ortodoncia y Ortopedia
7. Odontopediatría
8. Odontología Estética
9. Patología y Radiología Oral

**Campos por procedimiento:**
| Campo | Tipo |
|-------|------|
| Nombre | Texto |
| Categoría | Relación / Selección |
| Precio sugerido | Decimal (opcional) |
| Descripción | Texto (opcional) |

**Funcionalidades:**
- CRUD de categorías y procedimientos
- Asociar procedimientos a presupuestos y citas
- Precargar desde el catálogo existente

---

### 2.6 Módulo: Presupuestos

Asociado al historial clínico y al plan de tratamiento.

**Campos:**
| Campo | Tipo |
|-------|------|
| Paciente | Relación |
| Fecha | Fecha |
| Procedimientos | Lista de procedimientos |
| Monto total | Decimal |
| Estado | Pendiente/Aprobado/Rechazado |
| Notas | Texto |

**Funcionalidades:**
- Crear presupuesto desde el historial clínico
- Agregar procedimientos del catálogo con cantidades y precios
- Imprimir / exportar presupuesto
- Convertir a cita automáticamente

---

## 3. Reglas de Negocio Clave

| # | Regla |
|---|-------|
| RN-01 | Un paciente puede tener **un solo historial clínico activo**. |
| RN-02 | La **Agenda del Paciente** (dentro del historial clínico) alimenta automáticamente la **Agenda General**. |
| RN-03 | Una cita cancelada desde la Agenda General debe reflejarse en el historial clínico. |
| RN-04 | El historial crediticio está ligado al paciente y al procedimiento realizado. |
| RN-05 | Un presupuesto aprobado puede generar una cita automática. |
| RN-06 | Todos los módulos deben poder buscarse por nombre del paciente. |

---

## 4. Requisitos Técnicos (por definir)

Pendiente de elegir stack:

| Aspecto | Opciones |
|---------|----------|
| **Frontend** | Web / Escritorio / Móvil |
| **Backend** | Node.js / .NET / Python / PHP / Otro |
| **Base de datos** | MySQL / PostgreSQL / SQLite / SQL Server |
| **Autenticación** | ¿Se requiere login de usuarios? |
| **Multi-sucursal** | ¿Una o múltiples clínicas? |
| **Idioma** | Español |

---

## 5. Próximos Pasos

1. Definir stack tecnológico
2. Diseñar modelo de datos (DER)
3. Crear prototipo de UI
4. Implementar módulo de Pacientes + Historial Clínico
5. Implementar módulo de Agenda
6. Implementar módulo de Historial Crediticio
7. Implementar Catálogo de Procedimientos y Presupuestos
