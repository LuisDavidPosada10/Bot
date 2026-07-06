import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';

export type StoredMessage = {
  type: 'human' | 'ai' | 'tool' | 'system';
  content: string;
  toolCallId?: string;
  toolCalls?: Array<{ id: string; name: string; args: Record<string, unknown> }>;
};

type RawToolCall = {
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
  type?: string;
  function?: { name?: string; arguments?: string };
};

/** Groq/OpenAI exigen function.arguments; tools sin params a veces vienen sin args. */
export function normalizeToolCall(call: RawToolCall): {
  id: string;
  name: string;
  args: Record<string, unknown>;
  type: 'tool_call';
} {
  const fn = call.function;
  let args = call.args;
  if (args === undefined || args === null) {
    const raw = fn?.arguments;
    if (typeof raw === 'string') {
      try {
        args = raw.trim() ? (JSON.parse(raw) as Record<string, unknown>) : {};
      } catch {
        args = {};
      }
    } else {
      args = {};
    }
  }
  return {
    id: String(call.id ?? ''),
    name: String(call.name ?? fn?.name ?? ''),
    args,
    type: 'tool_call',
  };
}

export function normalizeAiMessage(message: AIMessage): AIMessage {
  const rawCalls = (message as AIMessage & { tool_calls?: RawToolCall[] }).tool_calls;
  if (!rawCalls?.length) return message;
  const tool_calls = rawCalls.filter((c) => c.id).map(normalizeToolCall);
  if (!tool_calls.length) return message;
  return new AIMessage({ content: message.content, tool_calls });
}

export function normalizeMessagesForModel(messages: BaseMessage[]): BaseMessage[] {
  return messages.map((m) => (m instanceof AIMessage ? normalizeAiMessage(m) : m));
}

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

export function serializeMessages(messages: BaseMessage[]): StoredMessage[] {
  return messages.map((message) => {
    if (message instanceof HumanMessage) {
      return { type: 'human', content: toText(message.content) };
    }
    if (message instanceof AIMessage) {
      const rawCalls = (message as AIMessage & { tool_calls?: RawToolCall[] }).tool_calls;
      const toolCalls = rawCalls
        ?.filter((call) => Boolean(call.id))
        .map(normalizeToolCall);
      return {
        type: 'ai',
        content: toText(message.content),
        toolCalls: toolCalls?.length ? toolCalls : undefined,
      };
    }
    if (message instanceof ToolMessage) {
      return {
        type: 'tool',
        content: toText(message.content),
        toolCallId: message.tool_call_id,
      };
    }
    if (message instanceof SystemMessage) {
      return { type: 'system', content: toText(message.content) };
    }
    return { type: 'human', content: toText(message.content) };
  });
}

export function deserializeMessages(stored: StoredMessage[]): BaseMessage[] {
  return stored.map((item) => {
    switch (item.type) {
      case 'human':
        return new HumanMessage(item.content);
      case 'ai': {
        if (item.toolCalls?.length) {
          return normalizeAiMessage(
            new AIMessage({
              content: item.content,
              tool_calls: item.toolCalls.map((call) => ({
                id: call.id,
                name: call.name,
                args: call.args ?? {},
                type: 'tool_call' as const,
              })),
            })
          );
        }
        return new AIMessage(item.content);
      }
      case 'tool':
        return new ToolMessage({
          content: item.content,
          tool_call_id: item.toolCallId ?? '',
        });
      case 'system':
        return new SystemMessage(item.content);
      default:
        return new HumanMessage(item.content);
    }
  });
}
