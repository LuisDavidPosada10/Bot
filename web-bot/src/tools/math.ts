import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('mathTool');

export class SafeEvaluator {
  private input = '';
  private pos = 0;

  private peek(): string {
    return this.input[this.pos] ?? '';
  }

  private consume(): string {
    return this.input[this.pos++] ?? '';
  }

  private skipSpaces() {
    while (this.input[this.pos] === ' ') this.pos++;
  }

  evaluate(expr: string): number {
    this.input = expr.toLowerCase().replace(/\s+/g, ' ').trim();
    this.pos = 0;
    const result = this.parseExpr();
    this.skipSpaces();
    if (this.pos < this.input.length) {
      throw new Error(`Token inesperado: '${this.peek()}' en posicion ${this.pos}`);
    }
    return result;
  }

  private parseExpr(): number {
    return this.parseAddSub();
  }

  private parseAddSub(): number {
    let val = this.parseMulDiv();
    this.skipSpaces();
    while (this.peek() === '+' || this.peek() === '-') {
      const op = this.consume();
      this.skipSpaces();
      const right = this.parseMulDiv();
      val = op === '+' ? val + right : val - right;
      this.skipSpaces();
    }
    return val;
  }

  private parseMulDiv(): number {
    let val = this.parsePow();
    this.skipSpaces();
    while (this.peek() === '*' || this.peek() === '/' || this.peek() === '%') {
      if (this.peek() === '*' && this.input[this.pos + 1] === '*') {
        this.pos += 2;
        this.skipSpaces();
        val = Math.pow(val, this.parsePow());
      } else {
        const op = this.consume();
        this.skipSpaces();
        const right = this.parsePow();
        if (op === '*') val *= right;
        else if (op === '/') {
          if (right === 0) throw new Error('División por cero');
          val /= right;
        } else val %= right;
      }
      this.skipSpaces();
    }
    return val;
  }

  private parsePow(): number {
    const base = this.parseUnary();
    this.skipSpaces();
    if (this.peek() === '^') {
      this.consume();
      this.skipSpaces();
      return Math.pow(base, this.parsePow());
    }
    return base;
  }

  private parseUnary(): number {
    this.skipSpaces();
    if (this.peek() === '-') { this.consume(); this.skipSpaces(); return -this.parsePrimary(); }
    if (this.peek() === '+') { this.consume(); this.skipSpaces(); return this.parsePrimary(); }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    this.skipSpaces();
    if ((this.peek() >= '0' && this.peek() <= '9') || this.peek() === '.') {
      let num = '';
      while (this.pos < this.input.length && ((this.peek() >= '0' && this.peek() <= '9') || this.peek() === '.')) {
        num += this.consume();
      }
      const n = Number(num);
      if (isNaN(n)) throw new Error(`Número inválido: ${num}`);
      return n;
    }
    if (this.peek() === '(') {
      this.consume();
      this.skipSpaces();
      const val = this.parseExpr();
      this.skipSpaces();
      if (this.peek() !== ')') throw new Error('Parentesis no cerrado');
      this.consume();
      return val;
    }
    if (this.peek() >= 'a' && this.peek() <= 'z') {
      let name = '';
      while (this.pos < this.input.length && this.peek() >= 'a' && this.peek() <= 'z') {
        name += this.consume();
      }
      this.skipSpaces();
      if (name === 'pi') return Math.PI;
      if (name === 'e') return Math.E;
      if (this.peek() === '(') {
        this.consume();
        this.skipSpaces();
        const args: number[] = [];
        if (this.peek() !== ')') {
          args.push(this.parseExpr());
          this.skipSpaces();
          while (this.peek() === ',') {
            this.consume();
            this.skipSpaces();
            args.push(this.parseExpr());
            this.skipSpaces();
          }
        }
        if (this.peek() !== ')') throw new Error(`Parentesis no cerrado en ${name}(...)`);
        this.consume();
        return this.applyFn(name, args);
      }
      throw new Error(`Nombre desconocido: '${name}'`);
    }
    throw new Error(`Token inesperado: '${this.peek() || 'EOF'}' en posicion ${this.pos}`);
  }

  private applyFn(name: string, args: number[]): number {
    const a0 = args[0] ?? 0;
    switch (name) {
      case 'sqrt':   return Math.sqrt(a0);
      case 'cbrt':   return Math.cbrt(a0);
      case 'abs':    return Math.abs(a0);
      case 'floor':  return Math.floor(a0);
      case 'ceil':   return Math.ceil(a0);
      case 'round':  return Math.round(a0);
      case 'sign':   return Math.sign(a0);
      case 'trunc':  return Math.trunc(a0);
      case 'sin':    return Math.sin(a0);
      case 'cos':    return Math.cos(a0);
      case 'tan':    return Math.tan(a0);
      case 'asin':   return Math.asin(a0);
      case 'acos':   return Math.acos(a0);
      case 'atan':   return Math.atan(a0);
      case 'atan2':  return Math.atan2(a0, args[1] ?? 0);
      case 'log':    return args.length === 2 ? Math.log(args[1]) / Math.log(a0) : Math.log(a0);
      case 'ln':     return Math.log(a0);
      case 'log2':   return Math.log2(a0);
      case 'log10':  return Math.log10(a0);
      case 'exp':    return Math.exp(a0);
      case 'pow':    return Math.pow(a0, args[1] ?? 1);
      case 'min':    return Math.min(...args);
      case 'max':    return Math.max(...args);
      default:       throw new Error(`Función no soportada: '${name}'`);
    }
  }
}

export const calculadoraTool = tool(
  async ({ expresion }: { expresion: string }) => {
    logger.debug({ expression: expresion }, 'Evaluando expresión matemática');
    try {
      const evaluator = new SafeEvaluator();
      const result = evaluator.evaluate(expresion);
      if (!isFinite(result)) {
        logger.warn({ expression: expresion }, 'Resultado no finito');
        return JSON.stringify({ error: 'Resultado no es finito', expresion });
      }
      const formatted = Number.isInteger(result) ? result : Math.round(result * 1e10) / 1e10;
      logger.info({ expression: expresion, result: formatted }, 'Expresión evaluada');
      return JSON.stringify({ expresion, resultado: formatted });
    } catch (err: any) {
      logger.error({ err, expression: expresion }, 'Error al evaluar expresión');
      return JSON.stringify({ error: err?.message ?? 'Error al evaluar expresión', expresion });
    }
  },
  {
    name: 'calculadora',
    description:
      'Evalúa expresiones matemáticas: +, -, *, /, ^, %, ** (potencia), ' +
      'funciones: sqrt, cbrt, abs, floor, ceil, round, sin, cos, tan, asin, acos, atan, log, ln, log2, log10, exp, min, max, pow. ' +
      'Constantes: pi, e. Ejemplos: "sqrt(144) + 2^8", "sin(pi/2)", "log(100)/log(10)".',
    schema: z.object({
      expresion: z
        .string()
        .describe('Expresión matemática a evaluar, ej. "sqrt(144) + 2^8" o "sin(pi/2)"'),
    }),
  }
);
