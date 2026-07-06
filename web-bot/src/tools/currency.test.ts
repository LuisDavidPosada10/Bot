import { afterEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { conversorDivisasTool } from './currency.js';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('conversor_divisas', () => {
  afterEach(() => {
    vi.mocked(axios.get).mockReset();
  });

  it('returns same amount when currencies match', async () => {
    const output = await conversorDivisasTool.invoke({ monto: 100, de: 'USD', a: 'USD' });
    const parsed = JSON.parse(output as string);
    expect(parsed.resultado).toBe(100);
    expect(parsed.tasa).toBe(1);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('converts using Frankfurter API response', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: { rates: { EUR: 0.92 } },
    });

    const output = await conversorDivisasTool.invoke({ monto: 10, de: 'USD', a: 'EUR' });
    const parsed = JSON.parse(output as string);
    expect(parsed.resultado).toBe(9.2);
    expect(parsed.tasa).toBe(0.92);
  });

  it('falls back to open.er-api when Frankfurter fails', async () => {
    vi.mocked(axios.get)
      .mockRejectedValueOnce(new Error('404'))
      .mockResolvedValueOnce({
        data: { result: 'success', rates: { COP: 4100 } },
      });

    const output = await conversorDivisasTool.invoke({ monto: 10, de: 'USD', a: 'COP' });
    const parsed = JSON.parse(output as string);
    expect(parsed.resultado).toBe(41000);
    expect(parsed.fuente).toContain('open.er-api');
  });
});
