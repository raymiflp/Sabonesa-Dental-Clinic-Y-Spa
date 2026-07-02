import { WhatsAppProvider } from '../base.js';
import { waSession } from '../wa-session.js';

/**
 * Provider que envía mensajes REALES de WhatsApp usando WhatsApp Web (Baileys).
 * El mensaje llega al teléfono del paciente como si se lo enviaras manualmente.
 */
export class WhatsAppWebProvider extends WhatsAppProvider {
  async send({ telefono, mensaje, paciente }) {
    if (!telefono) {
      return { exito: false, messageId: null, error: 'Teléfono no proporcionado', waUrl: null };
    }

    // Verificar que la sesión esté conectada
    if (!waSession.isActive()) {
      return { exito: false, messageId: null, error: 'WhatsApp Web no conectado. Escaneá el QR primero.', waUrl: null };
    }

    const sock = waSession.getSocket();

    // Limpiar teléfono: dejar solo dígitos
    const telefonoLimpio = telefono.replace(/[^\d]/g, '');
    if (!telefonoLimpio) {
      return { exito: false, messageId: null, error: 'Teléfono inválido', waUrl: null };
    }

    // Formato JID: {país}código@s.whatsapp.net
    // Asumir +1 (RD) si el teléfono llega en formato local de 10 dígitos (809/829/849...)
    const telefonoCompleto = telefonoLimpio.length === 10 ? '1' + telefonoLimpio : telefonoLimpio;
    const jid = `${telefonoCompleto}@s.whatsapp.net`;

    try {
      const result = await sock.sendMessage(jid, { text: mensaje || '' });

      const messageId = result?.key?.id || null;

      console.log(`[WA-WEB] ✅ Enviado a ${paciente?.nombres || telefono}${messageId ? ', msgId: ' + messageId : ''}`);

      return {
        exito: true,
        messageId,
        error: null,
        waUrl: null, // no se necesita link wa.me
      };
    } catch (err) {
      const errorMsg = err.message || 'Error al enviar por WhatsApp Web';
      console.error(`[WA-WEB] ❌ Error enviando a ${telefono}:`, errorMsg);
      return { exito: false, messageId: null, error: errorMsg, waUrl: null };
    }
  }
}
