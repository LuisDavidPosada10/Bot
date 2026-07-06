import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { WHATSAPP_NUMBER } from '../config/env.js';
import { CANDIDATE_NAME } from '../data/candidateProfile.js';
import {
  buildRecruiterWhatsAppText,
  buildWhatsAppUrl,
  defaultPortfolioWhatsAppText,
} from '../utils/whatsappLink.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('whatsappTool');

export const contactarWhatsappTool = tool(
  async ({ nombre, empresa, vacante, mensaje }) => {
    if (!WHATSAPP_NUMBER) {
      return JSON.stringify({
        error: 'WHATSAPP_NOT_CONFIGURED',
        hint: 'WhatsApp no está disponible. Ofrece email posadaluis451@gmail.com o enviar_contacto.',
      });
    }

    const hasDetails = !!(nombre?.trim() || empresa?.trim() || vacante?.trim() || mensaje?.trim());
    const prefilled = hasDetails
      ? buildRecruiterWhatsAppText({ nombre, empresa, vacante, mensaje })
      : defaultPortfolioWhatsAppText('es');

    const link = buildWhatsAppUrl(WHATSAPP_NUMBER, prefilled);
    logger.debug({ hasDetails }, 'Link de WhatsApp generado');

    return JSON.stringify({
      ok: true,
      link,
      destinatario: CANDIDATE_NAME,
      mensajePrellenado: prefilled,
      mensajeSugerido:
        `💬 **Hablemos por WhatsApp:** [Abrir chat con ${CANDIDATE_NAME}](${link})\n\n` +
        'Al abrir el enlace se cargará un mensaje listo; puedes editarlo antes de enviar.',
      instruccion:
        'Muestra mensajeSugerido con el enlace en markdown. No inventes otro número ni link.',
    });
  },
  {
    name: 'contactar_whatsapp',
    description:
      'Genera un enlace wa.me para escribirle a Luis David Posada por WhatsApp con mensaje prellenado. ' +
      'Usar cuando pidan WhatsApp, contacto directo, chat rápido o prefieran escribir por mensajería. ' +
      'Opcional: nombre, empresa, vacante o mensaje para personalizar el texto.',
    schema: z.object({
      nombre: z.string().optional().describe('Nombre del reclutador o visitante'),
      empresa: z.string().optional().describe('Empresa del visitante'),
      vacante: z.string().optional().describe('Rol o vacante de interés'),
      mensaje: z.string().optional().describe('Mensaje adicional'),
    }),
  }
);
