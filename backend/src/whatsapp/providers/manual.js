import { WhatsAppProvider } from '../base.js';
const WA_BASE = 'https://wa.me';

export class ManualProvider extends WhatsAppProvider {
  async send({ telefono, mensaje, paciente }) {
    if (!telefono) {
      return { exito: false, messageId: null, error: 'Teléfono no proporcionado', waUrl: null };
    }
    const telefonoLimpio = telefono.replace(/[^\d]/g, '');
    if (!telefonoLimpio) {
      return { exito: false, messageId: null, error: 'Teléfono inválido después de limpiar', waUrl: null };
    }
    const waUrl = `${WA_BASE}/${telefonoLimpio}?text=${encodeURIComponent(mensaje || '')}`;
    return { exito: true, messageId: null, error: null, waUrl };
  }
}
