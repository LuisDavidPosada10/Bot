import { z } from 'zod';

/** Tools sin parámetros: passthrough evita 400 en Groq si el modelo inventa argumentos. */
export const emptyToolSchema = z.object({}).passthrough();
