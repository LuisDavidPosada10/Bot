/** Recorta texto enviado al LLM para ahorrar tokens. */
export function clipForModel(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}…`;
}

export const MODEL_LIMITS = {
  toolMessageChars: 700,
  userHistoryChars: 400,
  assistantHistoryChars: 500,
} as const;
