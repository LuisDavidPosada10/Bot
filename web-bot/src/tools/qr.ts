import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('qrTool');

export const generadorQrTool = tool(
  async ({ contenido, tamano, colorFondo, colorFrente }: {
    contenido: string;
    tamano?: number;
    colorFondo?: string;
    colorFrente?: string;
  }) => {
    logger.debug({ contentLength: contenido.length, size: tamano }, 'Generando código QR');
    const size = Math.min(600, Math.max(100, tamano ?? 250));
    const data = contenido.trim();
    if (!data) {
      logger.warn('Contenido vacío para QR');
      return JSON.stringify({ error: 'El contenido no puede estar vacío' });
    }
    const bg = (colorFondo ?? 'ffffff').replace('#', '');
    const fg = (colorFrente ?? '000000').replace('#', '');
    const encodedData = encodeURIComponent(data);
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}&bgcolor=${bg}&color=${fg}&format=png`;
    const downloadUrl = `${url}&download=1`;
    let tipo = 'texto';
    if (/^https?:\/\//i.test(data)) tipo = 'URL';
    else if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data)) tipo = 'email';
    else if (/^tel:/i.test(data) || /^\+?[\d\s\-()]{7,}$/.test(data)) tipo = 'teléfono';
    else if (/^WIFI:/i.test(data)) tipo = 'WiFi';
    else if (/^BEGIN:VCARD/i.test(data)) tipo = 'contacto (vCard)';
    logger.info({ type: tipo, size: `${size}x${size}` }, 'Código QR generado');
    return JSON.stringify({
      url_imagen: url,
      url_descarga: downloadUrl,
      contenido: data.length > 80 ? data.slice(0, 80) + '...' : data,
      tipo,
      tamano: `${size}x${size}px`,
      instruccion: 'Muestra la url_imagen al usuario para que pueda ver el QR. En un frontend con <img> se renderiza directamente.',
    });
  },
  {
    name: 'generador_qr',
    description:
      'Genera un código QR para cualquier contenido: URLs, texto, emails, números de teléfono, redes WiFi, contactos vCard. ' +
      'Devuelve una URL de imagen lista para mostrar en el navegador.',
    schema: z.object({
      contenido: z.string().min(1).describe('Contenido del QR: URL, texto, email, teléfono, WiFi (WIFI:S:nombre;T:WPA;P:clave;;)'),
      tamano: z.number().int().min(100).max(600).optional().describe('Tamaño en píxeles (100-600, defecto 250)'),
      colorFondo: z.string().optional().describe('Color de fondo en hex sin # (defecto ffffff = blanco)'),
      colorFrente: z.string().optional().describe('Color del QR en hex sin # (defecto 000000 = negro)'),
    }),
  }
);