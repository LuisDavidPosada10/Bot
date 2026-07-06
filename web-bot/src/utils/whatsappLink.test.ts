import { describe, expect, it } from 'vitest';
import {
  buildRecruiterWhatsAppText,
  buildWhatsAppUrl,
  normalizeWhatsAppPhone,
} from './whatsappLink.js';

describe('whatsappLink', () => {
  it('normaliza teléfono con prefijo país', () => {
    expect(normalizeWhatsAppPhone('+57 300 123 4567')).toBe('573001234567');
  });

  it('genera wa.me con texto prellenado', () => {
    const url = buildWhatsAppUrl('573001234567', 'Hola Luis');
    expect(url).toMatch(/^https:\/\/wa\.me\/573001234567\?text=/);
    expect(decodeURIComponent(url.split('text=')[1]!)).toBe('Hola Luis');
  });

  it('arma mensaje personalizado para reclutador', () => {
    const text = buildRecruiterWhatsAppText({
      nombre: 'Ana',
      empresa: 'Acme',
      vacante: 'Frontend React',
    });
    expect(text).toContain('Ana');
    expect(text).toContain('Acme');
    expect(text).toContain('Frontend React');
  });
});
