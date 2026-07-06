import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('cvTool');

function textIncludes(txt: string, kw: string): boolean {
  return txt.toLowerCase().includes(kw.toLowerCase());
}

function extractKeywords(txt: string, kws: string[]): string[] {
  const out: string[] = [];
  for (const k of kws) {
    if (textIncludes(txt, k)) out.push(k);
  }
  return out;
}

function quantifyScore(txt: string): number {
  let score = 50;
  const bullets = (txt.match(/^\s*[-•*]/gm) || []).length;
  const quantified = (txt.match(/\b(\d+%|\d{2,}|\$\d{2,}|\d+\+)\b/g) || []).length;
  const sections = ['Experiencia', 'Education', 'Educación', 'Skills', 'Habilidades', 'Projects', 'Proyectos', 'Certificaciones', 'Summary', 'Resumen'];
  const hasSections = sections.filter((s) => textIncludes(txt, s)).length;
  score += Math.min(20, bullets);
  score += Math.min(20, quantified * 2);
  score += Math.min(10, hasSections);
  if (score > 95) score = 95;
  if (score < 30) score = 30;
  return score;
}

export const evaluarCvTool = tool(
  async ({ cvText, targetRole }: { cvText: string; targetRole?: string }) => {
    logger.debug({ cvLength: cvText.length, targetRole }, 'Evaluando CV');
    const baseKeywords = [
      'JavaScript',
      'TypeScript',
      'Node.js',
      'Express',
      'React',
      'Next.js',
      'MongoDB',
      'PostgreSQL',
      'REST',
      'GraphQL',
      'Docker',
      'CI/CD',
      'AWS',
      'GCP',
      'Azure',
    ];
    const roleExtras: Record<string, string[]> = {
      backend: ['NestJS', 'Prisma', 'Redis', 'Microservicios', 'Kubernetes'],
      frontend: ['Redux', 'Tailwind', 'Vite', 'Webpack', 'Testing Library'],
      fullstack: ['SSR', 'Auth', 'OAuth', 'Stripe', 'WebSockets'],
      data: ['Python', 'Pandas', 'SQL', 'Airflow', 'ETL'],
    };
    const roleKey = targetRole ? targetRole.toLowerCase() : '';
    const extra = roleExtras[roleKey] || [];
    const kws = [...baseKeywords, ...extra];
    const present = extractKeywords(cvText, kws);
    const missing = kws.filter((k) => !present.includes(k));
    const score = quantifyScore(cvText);
    const strengths: string[] = [];
    const gaps: string[] = [];
    const suggestions: string[] = [];
    const quickWins: string[] = [];
    if ((cvText.match(/\b(lider|lead|lideré|mentoric|mentoring)\b/i) || []).length) {
      strengths.push('Liderazgo y mentoring presentes');
    }
    if ((cvText.match(/\b(automat|optimiz|mejor|reduc|aument)\b/i) || []).length) {
      strengths.push('Enfoque en optimización y mejoras');
    }
    if (present.includes('Docker')) strengths.push('Conocimiento de contenedores');
    if (present.includes('AWS')) strengths.push('Experiencia en nube');
    if ((cvText.match(/\b(test|prueba|unitaria|jest|vitest)\b/i) || []).length) {
      strengths.push('Pruebas y calidad de código');
    }
    if (!textIncludes(cvText, 'Resumen') && !textIncludes(cvText, 'Summary')) {
      gaps.push('Falta un resumen ejecutivo al inicio');
      suggestions.push('Añade un resumen de 3–4 líneas con tu propuesta de valor y stack principal');
      quickWins.push('Escribe un resumen ejecutivo breve y claro');
    }
    if (!textIncludes(cvText, 'Proyectos') && !textIncludes(cvText, 'Projects')) {
      gaps.push('No se listan proyectos destacados');
      suggestions.push('Incluye 2–3 proyectos con impacto, tecnología usada y resultados cuantificados');
      quickWins.push('Agrega sección de proyectos con enlaces y métricas');
    }
    if ((cvText.match(/\b(\d+%|\d{2,}|\$\d{2,}|\d+\+)\b/g) || []).length < 3) {
      gaps.push('Pocas métricas cuantificables');
      suggestions.push('Añade cifras de impacto (tiempo ahorrado, % de mejora, usuarios, ingresos)');
      quickWins.push('Convierte logros en métricas concretas');
    }
    if (missing.length > 0) {
      suggestions.push('Integra palabras clave ATS relevantes para tu rol objetivo');
      quickWins.push('Agrega 5–7 keywords ATS alineadas al rol');
    }
    const out = {
      score,
      strengths,
      gaps,
      suggestions,
      quickWins,
      atsKeywordsPresent: present,
      atsKeywordsMissing: missing,
      targetRole: targetRole || null,
    };
    logger.info({ score, strengthCount: strengths.length, gapCount: gaps.length, targetRole }, 'CV evaluado');
    return JSON.stringify(out);
  },
  {
    name: 'evaluar_cv',
    description: 'Evalúa un CV y genera recomendaciones, fortalezas, brechas y keywords ATS.',
    schema: z.object({
      cvText: z.string().describe('Texto completo del CV a evaluar'),
      targetRole: z.string().optional().describe('Rol objetivo opcional, ej. backend, frontend'),
    }),
  }
);

export const generarCartaTool = tool(
  async ({
    cvText,
    jobDescription,
    tone,
  }: {
    cvText: string;
    jobDescription: string;
    tone?: 'formal' | 'amable';
  }) => {
    logger.debug({ cvLength: cvText.length, jdLength: jobDescription.length, tone }, 'Generando cover letter');
    const t = tone ?? 'formal';
    const kws = [
      'JavaScript',
      'TypeScript',
      'Node.js',
      'Express',
      'React',
      'MongoDB',
      'REST',
      'GraphQL',
      'Docker',
      'AWS',
    ];
    const cvK = extractKeywords(cvText, kws);
    const jdK = extractKeywords(jobDescription, kws);
    const match = Array.from(new Set(cvK.filter((k) => jdK.includes(k))));
    const saludo = t === 'amable' ? 'Hola' : 'Estimado equipo de selección';
    const cierre =
      t === 'amable'
        ? 'Gracias por su tiempo. Quedo atento a sus comentarios.'
        : 'Agradezco su tiempo y quedo a disposición para profundizar en mi experiencia.';
    const cuerpo =
      'Me postulo a la posición descrita. Mi experiencia incluye ' +
      (match.length ? match.join(', ') : 'competencias relevantes para el puesto') +
      '. He liderado iniciativas con impacto medible y buenas prácticas (pruebas, CI/CD, documentación).';
    const out =
      `${saludo},\n\n` +
      `${cuerpo}\n\n` +
      `Adjunto mi CV. Me entusiasma contribuir al equipo y a los objetivos del rol.\n\n` +
      `${cierre}\n\n` +
      `Saludos,\n` +
      `Candidato`;
    logger.info({ tone, matchedSkills: match.length }, 'Cover letter generada');
    return out;
  },
  {
    name: 'generar_carta',
    description: 'Genera una cover letter basada en el CV y la descripción del puesto.',
    schema: z.object({
      cvText: z.string().describe('Texto del CV del candidato'),
      jobDescription: z.string().describe('Descripción del puesto'),
      tone: z.enum(['formal', 'amable']).optional().describe('Tono opcional'),
    }),
  }
);
