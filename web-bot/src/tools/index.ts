import { horaActualTool } from './time.js';
import { calculadoraTool } from './math.js';
import { ejecutarFuncionTool } from './customFunction.js';
import { buscarWebTool } from './searchWebFixed.js';
import { buscarMejorPrecioTool } from './bestPrice.js';
import { evaluarCvTool, generarCartaTool } from './cv.js';
import { analizarOfertaTool, crearRoadmapTool, generarBulletsCvTool } from './career.js';
import { entrevistaTecnicaTool } from './interview.js';
import { enviarContactoTool } from './email.js';
import { climaActualTool } from './weather.js';
import { cotizacionCriptoTool } from './crypto.js';
import { conversorDivisasTool } from './currency.js';
import { generarContrasenaTool } from './password.js';
import { calculadoraFinancieraTool } from './finance.js';
import { traducirTextoTool } from './translate.js';
import { buscarRecetaTool } from './recipe.js';
import { triviaPreguntaTool } from './trivia.js';
import { generadorQrTool } from './qr.js';
import { perfilLuisTool } from './candidateLinks.js';
import { contactarWhatsappTool } from './whatsapp.js';

export type BotMode = 'portfolio' | 'standalone';

export const defaultTools = [
  // Utilidades generales
  horaActualTool,
  calculadoraTool,
  ejecutarFuncionTool,
  // Búsqueda e información
  buscarWebTool,
  buscarMejorPrecioTool,
  climaActualTool,
  // Finanzas y mercados
  cotizacionCriptoTool,
  conversorDivisasTool,
  calculadoraFinancieraTool,
  // Herramientas de productividad
  generarContrasenaTool,
  traducirTextoTool,
  generadorQrTool,
  // Entretenimiento
  buscarRecetaTool,
  triviaPreguntaTool,
  // Carrera profesional
  perfilLuisTool,
  evaluarCvTool,
  generarCartaTool,
  analizarOfertaTool,
  crearRoadmapTool,
  generarBulletsCvTool,
  entrevistaTecnicaTool,
  // Contacto
  enviarContactoTool,
];

/** Modo portafolio incluye WhatsApp; standalone no. */
export function getToolsForMode(mode: BotMode = 'standalone') {
  if (mode === 'portfolio') {
    return [...defaultTools, contactarWhatsappTool];
  }
  return defaultTools;
}
