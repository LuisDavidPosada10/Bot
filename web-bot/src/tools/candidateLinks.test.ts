import { describe, expect, it } from 'vitest';
import { perfilLuisTool } from './candidateLinks.js';

describe('perfil_luis', () => {
  it('devuelve links oficiales del candidato', async () => {
    const raw = await perfilLuisTool.invoke({});
    const data = JSON.parse(raw as string);
    expect(data.nombre).toBe('Luis David Posada');
    expect(data.cvPdf).toContain('Luis-David-Posada-CV.pdf');
    expect(data.linkedin).toContain('linkedin.com');
    expect(data.github).toContain('github.com');
    expect(data.email).toContain('@');
    expect(data.mensajeSugerido).toContain('[CV en PDF]');
    expect(data.mensajeSugerido).toContain('mailto:');
  });
});
