import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getLogger } from '../utils/logger.js';
import { CANDIDATE_CV_TEXT, CANDIDATE_NAME, CANDIDATE_EXPERIENCE_YEARS, CANDIDATE_LEVEL } from '../data/candidateProfile.js';

const logger = getLogger('careerTool');

function textIncludes(txt: string, kw: string): boolean {
  return txt.toLowerCase().includes(kw.toLowerCase());
}

function tokenize(txt: string): string[] {
  return txt.toLowerCase().split(/[^a-z0-9\+\.#-]+/i).filter(Boolean);
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export const analizarOfertaTool = tool(
  async ({
    jobDescription,
    cvText,
    roleHint,
  }: {
    jobDescription: string;
    cvText?: string;
    roleHint?: string;
  }) => {
    logger.debug({ hasCV: !!cvText, roleHint, jdLength: jobDescription.length }, 'Analizando oferta de trabajo');
    const jd = jobDescription.trim();
    const effectiveCv = cvText?.trim() || CANDIDATE_CV_TEXT;
    const tokens = tokenize(jd);
    const baseSkills = [
      'javascript',
      'typescript',
      'node',
      'express',
      'react',
      'next',
      'rest',
      'graphql',
      'docker',
      'aws',
      'gcp',
      'azure',
      'postgresql',
      'mongodb',
      'mysql',
      'redis',
      'kubernetes',
      'jest',
      'vitest',
      'ci',
      'cd',
      'microservicios',
      'monorepo',
      'prisma',
    ];
    const required = unique(baseSkills.filter((s) => tokens.includes(s)));
    const niceToHave = unique(
      ['turborepo', 'storybook', 'tailwind', 'webpack', 'vite', 'airflow', 'spark'].filter((s) =>
        tokens.includes(s)
      )
    );
    let seniority = 'mid';
    if (textIncludes(jd, 'senior') || textIncludes(jd, '5+ años')) seniority = 'senior';
    if (textIncludes(jd, 'junior') || textIncludes(jd, '0-2 años')) seniority = 'junior';
    const cvTokens = tokenize(effectiveCv);
    const skillsCoincidentes = required.filter((r) => cvTokens.includes(r));
    const otrasSkillsEnOferta = required.filter((r) => !cvTokens.includes(r));

    logger.info(
      { seniority, requiredCount: required.length, coincidentes: skillsCoincidentes.length },
      'Oferta analizada'
    );
    return JSON.stringify({
      candidate: CANDIDATE_NAME,
      candidateLevel: CANDIDATE_LEVEL,
      candidateExperience: CANDIDATE_EXPERIENCE_YEARS,
      skillsCoincidentes,
      otrasSkillsEnOferta,
      skillsAdicionales: niceToHave,
      senioritySolicitado: seniority,
      rolTipo: 'desarrollador',
      siguientePaso:
        'Invitar al reclutador a dejar sus datos de contacto. Luis evaluará la vacante personalmente.',
      mensajeClave:
        'Luis David revisará esta oportunidad directamente y continuará la conversación contigo.',
      cvSource: cvText?.trim() ? 'provided' : 'candidate_profile',
    });
  },
  {
    name: 'analizar_oferta',
    description:
      'Analiza una vacante de desarrollador y destaca coincidencias con el perfil de ' +
      CANDIDATE_NAME +
      '. NO evalúa si encaja o no — prepara un resumen positivo e invita al reclutador a dejar contacto.',
    schema: z.object({
      jobDescription: z.string().describe('Descripción del puesto'),
      cvText: z.string().optional().describe('Texto del CV para calcular match'),
      roleHint: z.string().optional().describe('Pista de rol objetivo (ej. backend)'),
    }),
  }
);

export const crearRoadmapTool = tool(
  async ({
    gaps,
    weeks,
    role,
  }: {
    gaps: string[];
    weeks?: number;
    role?: string;
  }) => {
    logger.debug({ gapsCount: gaps.length, weeks, role }, 'Creando roadmap');
    const w = Math.min(12, Math.max(4, weeks ?? 6));
    const focus = unique(gaps.map((g) => g.toLowerCase()).slice(0, 8));
    const plan: any[] = [];
    for (let i = 1; i <= w; i++) {
      const topic = focus[(i - 1) % Math.max(1, focus.length)] || 'fundamentos';
      plan.push({
        week: i,
        topic,
        objectives: [
          `Aprender conceptos clave de ${topic}`,
          `Construir un mini-proyecto integrando ${topic}`,
          `Escribir pruebas básicas y documentación`,
        ],
        deliverable: `Repositorio con ejemplo de ${topic} y README`,
      });
    }
    logger.info({ role, weeksPlanned: w, topicsCount: focus.length }, 'Roadmap creado');
    return JSON.stringify({
      role: role ?? null,
      lengthWeeks: w,
      plan,
    });
  },
  {
    name: 'crear_roadmap',
    description: 'Genera un roadmap semanal basado en brechas detectadas del candidato.',
    schema: z.object({
      gaps: z.array(z.string()).describe('Lista de brechas/skills a cubrir'),
      weeks: z.number().int().positive().optional().describe('Semanas (4-12, por defecto 6)'),
      role: z.string().optional().describe('Rol objetivo, ej. backend'),
    }),
  }
);

export const generarBulletsCvTool = tool(
  async ({
    cvText,
    jobDescription,
    count,
  }: {
    cvText: string;
    jobDescription: string;
    count?: number;
  }) => {
    logger.debug({ cvLength: cvText.length, jdLength: jobDescription.length, count }, 'Generando bullets para CV');
    const n = Math.min(10, Math.max(3, count ?? 6));
    const jdTokens = tokenize(jobDescription);
    const focus = unique(
      ['typescript', 'node', 'react', 'postgresql', 'docker', 'aws', 'rest', 'graphql'].filter((s) =>
        jdTokens.includes(s)
      )
    );
    const bullets: string[] = [];
    for (let i = 0; i < n; i++) {
      const skill = focus[i % Math.max(1, focus.length)] || 'impacto';
      bullets.push(
        `Logré ${skill} con resultados medibles, aumentando eficiencia en 25% y reduciendo defectos en 30%.`
      );
    }
    logger.info({ bulletsGenerated: bullets.length, focusSkills: focus.length }, 'Bullets generados');
    return JSON.stringify({
      bullets,
    });
  },
  {
    name: 'generar_bullets_cv',
    description:
      'Genera bullets cuantificados para CV, alineados a la descripción del puesto y el stack.',
    schema: z.object({
      cvText: z.string().describe('Texto del CV'),
      jobDescription: z.string().describe('Descripción del puesto'),
      count: z.number().int().positive().optional().describe('Cantidad de bullets (3-10, por defecto 6)'),
    }),
  }
);
