/** Chat API smoke test. Uso: npx tsx scripts/chat-smoke-test.ts */
import 'dotenv/config';

const API = 'http://localhost:3000';
const year = new Date().getFullYear();

const prompts = [
  { id: 'hora', msg: 'Que hora es ahora?' },
  { id: 'math', msg: 'Cuanto es 15% de 2400?' },
  { id: 'crypto', msg: 'Precio actual de Bitcoin y Ethereum' },
  { id: 'divisas', msg: 'Convierte 50 dolares a pesos colombianos' },
  { id: 'traduccion', msg: 'Traduce al ingles: Buenos dias' },
  { id: 'password', msg: 'Genera contrasena segura de 16 caracteres' },
  { id: 'qr', msg: 'Genera QR para https://github.com' },
  { id: 'receta', msg: 'Busca receta de pasta' },
  { id: 'trivia', msg: 'Pregunta de trivia facil' },
  { id: 'finanzas', msg: 'Interes compuesto de 5000 USD al 8% anual por 3 anos' },
  { id: 'web', msg: 'Cual es la capital de Peru?' },
];

for (const { id, msg } of prompts) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': `smoke-${id}-${Date.now()}`,
      },
      body: JSON.stringify({ message: msg }),
    });
    const data = (await res.json()) as {
      answer?: string;
      toolResults?: { name: string }[];
      error?: string;
    };
    const ms = Date.now() - t0;
    if (!res.ok) {
      console.log(`❌ ${id} (${ms}ms) HTTP ${res.status}: ${data.error}`);
      continue;
    }
    const tools = (data.toolResults ?? []).map((t) => t.name).join(', ') || 'sin-tool';
    const answer = data.answer ?? '';
    const badYear = [...answer.matchAll(/\b(20\d{2})\b/g)]
      .map((m) => parseInt(m[1], 10))
      .filter((y) => y < year);
    const ok = answer.length > 5 && badYear.length === 0;
    console.log(`${ok ? '✅' : '⚠️'} ${id} (${ms}ms) [${tools}] ${answer.slice(0, 100).replace(/\n/g, ' ')}…`);
  } catch (e) {
    console.log(`❌ ${id} ${e instanceof Error ? e.message : e}`);
  }
}
