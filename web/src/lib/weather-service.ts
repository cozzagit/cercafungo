/**
 * CercaFungo — Weather Service
 *
 * Fetches weather data from Open-Meteo (completely free, no API key needed).
 * Calculates the "Fungo Score" to predict mushroom hunting conditions.
 * Results are cached in localStorage for 3 hours to avoid excessive requests.
 */

import { isMoonFavorable, getMoonPhase } from './moon-phase';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface DailyWeather {
  date: string;
  tempMax: number;
  tempMin: number;
  tempAvg: number;
  precipitationSum: number;
  precipitationProbability: number;
}

export interface CurrentWeather {
  temperature: number;
  humidity: number;
  precipitation: number;
  rain: number;
  windspeed: number;
  soilTemperature: number;
  soilMoisture: number;
}

export interface WeatherData {
  current: CurrentWeather;
  daily: DailyWeather[];
  /** Past 3 days included (negative indices from today in daily[]) */
  past3DaysPrecipitation: number;
  fetchedAt: number;
  location: GeoLocation;
}

export interface FungoScoreBreakdown {
  /** Rain in last 3-5 days: +30 if 10-30mm */
  rainScore: number;
  /** Temperature: +20 if 10-20°C */
  temperatureScore: number;
  /** Humidity: +20 if >70% */
  humidityScore: number;
  /** Season: +20 if Sep-Nov (months 9-11) */
  seasonScore: number;
  /** Moon: +10 if waning */
  moonScore: number;
  /** Total 0-100 */
  total: number;
}

export interface FungoScore {
  score: number;
  breakdown: FungoScoreBreakdown;
  label: 'pessimo' | 'scarso' | 'discreto' | 'buono' | 'ottimo' | 'perfetto';
  color: string;
  message: string;
  recommendation: string;
}

export interface SpeciesCondition {
  id: string;
  name: string;
  emoji: string;
  favorable: boolean;
  factors: {
    label: string;
    ok: boolean;
    note: string;
  }[];
  altitudeRecommendation: string;
  habitatNote: string;
}

export interface WeatherForecast {
  data: WeatherData;
  fungoScore: FungoScore;
  dailyScores: { date: string; score: number; label: string; dayName: string }[];
  species: SpeciesCondition[];
  bestDayIndex: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const CACHE_KEY = 'cercafungo_weather_cache';
const CACHE_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours

// ─── Geolocation ───────────────────────────────────────────────────────────

export function getGeolocation(): Promise<GeoLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalizzazione non supportata da questo browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        reject(new Error(`Impossibile ottenere la posizione: ${err.message}`));
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  });
}

// ─── Open-Meteo API ────────────────────────────────────────────────────────

async function fetchOpenMeteo(location: GeoLocation): Promise<WeatherData> {
  const { latitude, longitude } = location;

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', latitude.toFixed(4));
  url.searchParams.set('longitude', longitude.toFixed(4));
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,soil_temperature_0cm,soil_moisture_0_to_1cm'
  );
  url.searchParams.set(
    'daily',
    'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max'
  );
  url.searchParams.set('timezone', 'Europe/Rome');
  url.searchParams.set('past_days', '3');
  url.searchParams.set('forecast_days', '4');

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const json = await response.json();

  // Parse current conditions
  const current: CurrentWeather = {
    temperature: json.current.temperature_2m ?? 0,
    humidity: json.current.relative_humidity_2m ?? 0,
    precipitation: json.current.precipitation ?? 0,
    rain: json.current.rain ?? 0,
    windspeed: json.current.wind_speed_10m ?? 0,
    soilTemperature: json.current.soil_temperature_0cm ?? 0,
    soilMoisture: (json.current.soil_moisture_0_to_1cm ?? 0) * 100, // convert to %
  };

  // Parse daily data (past 3 + today + next 3 = 7 days)
  const daily: DailyWeather[] = json.daily.time.map(
    (date: string, i: number) => ({
      date,
      tempMax: json.daily.temperature_2m_max[i] ?? 0,
      tempMin: json.daily.temperature_2m_min[i] ?? 0,
      tempAvg:
        ((json.daily.temperature_2m_max[i] ?? 0) +
          (json.daily.temperature_2m_min[i] ?? 0)) /
        2,
      precipitationSum: json.daily.precipitation_sum[i] ?? 0,
      precipitationProbability:
        json.daily.precipitation_probability_max[i] ?? 0,
    })
  );

  // Past 3 days precipitation total (indices 0, 1, 2 are past days)
  const past3DaysPrecipitation =
    daily
      .slice(0, 3)
      .reduce((sum, d) => sum + d.precipitationSum, 0);

  return {
    current,
    daily,
    past3DaysPrecipitation,
    fetchedAt: Date.now(),
    location,
  };
}

// ─── Cache ─────────────────────────────────────────────────────────────────

function loadCache(): WeatherData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const data: WeatherData = JSON.parse(raw);
    const age = Date.now() - data.fetchedAt;

    if (age > CACHE_DURATION_MS) return null;

    return data;
  } catch {
    return null;
  }
}

function saveCache(data: WeatherData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage might be unavailable in some browsers/modes
  }
}

function isCacheValidForLocation(
  cache: WeatherData,
  location: GeoLocation
): boolean {
  const latDiff = Math.abs(cache.location.latitude - location.latitude);
  const lonDiff = Math.abs(cache.location.longitude - location.longitude);
  // Accept cache if within ~5km
  return latDiff < 0.05 && lonDiff < 0.05;
}

// ─── Fungo Score ───────────────────────────────────────────────────────────

function calcFungoScore(data: WeatherData): FungoScore {
  const { current, past3DaysPrecipitation } = data;
  const month = new Date().getMonth() + 1; // 1-12

  const breakdown: FungoScoreBreakdown = {
    rainScore: 0,
    temperatureScore: 0,
    humidityScore: 0,
    seasonScore: 0,
    moonScore: 0,
    total: 0,
  };

  // Rain in last 3 days: ideal 10-30mm
  if (past3DaysPrecipitation >= 5 && past3DaysPrecipitation < 10) {
    breakdown.rainScore = 15;
  } else if (past3DaysPrecipitation >= 10 && past3DaysPrecipitation <= 30) {
    breakdown.rainScore = 30;
  } else if (past3DaysPrecipitation > 30 && past3DaysPrecipitation <= 50) {
    breakdown.rainScore = 20; // too much rain but still ok
  } else if (past3DaysPrecipitation > 50) {
    breakdown.rainScore = 5; // flooding, bad
  } else {
    breakdown.rainScore = 0; // too dry
  }

  // Temperature: ideal 10-20°C
  const temp = current.temperature;
  if (temp >= 10 && temp <= 20) {
    breakdown.temperatureScore = 20;
  } else if ((temp >= 7 && temp < 10) || (temp > 20 && temp <= 25)) {
    breakdown.temperatureScore = 12;
  } else if ((temp >= 5 && temp < 7) || (temp > 25 && temp <= 28)) {
    breakdown.temperatureScore = 6;
  } else {
    breakdown.temperatureScore = 0;
  }

  // Humidity: >70% ideal
  if (current.humidity >= 80) {
    breakdown.humidityScore = 20;
  } else if (current.humidity >= 70) {
    breakdown.humidityScore = 16;
  } else if (current.humidity >= 60) {
    breakdown.humidityScore = 10;
  } else if (current.humidity >= 50) {
    breakdown.humidityScore = 5;
  } else {
    breakdown.humidityScore = 0;
  }

  // Season: Sep=9, Oct=10, Nov=11 are prime; Jun-Aug secondary
  if (month >= 9 && month <= 11) {
    breakdown.seasonScore = 20;
  } else if (month === 4 || month === 5) {
    breakdown.seasonScore = 14; // spring morels
  } else if (month >= 6 && month <= 8) {
    breakdown.seasonScore = 10;
  } else {
    breakdown.seasonScore = 2;
  }

  // Moon phase
  const moon = getMoonPhase();
  breakdown.moonScore = isMoonFavorable(moon) ? 10 : 0;

  breakdown.total = Math.min(
    100,
    breakdown.rainScore +
      breakdown.temperatureScore +
      breakdown.humidityScore +
      breakdown.seasonScore +
      breakdown.moonScore
  );

  const score = breakdown.total;

  let label: FungoScore['label'];
  let color: string;
  let message: string;
  let recommendation: string;

  if (score >= 90) {
    label = 'perfetto';
    color = '#d4ac0d';
    message = 'Condizioni PERFETTE!';
    recommendation =
      'Oggi è una giornata PERFETTA per i porcini! Sveglia presto, stivali, cestino e vai nel bosco!';
  } else if (score >= 70) {
    label = 'ottimo';
    color = '#27ae60';
    message = 'Condizioni Ottime';
    recommendation =
      'Ottime condizioni per la raccolta. Alta probabilità di trovare buoni funghi oggi.';
  } else if (score >= 55) {
    label = 'buono';
    color = '#2ecc71';
    message = 'Buone Condizioni';
    recommendation =
      'Condizioni favorevoli. Vale la pena uscire, specialmente nelle zone altimetriche giuste.';
  } else if (score >= 35) {
    label = 'discreto';
    color = '#f39c12';
    message = 'Condizioni Discrete';
    recommendation =
      'Condizioni nella media. Potresti trovare qualcosa, ma non aspettarti una raccolta eccezionale.';
  } else if (score >= 20) {
    label = 'scarso';
    color = '#e67e22';
    message = 'Condizioni Scarse';
    recommendation =
      'Condizioni poco favorevoli. Meglio aspettare qualche giorno, soprattutto pioggia e temperatura più mite.';
  } else {
    label = 'pessimo';
    color = '#c0392b';
    message = 'Condizioni Pessime';
    recommendation =
      'Il bosco non è pronto oggi. Aspetta le prossime piogge e temperature ideali prima di uscire.';
  }

  return { score, breakdown, label, color, message, recommendation };
}

// ─── Daily Forecast Scores ─────────────────────────────────────────────────

function calcDailyScores(
  data: WeatherData
): { date: string; score: number; label: string; dayName: string }[] {
  const italianDays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  // We have past 3 days + today + up to 3 future = indices 0..6
  // Show today (index 3) and next 3 days (indices 4, 5, 6)
  return data.daily.slice(3, 7).map((day) => {
    const date = new Date(day.date + 'T12:00:00');
    const dayName = italianDays[date.getDay()];

    // Simulate a score for this day based on its weather
    let score = 0;

    // Use past 3 days rain from data for today; for future days use the predicted precipitation
    const rain = day.precipitationSum;
    if (rain >= 10 && rain <= 30) score += 30;
    else if (rain >= 5) score += 15;
    else if (rain > 30) score += 10;

    // Temperature
    const temp = day.tempAvg;
    if (temp >= 10 && temp <= 20) score += 20;
    else if (temp >= 7 && temp <= 25) score += 12;
    else if (temp >= 5) score += 6;

    // Use current humidity as proxy (we don't have daily humidity from this endpoint)
    score += data.current.humidity >= 70 ? 16 : data.current.humidity >= 60 ? 10 : 5;

    // Season
    const month = date.getMonth() + 1;
    if (month >= 9 && month <= 11) score += 20;
    else if (month === 4 || month === 5) score += 14;
    else if (month >= 6 && month <= 8) score += 10;
    else score += 2;

    score = Math.min(100, score);

    let label: string;
    if (score >= 90) label = 'perfetto';
    else if (score >= 70) label = 'ottimo';
    else if (score >= 55) label = 'buono';
    else if (score >= 35) label = 'discreto';
    else if (score >= 20) label = 'scarso';
    else label = 'pessimo';

    return { date: day.date, score, label, dayName };
  });
}

// ─── Species Conditions ────────────────────────────────────────────────────

function calcSpeciesConditions(
  data: WeatherData,
  score: FungoScore
): SpeciesCondition[] {
  const temp = data.current.temperature;
  const humidity = data.current.humidity;
  const rain = data.past3DaysPrecipitation;
  const month = new Date().getMonth() + 1;

  const species: SpeciesCondition[] = [
    {
      id: 'porcini',
      name: 'Porcini',
      emoji: '🍄',
      favorable: false,
      factors: [],
      altitudeRecommendation: '',
      habitatNote: 'Faggete e abetaie 600–1600m',
    },
    {
      id: 'morchelle',
      name: 'Morchelle',
      emoji: '🪸',
      favorable: false,
      factors: [],
      altitudeRecommendation: '',
      habitatNote: 'Boschi misti, fondo valle 300–900m',
    },
    {
      id: 'gallinacci',
      name: 'Gallinacci',
      emoji: '🌼',
      favorable: false,
      factors: [],
      altitudeRecommendation: '',
      habitatNote: 'Boschi di latifoglie 400–1400m',
    },
    {
      id: 'chiodini',
      name: 'Chiodini',
      emoji: '🍄',
      favorable: false,
      factors: [],
      altitudeRecommendation: '',
      habitatNote: 'Ceppaie e tronchi marcescenti, qualsiasi altitudine',
    },
  ];

  // Porcini — ideal: Sep-Oct, 10-18°C, rain last week, altitude depends on temp
  const porcini = species[0];
  const porciniTempOk = temp >= 8 && temp <= 18;
  const porciniRainOk = rain >= 10 && rain <= 40;
  const porciniSeasonOk = month >= 8 && month <= 11;
  porcini.factors = [
    {
      label: 'Temperatura',
      ok: porciniTempOk,
      note: porciniTempOk ? `${temp.toFixed(0)}°C — ideale` : `${temp.toFixed(0)}°C — fuori range ideale`,
    },
    {
      label: 'Pioggia recente',
      ok: porciniRainOk,
      note: porciniRainOk
        ? `${rain.toFixed(0)}mm ultimi 3 giorni — perfetto`
        : rain < 10
        ? `${rain.toFixed(0)}mm — troppo secco`
        : `${rain.toFixed(0)}mm — troppa acqua`,
    },
    {
      label: 'Stagione',
      ok: porciniSeasonOk,
      note: porciniSeasonOk ? 'Periodo ideale' : 'Fuori stagione',
    },
    {
      label: 'Umidità',
      ok: humidity >= 65,
      note: humidity >= 65 ? `${humidity}% — ottima` : `${humidity}% — troppo bassa`,
    },
  ];
  porcini.favorable =
    porcini.factors.filter((f) => f.ok).length >= 3;
  porcini.altitudeRecommendation =
    temp <= 12
      ? 'Scendi a quote basse: 600–900m (faggete)'
      : temp <= 16
      ? 'Quote medie ideali: 900–1300m'
      : 'Sali in quota: 1200–1600m (abetaie)';

  // Morchelle — ideal: Mar-May, 10-18°C, spring moisture
  const morchelle = species[1];
  const morchelleSeasonOk = month >= 3 && month <= 5;
  const morchelleTempOk = temp >= 8 && temp <= 18;
  morchelle.factors = [
    {
      label: 'Stagione',
      ok: morchelleSeasonOk,
      note: morchelleSeasonOk ? 'Primavera — periodo perfetto' : 'Fuori stagione (Mar-Mag)',
    },
    {
      label: 'Temperatura',
      ok: morchelleTempOk,
      note: morchelleTempOk ? `${temp.toFixed(0)}°C — ideale` : `${temp.toFixed(0)}°C — fuori range`,
    },
    {
      label: 'Umidità',
      ok: humidity >= 60,
      note: humidity >= 60 ? `${humidity}% — buona` : `${humidity}% — insufficiente`,
    },
    {
      label: 'Piogge recenti',
      ok: rain >= 5,
      note: rain >= 5 ? `${rain.toFixed(0)}mm — sufficiente` : 'Servono piogge',
    },
  ];
  morchelle.favorable =
    morchelle.factors.filter((f) => f.ok).length >= 3;
  morchelle.altitudeRecommendation =
    temp <= 12 ? 'Fondo valle: 200–600m' : 'Quote collinari: 400–900m';

  // Gallinacci (Chanterelle) — Jul-Sep, >15°C, moderate rain
  const gallinacci = species[2];
  const gallinacciSeasonOk = month >= 6 && month <= 10;
  const gallinacciTempOk = temp >= 12 && temp <= 22;
  const gallinacciRainOk = rain >= 8 && rain <= 35;
  gallinacci.factors = [
    {
      label: 'Stagione',
      ok: gallinacciSeasonOk,
      note: gallinacciSeasonOk ? 'Estate-Autunno — buon periodo' : 'Fuori stagione (Giu-Ott)',
    },
    {
      label: 'Temperatura',
      ok: gallinacciTempOk,
      note: gallinacciTempOk ? `${temp.toFixed(0)}°C — ideale` : `${temp.toFixed(0)}°C — non ideale`,
    },
    {
      label: 'Piogge recenti',
      ok: gallinacciRainOk,
      note: gallinacciRainOk ? `${rain.toFixed(0)}mm — ottimo` : `${rain.toFixed(0)}mm — non sufficiente`,
    },
    {
      label: 'Umidità',
      ok: humidity >= 65,
      note: humidity >= 65 ? `${humidity}% — buona` : `${humidity}% — bassa`,
    },
  ];
  gallinacci.favorable =
    gallinacci.factors.filter((f) => f.ok).length >= 3;
  gallinacci.altitudeRecommendation =
    temp <= 15
      ? 'Boschi collinari: 400–800m'
      : 'Quote medie: 600–1200m (boschi di quercia e faggio)';

  // Chiodini (Honey Fungus) — Oct-Nov, cool+damp
  const chiodini = species[3];
  const chiodiniSeasonOk = month >= 9 && month <= 12;
  const chiodiniTempOk = temp >= 5 && temp <= 16;
  chiodini.factors = [
    {
      label: 'Stagione',
      ok: chiodiniSeasonOk,
      note: chiodiniSeasonOk ? 'Autunno inoltrato — perfetto' : 'Fuori stagione (Ott-Nov)',
    },
    {
      label: 'Temperatura',
      ok: chiodiniTempOk,
      note: chiodiniTempOk
        ? `${temp.toFixed(0)}°C — ideale`
        : `${temp.toFixed(0)}°C — troppo ${temp > 16 ? 'caldo' : 'freddo'}`,
    },
    {
      label: 'Umidità',
      ok: humidity >= 70,
      note: humidity >= 70 ? `${humidity}% — ottima` : `${humidity}% — bassa per i chiodini`,
    },
    {
      label: 'Piogge recenti',
      ok: rain >= 10,
      note: rain >= 10 ? `${rain.toFixed(0)}mm — sufficiente` : `${rain.toFixed(0)}mm — serve più pioggia`,
    },
  ];
  chiodini.favorable =
    chiodini.factors.filter((f) => f.ok).length >= 3;
  chiodini.altitudeRecommendation =
    'Cerca le ceppaie a qualsiasi altitudine: boschi di latifoglie, margini di bosco, frutteti abbandonati';

  return species;
}

// ─── Main Entry Point ──────────────────────────────────────────────────────

export async function getWeatherForecast(
  location: GeoLocation
): Promise<WeatherForecast> {
  // Check cache first
  const cached = loadCache();
  if (cached && isCacheValidForLocation(cached, location)) {
    const fungoScore = calcFungoScore(cached);
    const dailyScores = calcDailyScores(cached);
    const speciesConditions = calcSpeciesConditions(cached, fungoScore);
    const bestDayIndex = dailyScores.reduce(
      (best, day, i) => (day.score > dailyScores[best].score ? i : best),
      0
    );

    return {
      data: cached,
      fungoScore,
      dailyScores,
      species: speciesConditions,
      bestDayIndex,
    };
  }

  // Fetch fresh data
  const weatherData = await fetchOpenMeteo(location);
  saveCache(weatherData);

  const fungoScore = calcFungoScore(weatherData);
  const dailyScores = calcDailyScores(weatherData);
  const speciesConditions = calcSpeciesConditions(weatherData, fungoScore);
  const bestDayIndex = dailyScores.reduce(
    (best, day, i) => (day.score > dailyScores[best].score ? i : best),
    0
  );

  return {
    data: weatherData,
    fungoScore,
    dailyScores,
    species: speciesConditions,
    bestDayIndex,
  };
}

export function clearWeatherCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
