import { WhatsAppProvider } from '../base.js';

export class TwilioProvider extends WhatsAppProvider {
  async send({ telefono, mensaje, paciente }) {
    const sid = process.env.TWILIO_SID;
    const token = process.env.TWILIO_TOKEN;
    const from = process.env.TWILIO_FROM;

    if (!sid) throw new Error('TWILIO_SID no configurado en .env');
    if (!token) throw new Error('TWILIO_TOKEN no configurado en .env');
    if (!from) throw new Error('TWILIO_FROM no configurado en .env');
    if (!telefono) return { exito: false, messageId: null, error: 'Teléfono no proporcionado', waUrl: null };

    const telefonoLimpio = telefono.replace(/[^\d]/g, '');
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const body = new URLSearchParams({
      To: `whatsapp:+${telefonoLimpio}`,
      From: `whatsapp:${from}`,
      Body: mensaje || '',
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
          signal: controller.signal,
        }
      );

      const data = await response.json();

      if (response.ok && data.sid) {
        return { exito: true, messageId: data.sid, error: null, waUrl: null };
      }

      const errorMsg = data?.message || `HTTP ${response.status}`;
      return { exito: false, messageId: null, error: errorMsg, waUrl: null };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { exito: false, messageId: null, error: 'Timeout: Twilio no respondió en 10s', waUrl: null };
      }
      return { exito: false, messageId: null, error: err.message, waUrl: null };
    } finally {
      clearTimeout(timeout);
    }
  }
}
