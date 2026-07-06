import { useState, useCallback, useEffect } from 'react';
import type { Message } from '../types';
import { useAppSettings } from '../context/AppSettingsContext';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function createWelcomeMessage(content: string): Message {
  return {
    id: 'welcome',
    role: 'assistant',
    content,
    createdAt: new Date(),
  };
}

export function useChat() {
  const { welcomeMessage, t, botMode } = useAppSettings();
  const [messages, setMessages] = useState<Message[]>(() => [createWelcomeMessage(welcomeMessage)]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [createWelcomeMessage(welcomeMessage)];
      }
      return prev;
    });
  }, [welcomeMessage]);

  const sendMessage = useCallback(async (text: string, file?: File) => {
    if (!text.trim() && !file) return;

    const userMsg: Message = {
      id: uid(),
      role: 'user',
      content: text,
      fileName: file?.name,
      createdAt: new Date(),
    };

    const loadingMsg: Message = {
      id: uid() + '_loading',
      role: 'assistant',
      content: '',
      loading: true,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      const body = new FormData();
      body.append('message', text);
      body.append('botMode', botMode);
      if (file) body.append('file', file);

      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        credentials: 'include',
        body,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Error ${res.status}` }));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as { answer: string };

      setMessages((prev) =>
        prev.map((m) =>
          m.loading
            ? {
                ...m,
                content: data.answer,
                loading: false,
              }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.loading
            ? { ...m, content: t.genericError, loading: false, error: true }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [t.genericError, botMode]);

  const clearChat = useCallback(() => {
    setMessages([createWelcomeMessage(welcomeMessage)]);
  }, [welcomeMessage]);

  return { messages, loading, sendMessage, clearChat };
}
