/**
 * Smoke test: ejecuta cada herramienta directamente y prueba el chat API.
 * Uso: npx tsx scripts/test-all-tools.ts
 */
import 'dotenv/config';
import { defaultTools, getToolsForMode } from '../src/tools/index.js';

const API = process.env.API_URL ?? 'http://localhost:3000';

type Result = { tool: string; ok: boolean; detail: string; sample?: string };

const toolArgs: Record<string, Record<string, unknown>> = {
  hora_actual: {},
  calculadora: { expresion: 'sqrt(144) + 2^3' },
  ejecutar_funcion: { nombre: 'saludar', argumentos: { nombre: 'Luis' } },
  buscar_web: { query: 'capital de Colombia' },
  buscar_mejor_precio: { product: 'auriculares bluetooth', country: 'co' },
  clima_actual: { ciudad: 'Bogotá', unidad: 'c' },
  cotizacion_cripto: { monedas: ['bitcoin', 'ethereum'] },
  conversor_divisas: { monto: 100, de: 'USD', a: 'COP' },
  calculadora_financiera: {
    tipo: 'interes_compuesto',
    params: { capital: 1000, tasaAnual: 5, anos: 1 },
  },
  generar_contrasena: { longitud: 16 },
  traducir_texto: { texto: 'Hello world', de: 'en', a: 'es' },
  generador_qr: { tipo: 'url', contenido: 'https://example.com' },
  buscar_receta: { nombre: 'pasta' },
  trivia_pregunta: { categoria: 'science', dificultad: 'easy' },
  evaluar_cv: { cvText: 'Luis David Posada, desarrollador Full Stack con React y Node.js.' },
  generar_carta: {
    cvText: 'Desarrollador React con 2 años de experiencia',
    jobDescription: 'Buscamos Frontend Developer con React',
  },
  analizar_oferta: {
    jobDescription: 'Buscamos React, TypeScript, Node.js',
    cvText: 'Desarrollador con React, TypeScript, Express',
  },
  crear_roadmap: { gaps: ['TypeScript', 'testing'], weeks: 4, role: 'Frontend Developer' },
  generar_bullets_cv: {
    cvText: 'Desarrollé app React con 10k usuarios',
    jobDescription: 'Frontend React TypeScript',
  },
  entrevista_tecnica: { mode: 'start', topic: 'frontend', level: 'junior' },
  perfil_luis: {},
  contactar_whatsapp: { mensaje: 'Hola Luis, vi tu portafolio' },
};

const chatPrompts: { label: string; message: string }[] = [
  { label: 'clima', message: '¿Cómo está el clima en Bogotá hoy y los próximos 3 días?' },
  { label: 'hora', message: '¿Qué hora es ahora?' },
  { label: 'calculadora', message: '¿Cuánto es 15% de 2400?' },
  { label: 'cripto', message: '¿Cuál es el precio actual de Bitcoin?' },
  { label: 'divisas', message: 'Convierte 50 dólares a pesos colombianos' },
  { label: 'traduccion', message: 'Traduce al inglés: Buenos días, ¿cómo estás?' },
  { label: 'contrasena', message: 'Genera una contraseña segura de 20 caracteres' },
  { label: 'qr', message: 'Genera un código QR para https://github.com' },
  { label: 'receta', message: 'Busca una receta de pasta carbonara' },
  { label: 'trivia', message: 'Dame una pregunta de trivia de ciencia' },
  { label: 'finanzas', message: 'Calcula el interés compuesto de 5000 USD al 8% anual por 3 años' },
  { label: 'perfil', message: 'dime su perfil profesional' },
];

function summarize(output: string, max = 200): string {
  const oneLine = output.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? oneLine.slice(0, max) + '…' : oneLine;
}

function checkOutput(tool: string, output: string): { ok: boolean; detail: string } {
  try {
    const parsed = JSON.parse(output);
    if (parsed.error) return { ok: false, detail: parsed.error };
  } catch {
    // plain text ok
  }

  if (tool === 'clima_actual') {
    const data = JSON.parse(output);
    const today = new Date().toISOString().slice(0, 10);
    const year = new Date().getFullYear();
    const dates: string[] = (data.pronostico3dias ?? []).map((d: { fecha: string }) => d.fecha);
    const stale = dates.filter((d) => {
      const y = parseInt(d.slice(0, 4), 10);
      return y < year - 1 || (d < today && !dates.includes(today));
    });
    if (stale.length) return { ok: false, detail: `Fechas sospechosas: ${stale.join(', ')}` };
    if (!dates.length) return { ok: false, detail: 'Sin pronóstico' };
    return { ok: true, detail: `Fechas: ${dates.join(', ')}` };
  }

  if (output.includes('error') && output.includes('Error')) {
    return { ok: false, detail: summarize(output) };
  }

  return { ok: true, detail: 'OK' };
}

async function testToolsDirect(): Promise<Result[]> {
  const results: Result[] = [];

  for (const [name, args] of Object.entries(toolArgs)) {
    const tool =
      defaultTools.find((t) => t.name === name) ??
      getToolsForMode('portfolio').find((t) => t.name === name);
    if (!tool) {
      results.push({ tool: name, ok: false, detail: 'Tool no encontrada' });
      continue;
    }
    try {
      const raw = await tool.invoke(args);
      const output = typeof raw === 'string' ? raw : JSON.stringify(raw);
      const check = checkOutput(name, output);
      results.push({
        tool: name,
        ok: check.ok,
        detail: check.detail,
        sample: summarize(output, 120),
      });
    } catch (err) {
      results.push({
        tool: name,
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

async function testChat(): Promise<Result[]> {
  const results: Result[] = [];
  const failurePhrases = /inconveniente temporal|error interno/i;

  for (const { label, message } of chatPrompts) {
    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': `test-${label}-${Date.now()}` },
        body: JSON.stringify({ message }),
      });
      const data = (await res.json()) as {
        answer?: string;
        toolResults?: { name: string; output: string }[];
        error?: string;
      };

      if (!res.ok) {
        results.push({ tool: `chat:${label}`, ok: false, detail: data.error ?? `HTTP ${res.status}` });
        continue;
      }

      const answer = data.answer ?? '';
      const toolsUsed = (data.toolResults ?? []).map((t) => t.name).join(', ') || 'ninguna';
      let ok = answer.length > 10 && !failurePhrases.test(answer);
      let detail = `tools: ${toolsUsed}`;

      if (label === 'perfil' && !/linkedin|github|CV|Luis/i.test(answer)) {
        ok = false;
        detail += ' | sin links de perfil';
      }

      if (label === 'clima') {
        const year = new Date().getFullYear();
        const hasOldYear = /\b202[0-3]\b/.test(answer);
        const toolOut = data.toolResults?.find((t) => t.name === 'clima_actual')?.output;
        if (toolOut) {
          const parsed = JSON.parse(toolOut);
          const dates = (parsed.pronostico3dias ?? []).map((d: { fecha: string }) => d.fecha).join(', ');
          detail += ` | API dates: ${dates}`;
        }
        if (hasOldYear) {
          ok = false;
          detail += ' | ⚠️ Respuesta menciona año 2020-2023';
        }
        const toolDates = toolOut ? JSON.parse(toolOut).pronostico3dias?.map((d: { fecha: string }) => d.fecha) : [];
        const answerYears = [...answer.matchAll(/\b(20\d{2})\b/g)].map((m) => parseInt(m[1], 10));
        const wrongYears = answerYears.filter((y) => y < year);
        if (wrongYears.length) {
          ok = false;
          detail += ` | años incorrectos en respuesta: ${[...new Set(wrongYears)].join(', ')}`;
        }
        if (toolDates.length && !answer.includes(toolDates[0]?.slice(0, 4))) {
          // soft check - LLM might format differently
        }
      }

      results.push({
        tool: `chat:${label}`,
        ok,
        detail,
        sample: summarize(answer, 150),
      });
    } catch (err) {
      results.push({
        tool: `chat:${label}`,
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

async function main() {
  console.log('\n=== TEST DIRECTO DE HERRAMIENTAS ===\n');
  const direct = await testToolsDirect();
  for (const r of direct) {
    console.log(`${r.ok ? '✅' : '❌'} ${r.tool}: ${r.detail}`);
    if (r.sample) console.log(`   → ${r.sample}`);
  }

  console.log('\n=== TEST CHAT API (agente completo) ===\n');
  const chat = await testChat();
  for (const r of chat) {
    console.log(`${r.ok ? '✅' : '❌'} ${r.tool}: ${r.detail}`);
    if (r.sample) console.log(`   → ${r.sample}`);
  }

  const failed = [...direct, ...chat].filter((r) => !r.ok);
  console.log(`\n=== RESUMEN: ${direct.length + chat.length - failed.length}/${direct.length + chat.length} OK ===`);
  if (failed.length) {
    console.log('Fallos:', failed.map((f) => f.tool).join(', '));
    process.exit(1);
  }
}

main();
