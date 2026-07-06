import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAppSettings } from '../context/AppSettingsContext';

interface Props {
  onSend: (text: string, file?: File) => void;
  disabled?: boolean;
}

export function InputBar({ onSend, disabled }: Props) {
  const { t } = useAppSettings();
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && !file) return;
    onSend(trimmed, file ?? undefined);
    setText('');
    setFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const canSend = (text.trim().length > 0 || file !== null) && !disabled;

  return (
    <form className="input-bar" onSubmit={handleSubmit}>
      {file && (
        <div className="file-preview">
          <span className="file-preview-icon">📄</span>
          <span className="file-preview-name">{file.name}</span>
          <button
            type="button"
            className="file-remove"
            onClick={() => {
              setFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            title={t.removeFile}
          >
            ✕
          </button>
        </div>
      )}

      <div className="input-row">
        <textarea
          ref={textareaRef}
          className="input-textarea"
          placeholder={t.placeholder}
          value={text}
          disabled={disabled}
          rows={1}
          onChange={(e) => {
            setText(e.target.value);
            autoResize();
          }}
          onKeyDown={handleKeyDown}
        />

        <div className="input-actions">
          <button
            type="button"
            className={`icon-btn${file ? ' active' : ''}`}
            title={t.attachPdf}
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          <button
            type="submit"
            className="send-btn"
            disabled={!canSend}
            title={t.sendMessage}
          >
            {disabled ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFile(f);
        }}
      />
    </form>
  );
}
