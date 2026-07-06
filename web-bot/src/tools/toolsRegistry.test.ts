import { describe, expect, it } from 'vitest';
import { defaultTools, getToolsForMode } from './index.js';

describe('defaultTools registry', () => {
  it('registers 22 tools with unique names', () => {
    expect(defaultTools).toHaveLength(22);
    const names = defaultTools.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('portfolio mode usa menos tools que standalone (ahorro de tokens)', () => {
    const standalone = getToolsForMode('standalone');
    const portfolio = getToolsForMode('portfolio').map((t) => t.name);
    expect(standalone.length).toBeGreaterThan(portfolio.length);
    expect(portfolio).toContain('contactar_whatsapp');
    expect(portfolio).toContain('perfil_luis');
    expect(portfolio).toContain('analizar_oferta');
    expect(portfolio).not.toContain('trivia_pregunta');
    expect(portfolio).toHaveLength(8);
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
