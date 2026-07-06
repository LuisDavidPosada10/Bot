export function normalizeWhatsAppPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  return digits;
}

export function buildWhatsAppUrl(phone: string, text?: string): string {
  const digits = normalizeWhatsAppPhone(phone);
  if (!digits) return '';
  const base = `https://wa.me/${digits}`;
  if (!text?.trim()) return base;
  return `${base}?text=${encodeURIComponent(text.trim())}`;
}

export function portfolioWhatsAppWelcomeLine(locale: 'es' | 'en', phone: string): string {
  const text =
    locale === 'es'
      ? 'Hola Luis, vi tu portafolio y me gustaría conversar contigo.'
      : 'Hi Luis, I saw your portfolio and would like to chat with you.';
  const url = buildWhatsAppUrl(phone, text);
  if (!url) return '';
  return locale === 'es'
    ? `💬 **Hablemos por WhatsApp:** [Escríbeme aquí](${url})\n\n`
    : `💬 **Let's chat on WhatsApp:** [Message me here](${url})\n\n`;
}
