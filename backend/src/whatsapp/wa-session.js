import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import qrcode from 'qrcode-terminal';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_DIR = path.join(__dirname, '..', '..', 'wa-session');

/** Singleton que mantiene la conexión con WhatsApp Web */
class WaSession {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.phoneNumber = null;
    this._connecting = false;
  }

  /**
   * Inicia la conexión con WhatsApp Web
   * @param {object} options
   * @param {(qr: string) => void} [options.onQR] - callback cuando se genera un QR
   * @param {(status: string) => void} [options.onStatus] - callback de estado
   */
  async init({ onQR, onStatus } = {}) {
    if (this._connecting) return;
    this._connecting = true;

    // Asegurar que el directorio de sesión existe
    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    }

    const { version, isLatest } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    // Si ya hay credenciales guardadas, no pedir QR
    const tieneSesion = fs.existsSync(path.join(SESSION_DIR, 'creds.json'));
    if (tieneSesion) {
      console.log('[WA-SESSION] Sesión guardada encontrada, conectando...');
    } else {
      console.log('[WA-SESSION] No hay sesión guardada. Esperando QR...');
    }

    const sock = makeWASocket({
      version,
      browser: Browsers.windows('Chrome'),
      auth: state,
      logger: pino({ level: 'silent' }), // silenciar logs internos
      syncFullHistory: false,
      markOnlineOnConnect: true,
    });

    this.sock = sock;

    // Guardar credenciales cuando se actualicen
    sock.ev.on('creds.update', saveCreds);

    // Manejar eventos de conexión
    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      // Si hay QR, lo mostramos en la terminal y lo emitimos
      if (qr) {
        this.isConnected = false;
        this.phoneNumber = null;
        console.log('\n[WA-SESSION] 📱 Escaneá este código QR con WhatsApp (enlace Whatsapp → Dispositivos vinculados → Vincular dispositivo):');
        qrcode.generate(qr, { small: false });
        if (onQR) onQR(qr);
      }

      if (connection === 'open') {
        this.isConnected = true;
        this.phoneNumber = sock.user?.id?.split(':')[0] || 'desconocido';
        console.log(`[WA-SESSION] ✅ Conectado como ${this.phoneNumber}`);
        if (onStatus) onStatus(`conectado:${this.phoneNumber}`);
        this._connecting = false;
      }

      if (connection === 'close') {
        this.isConnected = false;
        const shouldReconnect = (lastDisconnect?.error instanceof Boom)
          ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
          : true;

        if (shouldReconnect) {
          console.log('[WA-SESSION] Reconectando en 5s...');
          setTimeout(() => {
            this._connecting = false;
            this.init({ onQR, onStatus });
          }, 5000);
        } else {
          console.log('[WA-SESSION] Sesión cerrada. Eliminá la carpeta wa-session/ y reiniciá para escanear QR de nuevo.');
          this._connecting = false;
        }
      }
    });

    return sock;
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
