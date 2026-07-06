import { afterEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
vi.mock('../config/env.js', () => ({
  FORMSPREE_ENDPOINT: 'https://formspree.io/f/test',
}));

describe('sendViaFormspree', () => {
  afterEach(() => vi.mocked(axios.post).mockReset());

  it('envía payload a Formspree', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ status: 200, data: { ok: true } });
    const { sendViaFormspree } = await import('./formspree.js');
    const result = await sendViaFormspree({
      name: 'Ana Recruiter',
      email: 'ana@acme.com',
      message: 'Hola Luis',
      company: 'Acme',
      role: 'Frontend Dev',
    });
    expect(result).toEqual({ ok: true });
    expect(axios.post).toHaveBeenCalledWith(
      'https://formspree.io/f/test',
      expect.objectContaining({ name: 'Ana Recruiter', source: 'web-bot' }),
      expect.any(Object)
    );
  });
});
