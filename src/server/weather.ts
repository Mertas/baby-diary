// Погода через открытый Open-Meteo API (без ключа): геокодинг города + прогноз.
// Кэш 30 минут — не долбим внешний API на каждый рендер.

const CACHE_TTL = 30 * 60 * 1000;
const cache = new Map<string, { ts: number; data: unknown }>();

const WMO: Record<number, { icon: string; desc: string }> = {
  0: { icon: '☀️', desc: 'Ясно' },
  1: { icon: '🌤️', desc: 'Преимущественно ясно' },
  2: { icon: '⛅', desc: 'Переменная облачность' },
  3: { icon: '☁️', desc: 'Пасмурно' },
  45: { icon: '🌫️', desc: 'Туман' },
  48: { icon: '🌫️', desc: 'Изморозь' },
  51: { icon: '🌦️', desc: 'Морось' },
  53: { icon: '🌦️', desc: 'Морось' },
  55: { icon: '🌦️', desc: 'Сильная морось' },
  56: { icon: '🌧️', desc: 'Ледяная морось' },
  57: { icon: '🌧️', desc: 'Ледяная морось' },
  61: { icon: '🌧️', desc: 'Небольшой дождь' },
  63: { icon: '🌧️', desc: 'Дождь' },
  65: { icon: '🌧️', desc: 'Сильный дождь' },
  66: { icon: '🌧️', desc: 'Ледяной дождь' },
  67: { icon: '🌧️', desc: 'Ледяной дождь' },
  71: { icon: '🌨️', desc: 'Снег' },
  73: { icon: '🌨️', desc: 'Снег' },
  75: { icon: '❄️', desc: 'Сильный снег' },
  77: { icon: '🌨️', desc: 'Снежные зёрна' },
  80: { icon: '🌦️', desc: 'Ливень' },
  81: { icon: '🌧️', desc: 'Ливень' },
  82: { icon: '⛈️', desc: 'Сильный ливень' },
  85: { icon: '🌨️', desc: 'Снежные ливни' },
  86: { icon: '❄️', desc: 'Сильные снежные ливни' },
  95: { icon: '⛈️', desc: 'Гроза' },
  96: { icon: '⛈️', desc: 'Гроза с градом' },
  99: { icon: '⛈️', desc: 'Гроза с градом' },
};

function wmo(code: number): { icon: string; desc: string } {
  return WMO[code] || { icon: '🌡️', desc: 'Разные условия' };
}

export async function getWeather(city: string): Promise<unknown> {
  const key = city.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.trim())}&count=1&language=ru&format=json`
  );
  if (!geoRes.ok) throw new Error('geocoding ' + geoRes.status);
  const geo = (await geoRes.json()) as { results?: { name: string; latitude: number; longitude: number; country?: string }[] };
  const place = geo.results?.[0];
  if (!place) throw new Error('city not found');

  const fcRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max` +
      `&timezone=auto&forecast_days=8`
  );
  if (!fcRes.ok) throw new Error('forecast ' + fcRes.status);
  const fc = (await fcRes.json()) as {
    current: { temperature_2m: number; relative_humidity_2m: number; apparent_temperature: number; precipitation: number; weather_code: number; wind_speed_10m: number };
    daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: (number | null)[]; wind_speed_10m_max: number[] };
  };

  const cur = fc.current;
  const cw = wmo(cur.weather_code);
  const daily = fc.daily.time.map((t, i) => {
    const w = wmo(fc.daily.weather_code[i]);
    return {
      date: t,
      icon: w.icon,
      desc: w.desc,
      tmax: Math.round(fc.daily.temperature_2m_max[i]),
      tmin: Math.round(fc.daily.temperature_2m_min[i]),
      precipProb: fc.daily.precipitation_probability_max[i] ?? 0,
      windMax: Math.round(fc.daily.wind_speed_10m_max[i]),
    };
  });

  const data = {
    city: place.name,
    country: place.country || '',
    updated: Date.now(),
    current: {
      temp: Math.round(cur.temperature_2m),
      feels: Math.round(cur.apparent_temperature),
      humidity: cur.relative_humidity_2m,
      wind: Math.round(cur.wind_speed_10m),
      precip: cur.precipitation,
      icon: cw.icon,
      desc: cw.desc,
    },
    daily,
  };
  cache.set(key, { ts: Date.now(), data });
  return data;
}
