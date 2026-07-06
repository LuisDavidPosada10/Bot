import { describe, expect, it } from 'vitest';
import { defaultTools, getToolsForMode } from './index.js';

describe('defaultTools registry', () => {
  it('registers 22 tools with unique names', () => {
    expect(defaultTools).toHaveLength(22);
    const names = defaultTools.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('includes contactar_whatsapp only in portfolio mode', () => {
    const standalone = getToolsForMode('standalone').map((t) => t.name);
    const portfolio = getToolsForMode('portfolio').map((t) => t.name);
    expect(standalone).not.toContain('contactar_whatsapp');
    expect(portfolio).toContain('contactar_whatsapp');
    expect(portfolio).toHaveLength(23);
  });

  it('includes core utility and career tools', () => {
    const names = defaultTools.map((tool) => tool.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'hora_actual',
        'calculadora',
        'buscar_web',
        'evaluar_cv',
        'entrevista_tecnica',
        'enviar_contacto',
        'perfil_luis',
      ])
    );
  });
});
