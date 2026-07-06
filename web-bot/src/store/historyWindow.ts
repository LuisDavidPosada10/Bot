import { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';

export type HistoryWindowOptions = {
  maxTurns: number;
  maxTokens: number;
};

function toText(content: BaseMessage['content']): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (typeof part === 'object' && part !== null && 'text' in part) {
          return String((part as { text?: string }).text ?? '');
        }
        return '';
      })
      .join('\n')
      .trim();
  }
  return String(content ?? '');
}

function isPdfContextMessage(message: HumanMessage): boolean {
  return toText(message.content).startsWith('Contexto adicional del usuario (adjuntos/metadata):');
}

function isIntermediateToolAi(message: AIMessage, rest: BaseMessage[]): boolean {
  const text = toText(message.content).trim();
  const hasToolCalls = Boolean(message.tool_calls?.length);
  if (!hasToolCalls) return false;
  if (text) return false;
  return rest.some((later) => later instanceof AIMessage && toText(later.content).trim().length > 0);
}

/** Persistencia: solo turnos visibles (user + respuesta final), sin tools ni system. */
export function slimMessagesForStorage(messages: BaseMessage[]): BaseMessage[] {
  const filtered = messages.filter((m) => {
    if (m instanceof SystemMessage) return false;
    if (m instanceof ToolMessage) return false;
    if (m instanceof HumanMessage && isPdfContextMessage(m)) return false;
    return true;
  });

  const result: BaseMessage[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const message = filtered[i];
    if (message instanceof AIMessage && isIntermediateToolAi(message, filtered.slice(i + 1))) {
      continue;
    }
    result.push(message);
  }
  return result;
}

export function estimateMessageTokens(messages: BaseMessage[]): number {
  return messages.reduce((sum, message) => {
    let chars = toText(message.content).length;
    if (message instanceof AIMessage && message.tool_calls?.length) {
      chars += JSON.stringify(message.tool_calls).length;
    }
    return sum + Math.ceil(chars / 4);
  }, 0);
}

function humanIndices(messages: BaseMessage[]): number[] {
  return messages
    .map((m, i) => (m instanceof HumanMessage ? i : -1))
    .filter((i) => i >= 0);
}

/** Contexto al modelo: últimos N turnos y tope estimado de tokens. */
export function prepareHistoryForModel(
  messages: BaseMessage[],
  options: HistoryWindowOptions
): BaseMessage[] {
  const { maxTurns, maxTokens } = options;
  if (!messages.length) return [];

  const humans = humanIndices(messages);
  if (!humans.length) return messages.slice(-maxTurns * 2);

  const startHuman = humans[Math.max(0, humans.length - maxTurns)];
  let windowed = messages.slice(startHuman);

  while (windowed.length > 1 && estimateMessageTokens(windowed) > maxTokens) {
    const idx = humanIndices(windowed)[0];
    if (idx === undefined) break;
    const nextHuman = humanIndices(windowed).find((i) => i > idx);
    windowed = nextHuman === undefined ? windowed.slice(idx + 1) : windowed.slice(nextHuman);
  }

  return windowed;
}
