/** Perfil verificado de Luis David Posada — única fuente de verdad para el bot */
export const CANDIDATE_NAME = 'Luis David Posada';
export const CANDIDATE_EMAIL = 'posadaluis451@gmail.com';
export const CANDIDATE_LINKEDIN = 'https://www.linkedin.com/in/luisdavid23/';
export const CANDIDATE_GITHUB = 'https://github.com/LuisDavidPosada10';
export const CANDIDATE_CV_URL = '/cv/Luis-David-Posada-CV.pdf';
export const CANDIDATE_LEVEL = 'Junior Advanced';
export const CANDIDATE_EXPERIENCE_YEARS = '~2 años de experiencia profesional';

export const CANDIDATE_FACTS = [
  CANDIDATE_EXPERIENCE_YEARS,
  'Nivel: Junior Advanced (NO senior, NO 5+ años)',
  'Stack principal: React, TypeScript, Node.js, NestJS',
  'Experiencia FinTech (Capital Pocket) y producto real (Sundevs)',
  'Medellín, Colombia — disponible remoto',
] as const;

export const CANDIDATE_CV_TEXT = `
Luis David Posada — Desarrollador Full Stack · ${CANDIDATE_LEVEL}
${CANDIDATE_EXPERIENCE_YEARS} (NO afirmar 5+ años ni seniority inventada)
Medellín, Colombia · Disponible remoto
Email: posadaluis451@gmail.com
LinkedIn: linkedin.com/in/luisdavid23
GitHub: github.com/LuisDavidPosada10

EXPERIENCIA PROFESIONAL (fechas verificadas)
- Sundevs (May 2026 — actual): Full Stack. React, TypeScript, NestJS, Nx, AWS, Jest, Vitest, Datadog, webhooks.
- Capital Pocket / FinTech (Jun 2025 — May 2026, ~1 año): Serverless AWS, Node.js, TypeScript, NestJS, React, WhatsApp bots, LangChain.
- TCS (Abr 2024 — Oct 2024, ~6 meses): Practicante. Java, Spring Boot, React, PostgreSQL, Azure DevOps.

SKILLS
JavaScript, TypeScript, Node.js, Express, NestJS, React, Next.js, Vite, REST, GraphQL,
MongoDB, PostgreSQL, MySQL, Redis, Docker, CI/CD, AWS, GCP, Jest, Vitest, LangChain,
Git, metodologías ágiles, Datadog, microservicios, WebSockets.

PROYECTOS DESTACADOS
- Web Bot: Agente IA LangChain, 21+ herramientas, memoria híbrida L1+MongoDB.
- Cartelera Hype Tecnológico (Sundevs): React, Vercel, producción.
- E-commerce Full Stack: Node.js, PostgreSQL.

EDUCACIÓN
Tecnólogo ADSO — SENA (2023-2024). E-commerce Node+PostgreSQL como proyecto final.

IDIOMAS
Español nativo · Inglés técnico
`.trim();
