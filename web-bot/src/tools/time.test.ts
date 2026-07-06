import { describe, expect, it } from 'vitest';
import { horaActualTool } from './time.js';

describe('hora_actual', () => {
  it('devuelve fechaLegible, hora y año reales del servidor', async () => {
    const raw = await horaActualTool.invoke({});
    const data = JSON.parse(raw as string);
    const realYear = new Date().getFullYear();

    expect(data.anio).toBe(realYear);
    expect(data.fechaHoraISO).toContain(String(realYear));
    expect(typeof data.fechaLegible).toBe('string');
    expect(typeof data.hora).toBe('string');
    expect(data.nota).toMatch(/nunca/i);
  });
});
