/** Normaliza teléfono a dígitos E.164 sin + (ej. 573001234567). */
export function normalizeWhatsAppPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  return digits;
}

export function buildWhatsAppUrl(phone: string, text?: string): string {
  const digits = normalizeWhatsAppPhone(phone);
  if (!digits) throw new Error('Número de WhatsApp inválido');
  const base = `https://wa.me/${digits}`;
  if (!text?.trim()) return base;
  return `${base}?text=${encodeURIComponent(text.trim())}`;
}

export function defaultPortfolioWhatsAppText(locale: 'es' | 'en' = 'es'): string {
  return locale === 'es'
    ? 'Hola Luis, vi tu portafolio y me gustaría conversar contigo.'
    : 'Hi Luis, I saw your portfolio and would like to chat with you.';
}

export function buildRecruiterWhatsAppText(params: {
  nombre?: string;
  empresa?: string;
  vacante?: string;
  mensaje?: string;
}): string {
  const parts: string[] = ['Hola Luis, te escribo desde tu portafolio.'];
  if (params.nombre?.trim()) parts.push(`Soy ${params.nombre.trim()}.`);
  if (params.empresa?.trim()) parts.push(`Empresa: ${params.empresa.trim()}.`);
  if (params.vacante?.trim()) parts.push(`Vacante/rol: ${params.vacante.trim()}.`);
  if (params.mensaje?.trim()) parts.push(params.mensaje.trim());
  return parts.join(' ');
}
