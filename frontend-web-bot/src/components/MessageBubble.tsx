import React from 'react';
import type { Message } from '../types';
import { useAppSettings } from '../context/AppSettingsContext';

function TypingIndicator() {
  return (
    <div className="typing">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  );
}

const IMAGE_RE = /qrserver\.com|\.png(\?|$)|\.jpg(\?|$)|\.jpeg(\?|$)|\.gif(\?|$)|\.webp(\?|$)/i;
const MD_LINK_RE = /^\[([^\]]+)\]\(([^)]+)\)$/;
const HEADER_RE = /^(#{1,3})\s+(.+)$/;

function linkLabel(url: string): string {
  try {
    const u = new URL(url);
    if (u.pathname.endsWith('.pdf')) return 'Descargar CV (PDF)';
    if (u.hostname.includes('linkedin')) return 'LinkedIn';
    if (u.hostname.includes('github')) return 'GitHub';
    return u.hostname.replace('www.', '');
  } catch {
    return url.length > 48 ? url.slice(0, 48) + '…' : url;
  }
}

function renderLink(href: string, label: string, key: string) {
  return (
    <a key={key} href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

function renderInline(text: string, isUser: boolean): React.ReactNode[] {
  const mdLinkMatch = text.match(MD_LINK_RE);
  if (mdLinkMatch) {
    const [, label, href] = mdLinkMatch;
    return [renderLink(href, label, 'mdlink')];
  }

  const boldParts = text.split(/(\*\*[^*\n]+\*\*)/g);
  return boldParts.flatMap((seg, bi) => {
    if (seg.startsWith('**') && seg.endsWith('**')) {
      return [<strong key={`b${bi}`}>{seg.slice(2, -2)}</strong>];
    }
    const codeParts = seg.split(/(`[^`\n]+`)/g);
    return codeParts.flatMap((cp, ci) => {
      if (cp.startsWith('`') && cp.endsWith('`')) {
        return [
          <code key={`c${bi}-${ci}`} className={isUser ? 'inline-code user' : 'inline-code'}>
            {cp.slice(1, -1)}
          </code>,
        ];
      }
      const linkParts = cp.split(/(\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s"<>]+|mailto:[^\s"<>]+)/g);
      return linkParts.map((up, ui) => {
        const md = up.match(MD_LINK_RE);
        if (md) {
          return renderLink(md[2], md[1], `md${bi}-${ci}-${ui}`);
        }
        if (/^https?:\/\//.test(up)) {
          if (IMAGE_RE.test(up)) {
            return <ImageLink key={`u${bi}-${ci}-${ui}`} url={up} />;
          }
          return renderLink(up, linkLabel(up), `u${bi}-${ci}-${ui}`);
        }
        if (/^mailto:/.test(up)) {
          const email = up.replace('mailto:', '');
          return renderLink(up, email, `m${bi}-${ci}-${ui}`);
        }
        return <React.Fragment key={`t${bi}-${ci}-${ui}`}>{up}</React.Fragment>;
      });
    });
  });
}

function ImageLink({ url }: { url: string }) {
  const { t } = useAppSettings();
  return (
    <span className="img-wrapper">
      <img src={url} alt={t.generatedImage} className="bot-image" loading="lazy" />
      <a href={url} target="_blank" rel="noreferrer" className="img-link">
        {t.openInNewTab}
      </a>
    </span>
  );
}

function renderContent(content: string, isUser: boolean): React.ReactNode {
  const codeBlockParts = content.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {codeBlockParts.map((part, pi) => {
        if (part.startsWith('```')) {
          const inner = part.slice(3, -3);
          const nl = inner.indexOf('\n');
          const lang = nl > -1 ? inner.slice(0, nl).trim() : '';
          const code = nl > -1 ? inner.slice(nl + 1) : inner;
          return (
            <pre key={pi} className="code-block">
              {lang && <span className="code-lang">{lang}</span>}
              <code>{code.trimEnd()}</code>
            </pre>
          );
        }
        const lines = part.split('\n');
        return (
          <React.Fragment key={pi}>
            {lines.map((line, li) => {
              const header = line.match(HEADER_RE);
              if (header) {
                const level = header[1].length;
                const cls = level === 1 ? 'msg-h1' : level === 2 ? 'msg-h2' : 'msg-h3';
                return (
                  <React.Fragment key={li}>
                    <div className={cls}>{header[2]}</div>
                    {li < lines.length - 1 && <br />}
                  </React.Fragment>
                );
              }
              const bullet = line.match(/^[-•]\s+(.+)$/);
              if (bullet) {
                return (
                  <React.Fragment key={li}>
                    <div className="msg-bullet">
                      <span className="msg-bullet-dot">•</span>
                      <span>{renderInline(bullet[1], isUser)}</span>
                    </div>
                  </React.Fragment>
                );
              }
              return (
                <React.Fragment key={li}>
                  {renderInline(line, isUser)}
                  {li < lines.length - 1 && <br />}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
}

function formatTime(d: Date, locale: string): string {
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ message }: { message: Message }) {
  const { t, locale } = useAppSettings();
  const isUser = message.role === 'user';

  return (
    <div className={`message${isUser ? ' user' : ' bot'}`}>
      <div className="message-avatar" aria-hidden="true">
        {isUser ? (
          <span className="avatar-user">{t.you.slice(0, 1)}</span>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8V4H8" />
            <rect x="4" y="8" width="16" height="12" rx="2" />
            <path d="M9 13h.01" />
            <path d="M15 13h.01" />
          </svg>
        )}
      </div>
      <div className="message-content">
        {message.loading ? (
          <div className="bubble">
            <TypingIndicator />
          </div>
        ) : (
          <div className={`bubble${message.error ? ' error' : ''}`}>
            {renderContent(message.content, isUser)}
          </div>
        )}

        {message.fileName && (
          <span className="file-label">
            <span>📎</span>
            <span>{message.fileName}</span>
          </span>
        )}

        {!message.loading && (
          <span className="msg-time">{formatTime(message.createdAt, locale)}</span>
        )}
      </div>
    </div>
  );
}
