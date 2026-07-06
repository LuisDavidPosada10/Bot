import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('customFunctionTool');

export const ejecutarFuncionTool = tool(
  async ({
    nombre,
    argumentos,
  }: {
    nombre: string;
    argumentos?: Record<string, unknown>;
  }) => {
    logger.debug({ functionName: nombre, hasArgs: !!argumentos }, 'Ejecutando función');
    switch (nombre) {
      case 'saludar': {
        const quien = (argumentos as any)?.quien ?? 'mundo';
        logger.info({ to: quien }, 'Saludando');
        return `Hola, ${quien}!`;
      }
      case 'eco': {
        logger.debug({ args: argumentos }, 'Ecos de argumentos');
        return JSON.stringify(argumentos ?? {});
      }
      default:
        logger.warn({ functionName: nombre }, 'Función no implementada');
        return `Función "${nombre}" no implementada.`;
    }
  },
  {
    name: 'ejecutar_funcion',
    description:
      'Ejecuta una función simple definida por nombre. Útil para comportamientos personalizados.',
    schema: z.object({
      nombre: z.string().describe('Nombre de la función a ejecutar'),
      argumentos: z
        .record(z.any())
        .optional()
        .describe('Argumentos para la función, según corresponda'),
    }),
  }
);
