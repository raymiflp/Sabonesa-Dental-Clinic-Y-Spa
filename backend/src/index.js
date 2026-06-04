import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import { authMiddleware } from './middleware/auth.js';
import pacientesRoutes from './routes/pacientes.js';
import historialRoutes from './routes/historialClinico.js';
import agendaRoutes from './routes/agenda.js';
import crediticioRoutes from './routes/crediticio.js';
import procedimientosRoutes from './routes/procedimientos.js';
import presupuestosRoutes from './routes/presupuestos.js';
import insumosRoutes from './routes/insumos.js';
import configuracionRoutes from './routes/configuracion.js';
import uploadRoutes from './routes/upload.js';
import { waSession } from './whatsapp/wa-session.js';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

// --- Security Middleware ---

// Helmet: security headers
app.use(helmet());

// Global rate limit: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intente de nuevo más tarde' },
});
app.use(globalLimiter);

// Auth-specific rate limit (stricter): 20 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos de inicio de sesión' },
});

// CORS: restrict to frontend origin
const corsOrigin = process.env.CORS_ORIGIN || process.env.VITE_API_URL || 'http://localhost:5173';
app.use(cors({ origin: corsOrigin, credentials: true }));

app.use(express.json({ limit: '50mb' }));

// Servir archivos estáticos (imágenes, etc.)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/static', express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Exponer prisma para los controladores
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Auth routes (no auth required, with stricter rate limit)
app.use('/api/auth', authLimiter, authRoutes);

// Health check (no auth required)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// All other routes require authentication
app.use('/api/pacientes', authMiddleware, pacientesRoutes);
app.use('/api/historial-clinico', authMiddleware, historialRoutes);
app.use('/api/agenda', authMiddleware, agendaRoutes);
app.use('/api/crediticio', authMiddleware, crediticioRoutes);
app.use('/api/procedimientos', authMiddleware, procedimientosRoutes);
app.use('/api/presupuestos', authMiddleware, presupuestosRoutes);
app.use('/api/configuracion', authMiddleware, configuracionRoutes);
app.use('/api/insumos', authMiddleware, insumosRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);

// Startup check: JWT_SECRET must be set in production
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET no está configurado en producción');
    process.exit(1);
  }
  console.warn('ADVERTENCIA: JWT_SECRET no configurado, usando fallback de desarrollo');
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);

  // Iniciar sesión de WhatsApp Web (si el modo es 'web' o hay sesión guardada)
  iniciarWaSession(prisma);
});

async function iniciarWaSession(prisma) {
  try {
    const cfg = await prisma.configuracion.findUnique({
      where: { clave: 'whatsapp_provider_mode' }
    });
    const mode = cfg?.valor || 'wa';

    // Solo iniciar sesión si el modo es 'web'
    if (mode !== 'web') {
      console.log('[WA-SESSION] Modo no es "web", sesión no iniciada');
      return;
    }

    console.log('[WA-SESSION] Iniciando sesión de WhatsApp Web...');
    await waSession.init();
  } catch (err) {
    console.error('[WA-SESSION] Error al iniciar:', err.message);
  }
}
