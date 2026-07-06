import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

const mockWeatherResponse = {
  current_condition: [{ temp_C: '20', temp_F: '68', FeelsLikeC: '19', FeelsLikeF: '66', weatherDesc: [{ value: 'Sunny' }], humidity: '50', windspeedKmph: '10', visibility: '10' }],
  nearest_area: [{ areaName: [{ value: 'Bogota' }], country: [{ value: 'Colombia' }] }],
  weather: [
    { date: '2026-07-04', maxtempC: '22', mintempC: '12', hourly: [{ weatherDesc: [{ value: 'Sunny' }] }, {}, {}, {}, { weatherDesc: [{ value: 'Partly cloudy' }] }] },
    { date: '2026-07-05', maxtempC: '23', mintempC: '13', hourly: [{}, {}, {}, {}, { weatherDesc: [{ value: 'Rain' }] }] },
    { date: '2026-07-06', maxtempC: '21', mintempC: '11', hourly: [{}, {}, {}, {}, { weatherDesc: [{ value: 'Cloudy' }] }] },
  ],
};

describe('clima_actual', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.get.mockResolvedValue({ data: mockWeatherResponse });
  });

  it('incluye fechas correctas y campos legibles en el pronóstico', async () => {
    const { climaActualTool } = await import('./weather.js');
    const raw = await climaActualTool.invoke({ ciudad: 'Bogota', unidad: 'c' });
    const data = JSON.parse(raw);

    expect(data.fechaConsulta).toBe('2026-07-04');
    expect(data.pronostico3dias).toHaveLength(3);
    expect(data.pronostico3dias[0]).toMatchObject({
      fecha: '2026-07-04',
      diaRelativo: 'hoy',
    });
    expect(data.pronostico3dias[0].fechaLegible).toContain('2026');
    expect(data.nota).toContain('fechas exactas');
  });
});
