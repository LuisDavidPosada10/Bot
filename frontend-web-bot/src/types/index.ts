export type Role = 'user' | 'assistant';

export interface ToolResult {
  name: string;
  args: unknown;
  output: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  toolResults?: ToolResult[];
  fileName?: string;
  error?: boolean;
  loading?: boolean;
  createdAt: Date;
}
