import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { PORTFOLIO_URL, WHATSAPP_NUMBER } from '../config/env.js';
import {
  CANDIDATE_NAME,
  CANDIDATE_EMAIL,
  CANDIDATE_LINKEDIN,
  CANDIDATE_GITHUB,
  CANDIDATE_LEVEL,
  CANDIDATE_EXPERIENCE_YEARS,
} from '../data/candidateProfile.js';
import { buildWhatsAppUrl, defaultPortfolioWhatsAppText } from '../utils/whatsappLink.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('candidateLinksTool');

function portfolioBase(): string {
  return (PORTFOLIO_URL ?? 'http://localhost:5173').replace(/\/$/, '');
}

export const perfilLuisTool = tool(
  async () => {
    const base = portfolioBase();
    const cvPdf = `${base}/cv/Luis-David-Posada-CV.pdf`;
    const whatsappLink = WHATSAPP_NUMBER
      ? buildWhatsAppUrl(WHATSAPP_NUMBER, defaultPortfolioWhatsAppText('es'))
      : null;
    logger.debug({ cvPdf }, 'Links de perfil solicitados');
    const whatsappLine = whatsappLink
      ? `💬 **WhatsApp:** [Escríbeme aquí](${whatsappLink})\n`
      : '';
    return JSON.stringify({
      nombre: CANDIDATE_NAME,
      nivel: CANDIDATE_LEVEL,
      experiencia: CANDIDATE_EXPERIENCE_YEARS,
      email: CANDIDATE_EMAIL,
      cvPdf,
      paginaCv: `${base}/cv`,
      portafolio: base,
      linkedin: CANDIDATE_LINKEDIN,
      github: CANDIDATE_GITHUB,
      mensajeSugerido:
        `**${CANDIDATE_NAME}** · ${CANDIDATE_LEVEL} · ${CANDIDATE_EXPERIENCE_YEARS}\n\n` +
        `📄 **Descargar CV:** [CV en PDF](${cvPdf})\n` +
        whatsappLine +
        `🌐 **Portafolio:** [Ver portafolio](${base})\n` +
        `💼 **LinkedIn:** [Perfil de LinkedIn](${CANDIDATE_LINKEDIN})\n` +
        `💻 **GitHub:** [Perfil de GitHub](${CANDIDATE_GITHUB})\n` +
        `✉️ **Email:** [${CANDIDATE_EMAIL}](mailto:${CANDIDATE_EMAIL})`,
      instruccion:
        'Usa mensajeSugerido como base de tu respuesta. No inventes links. Puedes ajustar el tono pero mantén todos los enlaces.',
    });
  },
  {
    name: 'perfil_luis',
    description:
      'Devuelve el CV en PDF, LinkedIn, GitHub, email y portafolio oficial de Luis David Posada. ' +
      'Usar cuando pidan CV, curriculum, hoja de vida, perfil profesional, links o como contactar a Luis.',
    schema: z.object({}),
  }
);
