import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import qrcode from 'qrcode-terminal';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_DIR = path.join(__dirname, '..', '..', 'wa-session');

/** Lee todos los archivos del session dir y los empaqueta como { nombreArchivo: base64 } */
function backupSessionToObject() {
  if (!fs.existsSync(SESSION_DIR)) return null;
  const files = fs.readdirSync(SESSION_DIR);
  const obj = {};
  for (const f of files) {
    const fp = path.join(SESSION_DIR, f);
    if (fs.statSync(fp).isFile()) {
      obj[f] = fs.readFileSync(fp).toString('base64');
    }
  }
  return Object.keys(obj).length > 0 ? obj : null;
}

/** Escribe los archivos de sesión desde un objeto { nombreArchivo: base64 } */
function restoreSessionFromObject(obj) {
  if (!obj) return false;
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
  for (const [name, content] of Object.entries(obj)) {
    fs.writeFileSync(path.join(SESSION_DIR, name), Buffer.from(content, 'base64'));
  }
  return true;
}

/** Singleton que mantiene la conexión con WhatsApp Web */
class WaSession {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.phoneNumber = null;
    this._state = 'idle'; // 'idle' | 'connecting' | 'connected' | 'disconnected'
    this._lastQR = null;
    this._prisma = null;
  }

  /** Asigna la instancia de Prisma para persistencia en DB */
  setPrisma(prisma) {
    this._prisma = prisma;
  }

  /** Guarda el backup de la sesión en PostgreSQL */
  async _saveBackupToDB() {
    if (!this._prisma) return;
    try {
      const backup = backupSessionToObject();
      if (!backup) return;
      await this._prisma.configuracion.upsert({
        where: { clave: 'wa_session_backup' },
        update: { valor: JSON.stringify(backup) },
        create: { clave: 'wa_session_backup', valor: JSON.stringify(backup) },
      });
      console.log('[WA-SESSION] Backup de sesión guardado en DB');
    } catch (err) {
      console.error('[WA-SESSION] Error guardando backup en DB:', err.message);
    }
  }

  /** Restaura el backup de la sesión desde PostgreSQL */
  async _restoreBackupFromDB() {
    if (!this._prisma) return false;
    try {
      const row = await this._prisma.configuracion.findUnique({
        where: { clave: 'wa_session_backup' },
      });
      if (!row?.valor) return false;
      let backup;
      try {
        backup = JSON.parse(row.valor);
      } catch (err) {
        console.error('[WA-SESSION] Backup DB corrupto, ignorando:', err.message);
        return false;
      }
      const restored = restoreSessionFromObject(backup);
      if (restored) console.log('[WA-SESSION] Sesión restaurada desde DB');
      return restored;
    } catch (err) {
      console.error('[WA-SESSION] Error restaurando desde DB:', err.message);
      return false;
    }
  }

  /**
   * Inicia la conexión con WhatsApp Web
   * @param {object} options
   * @param {(qr: string) => void} [options.onQR] - callback cuando se genera un QR
   * @param {(status: string) => void} [options.onStatus] - callback de estado
   */
  async init({ onQR, onStatus } = {}) {
    // State machine: only init if idle or disconnected
    if (this._state === 'connecting') return;
    if (this._state === 'connected' && this.sock) return;
    
    this._state = 'connecting';

    try {
      // Asegurar que el directorio de sesión existe
      if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
      }

      // Restoration logic:
      // 1. If creds.json exists on filesystem → use it directly
      // 2. If not but DB backup exists → restore to filesystem, then use it
      // 3. If neither → wait for QR scan
      const credsPath = path.join(SESSION_DIR, 'creds.json');
      const tieneCredsFS = fs.existsSync(credsPath);

      if (!tieneCredsFS) {
        // Intentar restaurar desde DB
        const restored = await this._restoreBackupFromDB();
        if (restored) {
          console.log('[WA-SESSION] Backup restaurado desde DB al filesystem');
        }
      }

      let version;
      try {
        const result = await fetchLatestBaileysVersion();
        version = result.version;
      } catch (err) {
        console.warn('[WA-SESSION] No se pudo obtener versión de Baileys, usando default:', err.message);
        version = [2, 3000, 123];
      }
      
      const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

      // useMultiFileAuthState loads existing creds if they exist
      const tieneSesion = fs.existsSync(credsPath);
      if (tieneSesion) {
        console.log('[WA-SESSION] Sesión guardada encontrada, conectando...');
      } else {
        console.log('[WA-SESSION] No hay sesión guardada. Esperando QR...');
      }

      const sock = makeWASocket({
        version,
        browser: Browsers.windows('Chrome'),
        auth: state,
        logger: pino({ level: 'silent' }),
        syncFullHistory: false,
        markOnlineOnConnect: true,
      });

      this.sock = sock;

      // Guardar credenciales cuando se actualicen → también backup a DB
      sock.ev.on('creds.update', async () => {
        try {
          await saveCreds();
        } catch (err) {
          console.error('[WA-SESSION] Error guardando credenciales:', err.message);
          return;
        }
        try {
          await this._saveBackupToDB();
        } catch (err) {
          console.error('[WA-SESSION] Error en backup DB:', err.message);
        }
      });

      // Manejar eventos de conexión
      sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        if (qr) {
          this.isConnected = false;
          this.phoneNumber = null;
          this._lastQR = qr;
          console.log('\n[WA-SESSION] 📱 Escaneá este código QR con WhatsApp:');
          qrcode.generate(qr, { small: false });
          if (onQR) onQR(qr);
        }

        if (connection === 'open') {
          this.isConnected = true;
          this._state = 'connected';
          this.phoneNumber = sock.user?.id?.split(':')[0] || 'desconocido';
          this._lastQR = null; // ya no se necesita QR
          console.log(`[WA-SESSION] ✅ Conectado como ${this.phoneNumber}`);
          if (onStatus) onStatus(`conectado:${this.phoneNumber}`);
          // Backup después de conectar exitosamente
          this._saveBackupToDB();
        }

        if (connection === 'close') {
          this.isConnected = false;
          const shouldReconnect = (lastDisconnect?.error instanceof Boom)
            ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
            : true;

          if (shouldReconnect) {
            console.log('[WA-SESSION] Reconectando en 5s...');
            this._state = 'disconnected';
            setTimeout(() => {
              this.init({ onQR, onStatus });
            }, 5000);
          } else {
            console.log('[WA-SESSION] Sesión cerrada (logged out). Backup eliminado.');
            this._lastQR = null;
            this._state = 'disconnected';
            // Limpiar backup en DB si fue deslogueado
            if (this._prisma) {
              this._prisma.configuracion.delete({ where: { clave: 'wa_session_backup' } }).catch(err => console.error('[WA-SESSION] Error eliminando backup:', err.message));
            }
          }
        }
      });

      return sock;
    } catch (err) {
      this._state = 'disconnected';
      this.isConnected = false;
      console.error('[WA-SESSION] Error fatal en init, WhatsApp no disponible:', err.message);
    }
  }

  /** Devuelve el último QR generado (para la API) */
  getLastQR() {
    return this._lastQR;
  }

  /** Devuelve el socket activo. Lanza error si no está conectado. */
  getSocket() {
    if (!this.sock || !this.isConnected) {
      throw new Error('WhatsApp Web no está conectado. Escaneá el QR primero.');
    }
    return this.sock;
  }

  /** Verifica si la sesión está conectada */
  isActive() {
    return this.isConnected && this.sock !== null;
  }
}

// Singleton
export const waSession = new WaSession();
