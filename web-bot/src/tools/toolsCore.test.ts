import { describe, expect, it } from 'vitest';
import { horaActualTool } from './time.js';
import { ejecutarFuncionTool } from './customFunction.js';
import { generarContrasenaTool } from './password.js';
import { calculadoraFinancieraTool } from './finance.js';
import { generadorQrTool } from './qr.js';

describe('hora_actual', () => {
  it('returns real server date/time as JSON', async () => {
    const output = await horaActualTool.invoke({});
    const data = JSON.parse(output as string);
    expect(new Date(data.fechaHoraISO).toISOString()).toBe(data.fechaHoraISO);
    expect(data.anio).toBe(new Date().getFullYear());
  });
});

describe('ejecutar_funcion', () => {
  it('saludar returns greeting', async () => {
    const output = await ejecutarFuncionTool.invoke({ nombre: 'saludar', argumentos: { quien: 'Luis' } });
    expect(output).toBe('Hola, Luis!');
  });

  it('eco returns serialized args', async () => {
    const output = await ejecutarFuncionTool.invoke({ nombre: 'eco', argumentos: { ok: true } });
    expect(JSON.parse(output as string)).toEqual({ ok: true });
  });

  it('unknown function returns not implemented message', async () => {
    const output = await ejecutarFuncionTool.invoke({ nombre: 'desconocida' });
    expect(output).toContain('no implementada');
  });
});

describe('generar_contrasena', () => {
  it('generates password with requested length and metadata', async () => {
    const output = await generarContrasenaTool.invoke({ longitud: 12, simbolos: false });
    const parsed = JSON.parse(output as string);
    expect(parsed.password).toHaveLength(12);
    expect(parsed.fortaleza).toBeDefined();
    expect(parsed.entropia).toMatch(/bits$/);
  });
});

describe('calculadora_financiera', () => {
  it('calculates loan payment', async () => {
    const output = await calculadoraFinancieraTool.invoke({
      tipo: 'prestamo',
      params: { capital: 1000, tasaAnual: 12, meses: 12 },
    });
    const parsed = JSON.parse(output as string);
    expect(parsed.tipo).toBe('prestamo');
    expect(parsed.pagoMensual).toBeGreaterThan(0);
  });

  it('calculates ROI', async () => {
    const output = await calculadoraFinancieraTool.invoke({
      tipo: 'roi',
      params: { inversion: 100, ganancia: 150 },
    });
    const parsed = JSON.parse(output as string);
    expect(parsed.roi).toBe('50%');
  });

  it('calculates break-even units', async () => {
    const output = await calculadoraFinancieraTool.invoke({
      tipo: 'equilibrio',
      params: { costoFijo: 1000, precioVenta: 50, costoVariable: 20 },
    });
    const parsed = JSON.parse(output as string);
    expect(parsed.unidadesEquilibrio).toBe(34);
  });
});

describe('generador_qr', () => {
  it('builds QR image URL for a website', async () => {
    const output = await generadorQrTool.invoke({ contenido: 'https://example.com' });
    const parsed = JSON.parse(output as string);
    expect(parsed.tipo).toBe('URL');
    expect(parsed.url_imagen).toContain('api.qrserver.com');
  });

  it('rejects empty content', async () => {
    const output = await generadorQrTool.invoke({ contenido: '   ' });
    const parsed = JSON.parse(output as string);
    expect(parsed.error).toBeDefined();
  });
});
