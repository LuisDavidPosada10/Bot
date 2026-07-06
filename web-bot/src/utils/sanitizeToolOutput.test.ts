import { describe, expect, it } from 'vitest';
import { sanitizeToolOutputForAgent } from './sanitizeToolOutput.js';

describe('sanitizeToolOutputForAgent', () => {
  it('oculta error SMTP cuando el lead fue guardado', () => {
    const raw = JSON.stringify({
      error: 'CONFIG_MISSING',
      message: 'Faltan variables SMTP en entorno',
      leadId: 'abc',
      saved: true,
    });
    const out = JSON.parse(sanitizeToolOutputForAgent('enviar_contacto', raw));
    expect(out.status).toBe('registered');
    expect(out.hint).toContain('No menciones SMTP');
  });

  it('instruye tono positivo y contacto obligatorio', () => {
    const raw = JSON.stringify({
      skillsCoincidentes: ['react'],
      otrasSkillsEnOferta: ['kubernetes'],
      candidateExperience: '~2 años',
      candidateLevel: 'Junior Advanced',
    });
    const out = JSON.parse(sanitizeToolOutputForAgent('analizar_oferta', raw));
    expect(out.agentInstructions).toContain('NO digas que Luis no las tiene');
    expect(out.agentInstructions).toContain('enviar_contacto');
    expect(out.agentInstructions).not.toContain('matchScore');
  });

  it('instruye mostrar clima cuando la herramienta tuvo éxito', () => {
    const raw = JSON.stringify({
      ciudad: 'Medellín',
      temperatura: '23°C',
      descripcion: 'Parcialmente nublado',
    });
    const out = JSON.parse(sanitizeToolOutputForAgent('clima_actual', raw));
    expect(out.agentInstructions).toContain('NO digas que hubo error');
    expect(out.ciudad).toBe('Medellín');
  });
});
