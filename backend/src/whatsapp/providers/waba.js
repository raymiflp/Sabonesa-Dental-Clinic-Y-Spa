import { WhatsAppProvider } from '../base.js';

export class WabaProvider extends WhatsAppProvider {
  async send({ telefono, mensaje, paciente }) {
    const token = process.env.WABA_TOKEN;
    const phoneId = process.env.WABA_PHONE_ID;

    if (!token) return { exito: false, messageId: null, error: 'WABA_TOKEN no configurado en .env', waUrl: null };
    if (!phoneId) return { exito: false, messageId: null, error: 'WABA_PHONE_ID no configurado en .env', waUrl: null };
    if (!telefono) return { exito: false, messageId: null, error: 'Teléfono no proporcionado', waUrl: null };

    const telefonoLimpio = telefono.replace(/[^\d]/g, '');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `https://graph.facebook.com/v22.0/${phoneId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: telefonoLimpio,
            type: 'text',
            text: { body: mensaje || '' },
          }),
          signal: controller.signal,
        }
      );

      const data = await response.json();

      if (response.ok && data.messages?.[0]?.id) {
        return { exito: true, messageId: data.messages[0].id, error: null, waUrl: null };
      }

      const errorMsg = data?.error?.message || data?.error || `HTTP ${response.status}`;
      return { exito: false, messageId: null, error: errorMsg, waUrl: null };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { exito: false, messageId: null, error: 'Timeout: WABA no respondió en 10s', waUrl: null };
      }
      return { exito: false, messageId: null, error: err.message, waUrl: null };
    } finally {
      clearTimeout(timeout);
    }
  }
}
