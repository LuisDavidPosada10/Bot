import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { describe, expect, it } from 'vitest';
import {
  estimateMessageTokens,
  prepareHistoryForModel,
  slimMessagesForStorage,
} from './historyWindow.js';

describe('historyWindow', () => {
  it('slim elimina system, tools y AI intermedio con tool_calls', () => {
    const raw = [
      new HumanMessage('dame el cv'),
      new AIMessage({ content: '', tool_calls: [{ id: 'c1', name: 'perfil_luis', args: {}, type: 'tool_call' }] }),
      new ToolMessage({ content: '{"cvPdf":"http://x/cv.pdf","mensajeSugerido":"..."}', tool_call_id: 'c1' }),
      new AIMessage('Aquí tienes el CV de Luis.'),
    ];

    const slim = slimMessagesForStorage(raw);
    expect(slim).toHaveLength(2);
    expect(slim[0]).toBeInstanceOf(HumanMessage);
    expect(slim[1]).toBeInstanceOf(AIMessage);
    expect(slim[1].content).toBe('Aquí tienes el CV de Luis.');
  });

  it('prepareHistoryForModel limita por turnos', () => {
    const messages = [
      new HumanMessage('t1'),
      new AIMessage('r1'),
      new HumanMessage('t2'),
      new AIMessage('r2'),
      new HumanMessage('t3'),
      new AIMessage('r3'),
    ];

    const windowed = prepareHistoryForModel(messages, { maxTurns: 2, maxTokens: 10_000 });
    expect(windowed).toHaveLength(4);
    expect((windowed[0] as HumanMessage).content).toBe('t2');
    expect((windowed[2] as HumanMessage).content).toBe('t3');
  });

  it('prepareHistoryForModel recorta por tokens estimados', () => {
    const big = 'x'.repeat(4000);
    const messages = [
      new HumanMessage('viejo'),
      new AIMessage('respuesta vieja'),
      new HumanMessage(big),
      new AIMessage('respuesta nueva'),
    ];

    const windowed = prepareHistoryForModel(messages, { maxTurns: 10, maxTokens: 500 });
    expect(windowed.length).toBeLessThanOrEqual(2);
    expect(windowed.some((m) => (m as HumanMessage).content === big || windowed.length === 1)).toBe(true);
  });

  it('slim reduce mucho los tokens vs historial crudo con tools', () => {
    const raw = [
      new HumanMessage('clima en bogota'),
      new AIMessage({ content: '', tool_calls: [{ id: 'c1', name: 'clima_actual', args: { ciudad: 'Bogota' }, type: 'tool_call' }] }),
      new ToolMessage({ content: JSON.stringify({ temp: 18, ciudad: 'Bogota', forecast: Array(10).fill('dia') }), tool_call_id: 'c1' }),
      new AIMessage('En Bogotá hay 18°C.'),
    ];
    const slim = slimMessagesForStorage(raw);
    expect(estimateMessageTokens(slim)).toBeLessThan(estimateMessageTokens(raw) / 3);
  });
});
