import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('weatherTool');

const DIA_RELATIVO = ['hoy', 'mañana', 'pasado mañana'] as const;

function formatFechaLegible(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const climaActualTool = tool(
  async ({ ciudad, unidad }: { ciudad: string; unidad?: 'c' | 'f' }) => {
    const u = unidad ?? 'c';
    logger.debug({ ciudad, unidad: u }, 'Obteniendo clima');
    try {
      const url = `https://wttr.in/${encodeURIComponent(ciudad)}?format=j1`;
      const { data } = await axios.get(url, {
        timeout: 8000,
        headers: { 'User-Agent': 'curl/7.64.1', Accept: 'application/json' },
      });
      const current = data?.current_condition?.[0];
      if (!current) {
        logger.warn({ ciudad }, 'No se encontró información del clima');
        return JSON.stringify({ error: 'No se encontró información del clima para esa ciudad' });
      }
      const nearest = data?.nearest_area?.[0];
      const cityName = nearest?.areaName?.[0]?.value ?? ciudad;
      const country = nearest?.country?.[0]?.value ?? '';
      const temp = u === 'c' ? `${current.temp_C}°C` : `${current.temp_F}°F`;
      const feelsLike = u === 'c' ? `${current.FeelsLikeC}°C` : `${current.FeelsLikeF}°F`;
      const desc = current.weatherDesc?.[0]?.value ?? 'desconocido';
      const weatherDays = (data?.weather ?? []).slice(0, 3);
      const fechaConsulta = weatherDays[0]?.date ?? new Date().toISOString().slice(0, 10);
      const forecast = weatherDays.map((d: { date: string; maxtempC: string; mintempC: string; hourly?: { weatherDesc?: { value: string }[] }[] }, i: number) => ({
        fecha: d.date,
        fechaLegible: formatFechaLegible(d.date),
        diaRelativo: DIA_RELATIVO[i] ?? `en ${i} días`,
        maxC: d.maxtempC,
        minC: d.mintempC,
        max: u === 'c' ? `${d.maxtempC}°C` : `${Math.round(Number(d.maxtempC) * 9 / 5 + 32)}°F`,
        min: u === 'c' ? `${d.mintempC}°C` : `${Math.round(Number(d.mintempC) * 9 / 5 + 32)}°F`,
        descripcion: d.hourly?.[4]?.weatherDesc?.[0]?.value ?? '',
      }));
      logger.info({ ciudad, country, temp, fechaConsulta }, 'Clima obtenido exitosamente');
      return JSON.stringify({
        ciudad: cityName,
        pais: country,
        fechaConsulta,
        unidad: u === 'c' ? 'Celsius' : 'Fahrenheit',
        temperatura: temp,
        sensacionTermica: feelsLike,
        descripcion: desc,
        humedad: `${current.humidity}%`,
        viento: `${current.windspeedKmph} km/h`,
        visibilidad: `${current.visibility} km`,
        pronostico3dias: forecast,
        nota: 'Usa las fechas exactas de pronostico3dias (campo fecha y fechaLegible). No inventes fechas.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err, ciudad }, 'Error al obtener clima');
      return JSON.stringify({ error: 'Error al obtener clima', detalles: message });
    }
  },
  {
    name: 'clima_actual',
    description:
      'Obtiene el clima actual y pronóstico de 3 días de cualquier ciudad del mundo. ' +
      'Retorna temperatura, sensación térmica, humedad, viento y visibilidad.',
    schema: z.object({
      ciudad: z.string().describe('Nombre de la ciudad, ej. Bogotá, Madrid, New York, Tokyo'),
      unidad: z
        .enum(['c', 'f'])
        .optional()
        .describe('Unidad de temperatura: c (Celsius) o f (Fahrenheit). Por defecto Celsius'),
    }),
  }
);
