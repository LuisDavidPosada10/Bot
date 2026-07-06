/** Prueba rápida de herramientas (sin LLM). Uso: npx tsx scripts/quick-tools-test.ts */
import 'dotenv/config';
import { defaultTools } from '../src/tools/index.js';

const cases: [string, Record<string, unknown>][] = [
  ['hora_actual', {}],
  ['calculadora', { expresion: 'sqrt(144) + 2^3' }],
  ['ejecutar_funcion', { nombre: 'saludar', argumentos: { nombre: 'Test' } }],
  ['clima_actual', { ciudad: 'Bogota', unidad: 'c' }],
  ['cotizacion_cripto', { monedas: ['btc', 'eth'] }],
  ['conversor_divisas', { monto: 100, de: 'USD', a: 'COP' }],
  ['generar_contrasena', { longitud: 12 }],
  ['traducir_texto', { texto: 'Hello', de: 'en', a: 'es' }],
  ['generador_qr', { tipo: 'url', contenido: 'https://example.com' }],
  ['buscar_receta', { nombre: 'pasta' }],
  ['trivia_pregunta', { categoria: 'science', dificultad: 'easy' }],
  ['calculadora_financiera', { tipo: 'interes_compuesto', params: { capital: 1000, tasaAnual: 5, anos: 1 } }],
  ['buscar_web', { query: 'capital de Colombia' }],
];

const map = new Map(defaultTools.map((t) => [t.name, t]));
const year = new Date().getFullYear();

for (const [name, args] of cases) {
  const tool = map.get(name)!;
  const t0 = Date.now();
  try {
    const raw = await tool.invoke(args);
    const out = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const ms = Date.now() - t0;
    let status = 'OK';
    if (out.includes('"error"')) status = 'ERROR';
    if (name === 'clima_actual') {
      const d = JSON.parse(out);
      const dates = (d.pronostico3dias ?? []).map((x: { fecha: string }) => x.fecha);
      const bad = dates.filter((f: string) => parseInt(f.slice(0, 4), 10) < year);
      status = bad.length ? `FECHAS_MAL: ${bad.join(',')}` : `fechas=${dates.join(',')}`;
    }
    console.log(`${status === 'OK' || status.startsWith('fechas') ? '✅' : '❌'} ${name} (${ms}ms) ${status}`);
    if (status !== 'OK' && !status.startsWith('fechas')) console.log('  ', out.slice(0, 180));
  } catch (e) {
    console.log(`❌ ${name} EXC: ${e instanceof Error ? e.message : e}`);
  }
}
