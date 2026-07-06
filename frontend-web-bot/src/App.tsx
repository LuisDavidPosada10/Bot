import { useRef, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import { useAppSettings } from './context/AppSettingsContext';
import { MessageBubble } from './components/MessageBubble';
import { InputBar } from './components/InputBar';
import { SettingsBar } from './components/SettingsBar';

const BOT_NAME = (import.meta.env.VITE_BOT_NAME as string | undefined) ?? 'Web Bot';

export default function App() {
  const { t, subtitle } = useAppSettings();
  const { messages, loading, sendMessage, clearChat } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="layout">
      <div className="layout-bg" aria-hidden="true">
        <div className="layout-glow layout-glow-a" />
        <div className="layout-glow layout-glow-b" />
      </div>

      <header className="header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="header-logo" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4H8" />
                <rect x="4" y="8" width="16" height="12" rx="2" />
                <path d="M9 13h.01" />
                <path d="M15 13h.01" />
                <path d="M9 17h6" />
              </svg>
            </div>
            <div>
              <h1 className="header-title">{BOT_NAME}</h1>
              <p className="header-subtitle">{subtitle}</p>
            </div>
          </div>

          <div className="header-right">
            <div className="header-status">
              <span className={`status-dot${loading ? ' loading' : ''}`} />
              <span className="status-text">{loading ? t.statusThinking : t.statusOnline}</span>
            </div>

            <SettingsBar />

            <button
              className="clear-btn"
              onClick={clearChat}
              title={t.newChatTitle}
              disabled={loading}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
              </svg>
              <span>{t.newChat}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="messages-area">
        <div className="messages-container">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="input-area">
        <div className="input-container">
          <InputBar onSend={sendMessage} disabled={loading} />
          <p className="input-hint">{t.inputHint}</p>
        </div>
      </footer>
    </div>
  );
}
