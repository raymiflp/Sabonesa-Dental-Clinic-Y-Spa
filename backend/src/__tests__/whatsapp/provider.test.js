import { describe, it, expect, vi } from 'vitest';

// Mock Baileys + wa-session so loading provider.js does NOT touch the real
// Baileys library or any filesystem state (creds.json, etc.).
vi.mock('@whiskeysockets/baileys', () => ({
  default: {},
  makeWASocket: vi.fn(),
  useMultiFileAuthState: vi.fn(),
  DisconnectReason: { loggedOut: 401 },
  fetchLatestBaileysVersion: vi.fn(),
  Browsers: { windows: vi.fn() },
}));
vi.mock('../../whatsapp/wa-session.js', () => ({ waSession: {} }));

// Mock the two providers so we control exactly what they return.
// This is the entire surface of the bug #1 fix: when the primary provider
// fails, sendStrict MUST return exito:false — no wa.me fallback, no exito:true.
vi.mock('../../whatsapp/providers/manual.js', () => ({
  ManualProvider: class {
    async send() {
      // The fallback provider would happily return exito:true with a waUrl.
      // sendStrict must NOT call this — we assert that by checking waUrl stays null.
      return { exito: true, messageId: null, error: null, waUrl: 'https://wa.me/FALLBACK' };
    }
  },
}));
vi.mock('../../whatsapp/providers/web.js', () => ({
  WhatsAppWebProvider: class {
    async send() {
      return { exito: false, messageId: null, error: 'WhatsApp Web no conectado', waUrl: null };
    }
  },
}));

import { ProviderResolver } from '../../whatsapp/provider.js';

describe('ProviderResolver.sendStrict', () => {
  function makePrismaMock(modeValue = 'web', fallbackValue = 'on_error') {
    return {
      configuracion: {
        findMany: vi.fn().mockResolvedValue([
          { clave: 'whatsapp_provider_mode', valor: modeValue },
          { clave: 'whatsapp_fallback_mode', valor: fallbackValue },
        ]),
      },
    };
  }

  it('returns exito:false (no fallback) when the primary web provider fails', async () => {
    const resolver = new ProviderResolver(makePrismaMock('web', 'on_error'));

    const result = await resolver.sendStrict({
      telefono: '5491122334455',
      mensaje: 'recordatorio cita',
      paciente: { nombres: 'Test' },
      prisma: makePrismaMock('web', 'on_error'),
    });

    expect(result.exito).toBe(false);
    expect(result.error).toBe('WhatsApp Web no conectado');
    // Bug #1 regression guard: sendStrict must NOT silently fall back to wa.me.
    expect(result.waUrl).toBeNull();
    expect(result.messageId).toBeNull();
  });

  it('returns exito:true with messageId on success', async () => {
    // Override the web provider mock for this case
    const { WhatsAppWebProvider } = await import('../../whatsapp/providers/web.js');
    vi.spyOn(WhatsAppWebProvider.prototype, 'send').mockResolvedValueOnce({
      exito: true,
      messageId: 'BAE5ABC123',
      error: null,
      waUrl: null,
    });

    const resolver = new ProviderResolver(makePrismaMock('web', 'on_error'));
    const result = await resolver.sendStrict({
      telefono: '5491122334455',
      mensaje: 'hola',
      paciente: {},
      prisma: makePrismaMock('web', 'on_error'),
    });

    expect(result.exito).toBe(true);
    expect(result.messageId).toBe('BAE5ABC123');
    expect(result.error).toBeNull();
    expect(result.waUrl).toBeNull();
  });

  // Regression guard for H1: when mode='manual' the active provider IS ManualProvider,
  // whose deliverable is the deeplink. sendStrict MUST preserve that waUrl —
  // dropping it would persist whatsappUrl=null and leave the operator without
  // the link they actually generated.
  it('preserves waUrl when mode=manual (the active provider IS wa.me)', async () => {
    const resolver = new ProviderResolver(makePrismaMock('manual', 'never'));
    const result = await resolver.sendStrict({
      telefono: '5491122334455',
      mensaje: 'recordatorio cita',
      paciente: { nombres: 'Test' },
      prisma: makePrismaMock('manual', 'never'),
    });

    expect(result.exito).toBe(true);
    expect(result.waUrl).toBe('https://wa.me/FALLBACK');
  });
});