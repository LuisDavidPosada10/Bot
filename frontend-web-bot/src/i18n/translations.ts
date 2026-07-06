export type Locale = 'es' | 'en';
export type Theme = 'light' | 'dark';

export const translations = {
  es: {
    subtitlePortfolio: 'Asistente de contratación',
    subtitleStandalone: 'Asistente inteligente',
    statusOnline: 'En línea',
    statusThinking: 'Pensando…',
    newChat: 'Nueva',
    newChatTitle: 'Nueva conversación',
    inputHint: 'Enter para enviar · Shift+Enter nueva línea · Adjunta PDFs con el clip',
    placeholder: 'Escribe un mensaje…',
    attachPdf: 'Adjuntar PDF',
    removeFile: 'Quitar archivo',
    sendMessage: 'Enviar mensaje',
    you: 'Tú',
    openInNewTab: 'Abrir en nueva pestaña',
    generatedImage: 'Imagen generada',
    toolsUsed: (count: number) =>
      `${count} herramienta${count > 1 ? 's' : ''} usada${count > 1 ? 's' : ''}`,
    themeLight: 'Tema claro',
    themeDark: 'Tema oscuro',
    language: 'Idioma',
    connectionError: 'No se pudo conectar con el servidor',
    genericError: 'Hubo un inconveniente temporal. Por favor intenta de nuevo en un momento.',
    welcomePortfolio:
      '¡Hola! Soy el asistente de **Luis David Posada**, desarrollador Full Stack Junior Advanced.\n\n' +
      'Puedo ayudarte con lo que más importa si estás evaluando su perfil:\n\n' +
      '📄 **Descargar CV** y links oficiales (LinkedIn, GitHub)\n' +
      '💼 **Contarte sobre una vacante** — Luis revisará la oportunidad personalmente\n' +
      '📬 **Dejar tus datos de contacto** para que él continúe la conversación contigo\n' +
      '🛠️ **Resumen de experiencia y stack** (React, TypeScript, Node.js, NestJS)\n\n' +
      '{{whatsapp}}' +
      '¿Quieres el CV, tienes una vacante o prefieres dejar tu contacto?',
    welcomeStandalone:
      '¡Hola! Soy **Web Bot**, tu asistente con IA y más de 20 herramientas integradas.\n\n' +
      'Puedo ayudarte con cosas como:\n\n' +
      '🌤️ **Clima** en cualquier ciudad\n' +
      '💱 **Divisas y criptomonedas** en tiempo real\n' +
      '🌍 **Traducción** entre idiomas\n' +
      '📄 **Análisis de PDFs** (CVs, documentos)\n' +
      '🎯 **Trivia**, acertijos y datos curiosos\n' +
      '📊 **Finanzas**, calculadoras y utilidades varias\n\n' +
      '¿En qué te ayudo hoy?',
  },
  en: {
    subtitlePortfolio: "Luis's hiring assistant",
    subtitleStandalone: 'Intelligent assistant',
    statusOnline: 'Online',
    statusThinking: 'Thinking…',
    newChat: 'New',
    newChatTitle: 'New conversation',
    inputHint: 'Enter to send · Shift+Enter for new line · Attach PDFs with the clip',
    placeholder: 'Write a message…',
    attachPdf: 'Attach PDF',
    removeFile: 'Remove file',
    sendMessage: 'Send message',
    you: 'You',
    openInNewTab: 'Open in new tab',
    generatedImage: 'Generated image',
    toolsUsed: (count: number) =>
      `${count} tool${count > 1 ? 's' : ''} used`,
    themeLight: 'Light theme',
    themeDark: 'Dark theme',
    language: 'Language',
    connectionError: 'Could not connect to the server',
    genericError: 'There was a temporary issue. Please try again in a moment.',
    welcomePortfolio:
      "Hi! I'm **Luis David Posada's** assistant — Junior Advanced Full Stack developer.\n\n" +
      "Here's what matters most if you're reviewing his profile:\n\n" +
      '📄 **Download CV** and official links (LinkedIn, GitHub)\n' +
      '💼 **Share a job opening** — Luis will review the opportunity personally\n' +
      '📬 **Leave your contact details** so he can follow up with you\n' +
      '🛠️ **Experience & stack summary** (React, TypeScript, Node.js, NestJS)\n\n' +
      '{{whatsapp}}' +
      'Would you like the CV, have a role to discuss, or want to leave your contact?',
    welcomeStandalone:
      "Hi! I'm **Web Bot**, your AI assistant with 20+ built-in tools.\n\n" +
      'I can help you with things like:\n\n' +
      '🌤️ **Weather** for any city\n' +
      '💱 **Currencies and crypto** in real time\n' +
      '🌍 **Translation** between languages\n' +
      '📄 **PDF analysis** (CVs, documents)\n' +
      '🎯 **Trivia**, riddles and fun facts\n' +
      '📊 **Finance**, calculators and utilities\n\n' +
      'How can I help you today?',
  },
} as const;

export type TranslationKey = keyof typeof translations.es;
export type TranslationStrings = (typeof translations)[Locale];
