# 🦷 Sabonesa Dental Clinic Y Spa

Sistema de gestión integral para consultorio dental. Administración de pacientes, historial clínico, agenda de citas, control crediticio, inventario de insumos, presupuestos y recordatorios vía WhatsApp.

---

## Tech Stack

| Layer | Tecnología |
|-------|-----------|
| **Frontend** | React 19 + Vite + Tailwind CSS v4 + shadcn/ui |
| **Backend** | Node.js + Express + Prisma ORM |
| **Base de datos** | PostgreSQL (Railway) / SQLite (desarrollo local) |
| **Autenticación** | JWT (jsonwebtoken) + bcryptjs |
| **Seguridad** | helmet, express-rate-limit, CORS |
| **Notificaciones** | WhatsApp Web (Baileys) |
| **Despliegue** | Railway (backend) + Vercel (frontend) |

---

## Prerrequisitos

- Node.js 18+ (recomendado 20+)
- npm 9+
- Una cuenta en [Railway](https://railway.app) (para PostgreSQL y deploy)
- Una cuenta en [Vercel](https://vercel.com) (para deploy del frontend)

---

## Configuración Local

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd sistema-betty
```

### 2. Backend

```bash
cd backend
npm install
```

El backend usa SQLite por defecto en desarrollo (archivo `backend/.env`):

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="betty-dev-secret"
```

Inicializar la base de datos y seed:

```bash
npx prisma db push
npm run db:seed
```

Iniciar el servidor:

```bash
npm run dev
```

El backend arranca en `http://localhost:3001`.

### 3. Frontend

```bash
cd frontend
npm install
```

Iniciar en modo desarrollo:

```bash
npm run dev
```

El frontend arranca en `http://localhost:5173`.

En desarrollo, el frontend se conecta automáticamente a `http://localhost:3001`. Para usar una URL diferente, crea `frontend/.env`:

```env
VITE_API_URL=https://tu-backend.railway.app
```

---

## Variables de Entorno

| Variable | Requerido | Descripción | Ejemplo |
|----------|-----------|-------------|---------|
| `DATABASE_URL` | Sí | Cadena de conexión PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Sí (prod) | Secreto para firmar tokens JWT (mín. 32 caracteres) | `tu-secreto-super-seguro-aleatorio` |
| `VITE_API_URL` | Sí (frontend) | URL del backend para el frontend | `https://api-sabonesa.railway.app` |
| `CORS_ORIGIN` | No | Origen permitido para CORS (default: `VITE_API_URL` o `http://localhost:5173`) | `https://sistema-betty.vercel.app` |
| `PORT` | No | Puerto del servidor (default: 3001) | `3001` |
| `NODE_ENV` | No | Entorno de ejecución | `production` |

---

## Credenciales por Defecto

| Rol | Email | Contraseña |
|-----|-------|-----------|
| **Admin** | `admin@betty.com` | `admin123` |
| **Doctor** | `doctor@betty.com` | `doctor123` |
| **Asistente** | `asistente@betty.com` | `asistente123` |

> ⚠️ Al iniciar sesión por primera vez, el sistema solicitará cambiar la contraseña.

---

## Despliegue en Railway (Backend)

### 1. Crear servicio PostgreSQL

En el dashboard de Railway:
- New → Database → PostgreSQL
- Railway inyecta automáticamente la variable `DATABASE_URL`

### 2. Configurar variables de entorno en Railway

| Variable | Valor |
|----------|-------|
| `JWT_SECRET` | Generar random string (mín. 32 caracteres, usar `openssl rand -base64 32`) |
| `VITE_API_URL` | URL del backend Railway (ej: `https://api-sabonesa.railway.app`) |
| `CORS_ORIGIN` | URL del frontend (ej: `https://sistema-betty.vercel.app`) |
| `NODE_ENV` | `production` |

### 3. Desplegar

Conectar el repositorio a Railway o usar Railway CLI:

```bash
railway login
railway link
railway up
```

El `start` script ejecuta automáticamente:
1. `npx prisma db push` — crea/actualiza tablas
2. `node prisma/seed.js` — carga datos de demostración
3. `node src/index.js` — inicia el servidor

---

## Despliegue en Vercel (Frontend)

```bash
cd frontend
vercel --prod --yes
```

Configurar variable de entorno en Vercel:

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | URL del backend en Railway (ej: `https://api-sabonesa.railway.app`) |

Sin esta variable, el frontend usará la URL por defecto `https://amusing-fulfillment-production-1144.up.railway.app`.

---

## Funcionalidades

- **Dashboard** — Resumen con estadísticas, citas del día, próximas citas y cobros recientes
- **Pacientes** — Registro, búsqueda y gestión de pacientes
- **Historial Clínico** — Expediente digital con antecedentes, odontograma, diagnósticos y evolución
- **Agenda** — Gestión de citas con filtros por fecha y estado
- **Crediticio** — Control de pagos, abonos y descuentos por paciente
- **Procedimientos** — Catálogo de procedimientos con precios sugeridos
- **Inventario** — Control de insumos odontológicos con cantidades y proveedores
- **Presupuestos** — Creación y gestión de presupuestos para pacientes
- **WhatsApp** — Envío de recordatorios y notificaciones (modo web/app)
- **Offline** — Sincronización automática cuando se recupera la conexión
- **Pago Rápido** — Cobro exprés desde cualquier pantalla

---

## Datos de Demostración

El seed (`prisma/seed.js`) crea:

- **3 usuarios** — admin, doctor, asistente
- **20 pacientes** — con datos realistas dominicanos
- **9 categorías** de procedimientos con **80+ procedimientos**
- **20+ citas** — pasadas, presentes y futuras
- **Historial clínico** completo para cada paciente
- **40+ registros crediticios** — con pagos y abonos
- **50+ insumos** — anestésicos, resinas, instrumentos, etc.
- **Configuración** básica de la clínica

---

## Licencia

Uso interno — Sabonesa Dental Clinic Y Spa
