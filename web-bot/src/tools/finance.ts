import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('financeTool');

export const calculadoraFinancieraTool = tool(
  async ({ tipo, params }: { tipo: string; params: Record<string, number> }) => {
    logger.debug({ tipo, paramKeys: Object.keys(params) }, 'Iniciando cálculo financiero');
    try {
      switch (tipo) {
        case 'prestamo': {
          const { capital, tasaAnual, meses } = params;
          if (!capital || !meses) {
            logger.warn({ capital, meses }, 'Parámetros incompletos para préstamo');
            return JSON.stringify({ error: 'Requiere capital y meses' });
          }
          const r = (tasaAnual ?? 0) / 100 / 12;
          const n = Math.round(meses);
          let pmt: number;
          if (r === 0) {
            pmt = capital / n;
          } else {
            pmt = (capital * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
          }
          const totalPagado = pmt * n;
          const totalIntereses = totalPagado - capital;
          logger.info({ capital, tasaAnual, meses, pmt }, 'Cálculo de préstamo completado');
          return JSON.stringify({
            tipo: 'prestamo',
            capital,
            tasaAnualPct: tasaAnual ?? 0,
            meses: n,
            pagoMensual: Math.round(pmt * 100) / 100,
            totalPagado: Math.round(totalPagado * 100) / 100,
            totalIntereses: Math.round(totalIntereses * 100) / 100,
          });
        }
        case 'interes_compuesto': {
          const { capital, tasaAnual, anos, composicionesAno } = params;
          if (!capital || !anos) {
            logger.warn({ capital, anos }, 'Parámetros incompletos para interés compuesto');
            return JSON.stringify({ error: 'Requiere capital y anos' });
          }
          const r = tasaAnual / 100;
          const n = composicionesAno ?? 12;
          const t = anos;
          const A = capital * Math.pow(1 + r / n, n * t);
          logger.info({ capital, tasaAnual, anos, montoFinal: A }, 'Cálculo de interés compuesto completado');
          return JSON.stringify({
            tipo: 'interes_compuesto',
            capitalInicial: capital,
            tasaAnualPct: tasaAnual,
            anos: t,
            montoFinal: Math.round(A * 100) / 100,
            interesesGanados: Math.round((A - capital) * 100) / 100,
          });
        }
        case 'roi': {
          const { inversion, ganancia } = params;
          if (inversion === undefined || ganancia === undefined) {
            logger.warn({ inversion, ganancia }, 'Parámetros incompletos para ROI');
            return JSON.stringify({ error: 'Requiere inversion y ganancia' });
          }
          if (inversion === 0) {
            logger.warn('Inversión es cero para ROI');
            return JSON.stringify({ error: 'La inversion no puede ser cero' });
          }
          const roi = ((ganancia - inversion) / inversion) * 100;
          logger.info({ inversion, ganancia, roi }, 'Cálculo de ROI completado');
          return JSON.stringify({
            tipo: 'roi',
            inversion,
            ganancia,
            roi: Math.round(roi * 100) / 100 + '%',
            gananciaAbsoluta: Math.round((ganancia - inversion) * 100) / 100,
          });
        }
        case 'equilibrio': {
          const { costoFijo, precioVenta, costoVariable } = params;
          if (!costoFijo || !precioVenta || costoVariable === undefined) {
            logger.warn({ costoFijo, precioVenta, costoVariable }, 'Parámetros incompletos para punto de equilibrio');
            return JSON.stringify({ error: 'Requiere costoFijo, precioVenta y costoVariable' });
          }
          const margen = precioVenta - costoVariable;
          if (margen <= 0) {
            logger.warn({ precioVenta, costoVariable }, 'Margen inválido para punto de equilibrio');
            return JSON.stringify({ error: 'El precio de venta debe ser mayor al costo variable' });
          }
          const unidades = costoFijo / margen;
          logger.info({ costoFijo, precioVenta, costoVariable, unidadesEquilibrio: Math.ceil(unidades) }, 'Cálculo de equilibrio completado');
          return JSON.stringify({
            tipo: 'equilibrio',
            costoFijo,
            precioVenta,
            costoVariable,
            unidadesEquilibrio: Math.ceil(unidades),
            ingresoEquilibrio: Math.round(Math.ceil(unidades) * precioVenta * 100) / 100,
            margenPorUnidad: Math.round(margen * 100) / 100,
          });
        }
        case 'ahorro_meta': {
          const { meta, ahorroMensual, tasaAnual } = params;
          if (!meta || !ahorroMensual) {
            logger.warn({ meta, ahorroMensual }, 'Parámetros incompletos para meta de ahorro');
            return JSON.stringify({ error: 'Requiere meta y ahorroMensual' });
          }
          const r = (tasaAnual ?? 0) / 100 / 12;
          let meses: number;
          if (r === 0) {
            meses = meta / ahorroMensual;
          } else {
            meses = Math.log(1 + (meta * r) / ahorroMensual) / Math.log(1 + r);
          }
          const anos = meses / 12;
          logger.info({ meta, ahorroMensual, tasaAnual, mesesNecesarios: Math.ceil(meses) }, 'Cálculo de meta de ahorro completado');
          return JSON.stringify({
            tipo: 'ahorro_meta',
            meta,
            ahorroMensual,
            tasaAnualPct: tasaAnual ?? 0,
            mesesNecesarios: Math.ceil(meses),
            anosNecesarios: Math.round(anos * 10) / 10,
          });
        }
        default:
          logger.warn({ tipo }, 'Tipo de cálculo no soportado');
          return JSON.stringify({ error: 'Tipo no soportado: ' + tipo + '. Usa: prestamo, interes_compuesto, roi, equilibrio, ahorro_meta' });
      }
    } catch (err: any) {
      logger.error({ err, tipo }, 'Error en cálculo financiero');
      return JSON.stringify({ error: err?.message ?? 'Error en calculo financiero' });
    }
  },
  {
    name: 'calculadora_financiera',
    description:
      'Calculos financieros: cuotas de prestamo, interes compuesto, ROI, punto de equilibrio y tiempo para alcanzar meta de ahorro.',
    schema: z.object({
      tipo: z.enum(['prestamo', 'interes_compuesto', 'roi', 'equilibrio', 'ahorro_meta']).describe(
        'Tipo: prestamo={capital,tasaAnual,meses}; interes_compuesto={capital,tasaAnual,anos,composicionesAno?}; ' +
        'roi={inversion,ganancia}; equilibrio={costoFijo,precioVenta,costoVariable}; ahorro_meta={meta,ahorroMensual,tasaAnual?}'
      ),
      params: z.record(z.number()).describe('Parametros numericos segun el tipo de calculo'),
    }),
  }
);