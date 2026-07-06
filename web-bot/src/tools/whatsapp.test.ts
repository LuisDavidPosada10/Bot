import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('contactar_whatsapp', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('genera link wa.me cuando WHATSAPP_NUMBER está configurado', async () => {
    vi.stubEnv('WHATSAPP_NUMBER', '573001234567');
    const { contactarWhatsappTool } = await import('./whatsapp.js');
    const raw = await contactarWhatsappTool.invoke({ nombre: 'Carlos', empresa: 'TechCo' });
    const data = JSON.parse(raw as string);
    expect(data.ok).toBe(true);
    expect(data.link).toContain('https://wa.me/573001234567');
    expect(data.mensajeSugerido).toContain('[Abrir chat');
  });

  it('devuelve error si no hay número configurado', async () => {
    vi.stubEnv('WHATSAPP_NUMBER', '');
    const { contactarWhatsappTool } = await import('./whatsapp.js');
    const raw = await contactarWhatsappTool.invoke({});
    const data = JSON.parse(raw as string);
    expect(data.error).toBe('WHATSAPP_NOT_CONFIGURED');
  });
});
