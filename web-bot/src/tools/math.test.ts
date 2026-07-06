import { describe, expect, it } from 'vitest';
import { SafeEvaluator } from './math.js';
import { calculadoraTool } from './math.js';

describe('SafeEvaluator', () => {
  const evaluator = new SafeEvaluator();

  it('evaluates basic arithmetic', () => {
    expect(evaluator.evaluate('2 + 3 * 4')).toBe(14);
  });

  it('supports powers and sqrt', () => {
    expect(evaluator.evaluate('sqrt(144)')).toBe(12);
    expect(evaluator.evaluate('2^8')).toBe(256);
  });

  it('rejects division by zero', () => {
    expect(() => evaluator.evaluate('10 / 0')).toThrow('División por cero');
  });

  it('rejects invalid tokens', () => {
    expect(() => evaluator.evaluate('2 + unknown')).toThrow();
  });
});

describe('calculadoraTool', () => {
  it('returns JSON result through the tool interface', async () => {
    const output = await calculadoraTool.invoke({ expresion: '10 + 5' });
    const parsed = JSON.parse(output as string);
    expect(parsed.resultado).toBe(15);
  });
});
