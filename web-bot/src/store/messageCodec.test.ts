import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { describe, expect, it } from 'vitest';
import { deserializeMessages, serializeMessages } from './messageCodec.js';

describe('messageCodec', () => {
  it('serializes and deserializes human and ai messages', () => {
    const original = [new HumanMessage('Hola'), new AIMessage('Respuesta')];
    const roundTrip = deserializeMessages(serializeMessages(original));

    expect(roundTrip).toHaveLength(2);
    expect(roundTrip[0]).toBeInstanceOf(HumanMessage);
    expect(roundTrip[1]).toBeInstanceOf(AIMessage);
    expect(roundTrip[0].content).toBe('Hola');
    expect(roundTrip[1].content).toBe('Respuesta');
  });

  it('preserves tool messages and ai tool calls', () => {
    const original = [
      new AIMessage({
        content: '',
        tool_calls: [{ id: 'call_1', name: 'hora_actual', args: {}, type: 'tool_call' }],
      }),
      new ToolMessage({ content: '2026-07-04', tool_call_id: 'call_1' }),
    ];

    const roundTrip = deserializeMessages(serializeMessages(original));
    expect(roundTrip[1]).toBeInstanceOf(ToolMessage);
    expect((roundTrip[1] as ToolMessage).tool_call_id).toBe('call_1');
    expect(roundTrip[0]).toBeInstanceOf(AIMessage);
  });

  it('normaliza tool_calls sin args (formato Groq/OpenAI function)', () => {
    const broken = [
      new AIMessage({
        content: '',
        tool_calls: [
          {
            id: 'call_2',
            name: 'perfil_luis',
            type: 'tool_call',
          } as any,
        ],
      }),
    ];
    const roundTrip = deserializeMessages(serializeMessages(broken));
    const ai = roundTrip[0] as AIMessage;
    expect(ai.tool_calls?.[0]?.args).toEqual({});
  });

  it('handles system messages', () => {
    const roundTrip = deserializeMessages(serializeMessages([new SystemMessage('system prompt')]));
    expect(roundTrip[0]).toBeInstanceOf(SystemMessage);
    expect(roundTrip[0].content).toBe('system prompt');
  });
});
