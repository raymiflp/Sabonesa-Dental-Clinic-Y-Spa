import { WaMeProvider } from './providers/wa.js';
import { WabaProvider } from './providers/waba.js';
import { TwilioProvider } from './providers/twilio.js';
import { WhatsAppWebProvider } from './providers/web.js';
import { WhatsAppProvider } from './base.js';
import { waSession } from './wa-session.js';

export { WhatsAppProvider };

export class ProviderResolver {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getActive() {
    const configs = await this.prisma.configuracion.findMany({
      where: { clave: { in: ['whatsapp_provider_mode', 'whatsapp_fallback_mode'] } }
    });
    const cfg = {};
    configs.forEach(c => { cfg[c.clave] = c.valor; });

    const mode = cfg.whatsapp_provider_mode || 'wa';
    const fallback = cfg.whatsapp_fallback_mode || 'on_error';

    let provider;
    switch (mode) {
      case 'waba': provider = new WabaProvider(); break;
      case 'twilio': provider = new TwilioProvider(); break;
      case 'web': provider = new WhatsAppWebProvider(); break;
      case 'wa': provider = new WaMeProvider(); break;
      default:
        console.warn(`[ProviderResolver] Modo provider desconocido: "${mode}", usando wa.me`);
        provider = new WaMeProvider();
    }

    return { provider, fallbackMode: fallback, mode };
  }

  async sendWithFallback({ telefono, mensaje, paciente, prisma }) {
    const { provider, fallbackMode, mode } = await this.getActive();

    let result;
    try {
      result = await provider.send({ telefono, mensaje, paciente });
    } catch (err) {
      result = { exito: false, messageId: null, error: err.message, waUrl: null };
    }

    console.log(`[ProviderResolver] Modo: ${mode}, exito: ${result.exito}${result.messageId ? ', msgId: ' + result.messageId : ''}${result.error ? ', error: ' + result.error : ''}`);

    if (result.exito) {
      return { exito: true, messageId: result.messageId || null, error: null, waUrl: result.waUrl || null };
    }

    // Fallback logic
    if (fallbackMode === 'never') {
      return { exito: false, messageId: null, error: result.error, waUrl: null };
    }

    // fallbackMode = 'on_error' (default) or 'always'
    const waProvider = new WaMeProvider();
    const waResult = await waProvider.send({ telefono, mensaje, paciente });
    console.log(`[ProviderResolver] Usando fallback wa.me (${fallbackMode})`);
    return {
      exito: waResult.exito,
      messageId: null,
      error: result.error,
      waUrl: waResult.waUrl || null,
      fallbackUsado: true,
    };
  }

  /**
   * Envía un mensaje usando el provider activo SIN fallback.
   *
   * A diferencia de sendWithFallback, este método:
   *   - NO cae en wa.me deeplink cuando el provider primario falla
   *   - Devuelve exito:false si el envío real falla
   *   - Preserva el waUrl emitido por el provider activo cuando este es
   *     exitoso (caso típico: provider = WaMeProvider en mode='wa', donde
   *     el link wa.me ES el entregable de la operación)
   *
   * Está pensado para flujos donde mentir con un exito:true es peligroso
   * (p.ej. recordatorios a pacientes que se persisten como 'enviado' en DB).
   *
   * El endpoint manual POST /api/whatsapp/test sigue usando sendWithFallback
   * porque el operador quiere ver/clickear el link wa.me cuando algo falla.
   */
  async sendStrict({ telefono, mensaje, paciente, prisma }) {
    const { provider, mode } = await this.getActive();

    let result;
    try {
      result = await provider.send({ telefono, mensaje, paciente });
    } catch (err) {
      result = { exito: false, messageId: null, error: err.message, waUrl: null };
    }

    console.log(`[ProviderResolver] Modo: ${mode}, exito: ${result.exito}${result.messageId ? ', msgId: ' + result.messageId : ''}${result.error ? ', error: ' + result.error : ''}`);

    if (!result.exito) {
      // Sin fallback. El caller decide qué hacer (marcar como fallido, etc.).
      return { exito: false, messageId: null, error: result.error || 'unknown error', waUrl: null };
    }

    // Éxito: preservamos el waUrl del provider (relevante cuando el provider
    // activo es wa.me y el deeplink ES el entregable de la operación).
    return { exito: true, messageId: result.messageId ?? null, error: null, waUrl: result.waUrl ?? null };
  }
}
