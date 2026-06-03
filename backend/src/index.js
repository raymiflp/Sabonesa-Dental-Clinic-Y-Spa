import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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

app.use(cors());
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

// Auth routes (no auth required)
app.use('/api/auth', authRoutes);

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

const PORT = 3001;
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
