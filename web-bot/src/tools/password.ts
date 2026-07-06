import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import crypto from 'crypto';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('passwordTool');

function generatePassword(opts: {
  length: number; uppercase: boolean; lowercase: boolean; numbers: boolean; symbols: boolean;
}): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const nums = '0123456789';
  const syms = '!@#$%^&*()-_=+[]{}|;:,.<>?';
  let charset = '';
  const required: string[] = [];
  if (opts.uppercase) { charset += upper; required.push(upper[crypto.randomInt(upper.length)]); }
  if (opts.lowercase) { charset += lower; required.push(lower[crypto.randomInt(lower.length)]); }
  if (opts.numbers) { charset += nums; required.push(nums[crypto.randomInt(nums.length)]); }
  if (opts.symbols) { charset += syms; required.push(syms[crypto.randomInt(syms.length)]); }
  if (!charset) { charset = lower + nums; }
  const remaining = Math.max(0, opts.length - required.length);
  const chars = [...required];
  for (let i = 0; i < remaining; i++) chars.push(charset[crypto.randomInt(charset.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export const generarContrasenaTool = tool(
  async ({ longitud, mayusculas, numeros, simbolos }) => {
    const len = Math.min(128, Math.max(8, longitud ?? 16));
    const upper = mayusculas ?? true;
    const nums = numeros ?? true;
    const syms = simbolos ?? false;
    logger.debug({ length: len, uppercase: upper, numbers: nums, symbols: syms }, 'Generando contraseña');
    const password = generatePassword({ length: len, uppercase: upper, lowercase: true, numbers: nums, symbols: syms });
    const charsetSize = 26 + (upper ? 26 : 0) + (nums ? 10 : 0) + (syms ? 29 : 0);
    const entropy = Math.round(len * Math.log2(charsetSize) * 10) / 10;
    const fortaleza = entropy < 40 ? 'debil' : entropy < 60 ? 'moderada' : entropy < 80 ? 'fuerte' : 'muy fuerte';
    logger.info({ length: len, strength: fortaleza, entropy }, 'Contraseña generada');
    return JSON.stringify({ password, longitud: len, entropia: entropy + ' bits', fortaleza });
  },
  {
    name: 'generar_contrasena',
    description: 'Genera contrasenas seguras criptograficamente con opciones de longitud, mayusculas, numeros y simbolos.',
    schema: z.object({
      longitud: z.number().int().min(8).max(128).optional().describe('Longitud (8-128, defecto 16)'),
      mayusculas: z.boolean().optional().describe('Incluir mayusculas (defecto true)'),
      numeros: z.boolean().optional().describe('Incluir numeros (defecto true)'),
      simbolos: z.boolean().optional().describe('Incluir simbolos como !@#$% (defecto false)'),
    }),
  }
);