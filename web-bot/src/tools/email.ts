import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { getLogger } from '../utils/logger.js';
import {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
  CONTACT_TO,
} from '../config/env.js';
import { getMongoStatus, isMongoEnabled } from '../db/connection.js';
import { LeadModel } from '../db/models/lead.model.js';
import { CANDIDATE_NAME } from '../data/candidateProfile.js';
import { sendViaFormspree } from '../services/formspree.js';

const logger = getLogger('emailTool');

async function sendViaSmtp(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return {
      error: 'CONFIG_MISSING',
      message: 'Faltan variables SMTP en entorno',
    };
  }
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  const from = params.from ?? EMAIL_FROM ?? SMTP_USER;
  try {
    const info = await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return { ok: true as const, id: info.messageId ?? null, channel: 'smtp' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: 'DELIVERY_FAILED', message, channel: 'smtp' };
  }
}

function buildLeadMessage(params: {
  recruiterName: string;
  recruiterEmail: string;
  company: string;
  role: string;
  message: string;
  matchScore?: number;
  jobSkills?: string[];
  gaps?: string[];
}): string {
  const lines = [
    `Nuevo contacto desde Web Bot — ${CANDIDATE_NAME}`,
    '',
    `Reclutador: ${params.recruiterName}`,
    `Email: ${params.recruiterEmail}`,
    `Empresa: ${params.company}`,
    `Rol: ${params.role}`,
  ];
  if (params.matchScore != null) lines.push(`Match score: ${params.matchScore}%`);
  if (params.jobSkills?.length) lines.push(`Skills requeridos: ${params.jobSkills.join(', ')}`);
  if (params.gaps?.length) lines.push(`Gaps: ${params.gaps.join(', ')}`);
  lines.push('', 'Mensaje:', params.message);
  return lines.join('\n');
}

export const enviarContactoTool = tool(
  async ({
    recruiterName,
    recruiterEmail,
    company,
    role,
    message,
    matchScore,
    jobSkills,
    gaps,
    sessionId,
  }: {
    recruiterName?: string;
    recruiterEmail?: string;
    company?: string;
    role?: string;
    message?: string;
    matchScore?: number;
    jobSkills?: string[];
    gaps?: string[];
    sessionId?: string;
  }) => {
    const missing: string[] = [];
    if (!recruiterEmail) missing.push('recruiterEmail');
    if (!message) missing.push('message');
    if (!company) missing.push('company');
    if (!role) missing.push('role');
    if (!recruiterName) missing.push('recruiterName');
    if (missing.length) {
      logger.warn({ missing }, 'Campos faltantes en contacto de reclutador');
      return JSON.stringify({
        error: 'MISSING_FIELDS',
        missing,
        message:
          'Faltan datos. Pregunta al reclutador: nombre, email, empresa, rol y mensaje antes de enviar.',
      });
    }

    const bodyText = buildLeadMessage({
      recruiterName: recruiterName!,
      recruiterEmail: recruiterEmail!,
      company: company!,
      role: role!,
      message: message!,
      matchScore,
      jobSkills,
      gaps,
    });

    let leadId: string | null = null;
    if (isMongoEnabled() && getMongoStatus() === 'connected') {
      try {
        const lead = await LeadModel.create({
          sessionId: sessionId ?? 'anonymous',
          recruiterName,
          recruiterEmail,
          company,
          role,
          message,
          matchScore,
          jobSkills: jobSkills ?? [],
          gaps: gaps ?? [],
        });
        leadId = String(lead._id);
        logger.info({ leadId, company, role }, 'Lead guardado en MongoDB');
      } catch (err) {
        logger.error({ err }, 'Error al guardar lead en MongoDB');
      }
    }

    const subject = `🤖 Web Bot — ${company} · ${role} (${recruiterName})`;
    const formspreeResult = await sendViaFormspree({
      name: recruiterName!,
      email: recruiterEmail!,
      message: bodyText,
      _subject: subject,
      _replyto: recruiterEmail!,
      company: company!,
      role: role!,
      matchScore: matchScore != null ? String(matchScore) : undefined,
      source: 'web-bot-recruiter',
    });

    let delivery: { ok: true; id?: string | null; channel?: string } | { error: string; message: string; channel?: string } =
      formspreeResult;
    let channel = 'formspree';
    let formspreeError: string | undefined;

    if ('error' in formspreeResult) {
      formspreeError = formspreeResult.message;
      const canTrySmtp =
        formspreeResult.error === 'DELIVERY_FAILED' &&
        SMTP_HOST &&
        SMTP_PORT &&
        SMTP_USER &&
        SMTP_PASS;

      if (canTrySmtp && CONTACT_TO) {
        logger.warn({ formspreeError }, 'Formspree falló, intentando SMTP fallback');
        const html =
          `<p>${bodyText.replace(/\n/g, '<br/>')}</p>` +
          `<hr/><p>Enviado por Web Bot (fallback SMTP)</p>`;
        const smtpResult = await sendViaSmtp({ to: CONTACT_TO, subject, html });
        delivery = smtpResult;
        channel = 'smtp';
      }
    }

    if (leadId && isMongoEnabled()) {
      await LeadModel.findByIdAndUpdate(leadId, {
        emailSent: !('error' in delivery),
        emailError:
          'error' in delivery
            ? [formspreeError, delivery.message].filter(Boolean).join(' | ')
            : undefined,
      }).catch(() => {});
    }

    if ('error' in delivery) {
      const isFormspreeConfig = formspreeError?.includes('FORMSPREE_ENDPOINT');
      if (leadId) {
        return JSON.stringify({
          ok: true,
          leadId,
          partial: true,
          message: 'Mensaje registrado correctamente.',
        });
      }
      return JSON.stringify({
        error: delivery.error,
        message: isFormspreeConfig
          ? 'Servicio de contacto no disponible temporalmente.'
          : 'No se pudo completar el envío.',
        leadId,
        saved: false,
      });
    }

    return JSON.stringify({
      ok: true,
      leadId,
      channel,
      message: `Contacto registrado. ${CANDIDATE_NAME} recibirá tu mensaje pronto.`,
    });
  },
  {
    name: 'enviar_contacto',
    description:
      'Registra un lead de reclutador en la base de datos y envía el contacto a Luis David Posada vía Formspree. ' +
      'Usar cuando un reclutador quiera contactar a Luis David Posada. ' +
      'Usar SIEMPRE tras analizar una vacante de desarrollador, haya o no coincidencia de skills. ' +
      'Requiere: recruiterName, recruiterEmail, company, role, message.',
    schema: z.object({
      recruiterName: z.string().optional().describe('Nombre del reclutador'),
      recruiterEmail: z.string().optional().describe('Correo del reclutador'),
      company: z.string().optional().describe('Empresa'),
      role: z.string().optional().describe('Rol o vacante'),
      message: z.string().optional().describe('Mensaje del reclutador'),
      matchScore: z.number().optional().describe('Score de match JD vs CV (0-100) si se analizó oferta'),
      jobSkills: z.array(z.string()).optional().describe('Skills requeridos detectados en la oferta'),
      gaps: z.array(z.string()).optional().describe('Brechas de skills detectadas'),
      sessionId: z.string().optional().describe('ID de sesión (uso interno)'),
    }),
  }
);
