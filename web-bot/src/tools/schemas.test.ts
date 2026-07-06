import { describe, expect, it } from 'vitest';
import { emptyToolSchema } from './schemas.js';

describe('emptyToolSchema', () => {
  it('acepta argumentos extra que el modelo pueda inventar', () => {
    const parsed = emptyToolSchema.parse({
      linkedin: 'https://linkedin.com/in/test',
      github: 'https://github.com/test',
    });
    expect(parsed.linkedin).toBe('https://linkedin.com/in/test');
  });
});
