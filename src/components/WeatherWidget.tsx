import { useQuery } from '@tanstack/react-query';
import { Droplets, Wind, Thermometer, Sun, MapPin, RefreshCw } from 'lucide-react';

const LAT = 24.0277;
const LON = -104.6532;

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
    is_day: number;
    uv_index: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_probability_max: number[];
  };
}

const WMO: Record<number, { label: string; icon: string }> = {
  0:  { label: 'Cielo despejado',       icon: '☀️' },
  1:  { label: 'Mayormente despejado',  icon: '🌤️' },
  2:  { label: 'Parcialmente nublado',  icon: '⛅' },
  3:  { label: 'Nublado',               icon: '☁️' },
  45: { label: 'Neblina',               icon: '🌫️' },
  48: { label: 'Neblina con escarcha',  icon: '🌫️' },
  51: { label: 'Llovizna ligera',       icon: '🌦️' },
  53: { label: 'Llovizna',              icon: '🌦️' },
  55: { label: 'Llovizna intensa',      icon: '🌧️' },
  61: { label: 'Lluvia ligera',         icon: '🌧️' },
  63: { label: 'Lluvia moderada',       icon: '🌧️' },
  65: { label: 'Lluvia intensa',        icon: '🌧️' },
  71: { label: 'Nevada ligera',         icon: '🌨️' },
  73: { label: 'Nevada moderada',       icon: '❄️' },
  75: { label: 'Nevada intensa',        icon: '❄️' },
  77: { label: 'Granizo',               icon: '🌨️' },
  80: { label: 'Chubascos ligeros',     icon: '🌦️' },
  81: { label: 'Chubascos moderados',   icon: '🌧️' },
  82: { label: 'Chubascos intensos',    icon: '⛈️' },
  85: { label: 'Nevada ligera',         icon: '🌨️' },
  86: { label: 'Nevada intensa',        icon: '❄️' },
  95: { label: 'Tormenta',             icon: '⛈️' },
  96: { label: 'Tormenta con granizo',  icon: '⛈️' },
  99: { label: 'Tormenta con granizo',  icon: '⛈️' },
};

function getWmo(code: number) {
  return WMO[code] ?? WMO[Math.floor(code / 10) * 10] ?? { label: 'Variable', icon: '🌡️' };
}

function getGradient(code: number, isDay: boolean): string {
  if (!isDay) {
    if (code >= 95) return 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
    if (code >= 61) return 'linear-gradient(160deg, #1e3a5f 0%, #0d2137 100%)';
    return 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)';
  }
  if (code === 0 || code === 1) return 'linear-gradient(160deg, #0284c7 0%, #0369a1 40%, #1d4ed8 100%)';
  if (code === 2)               return 'linear-gradient(160deg, #4f86c6 0%, #2563eb 60%, #1e40af 100%)';
  if (code === 3)               return 'linear-gradient(160deg, #6b7280 0%, #475569 100%)';
  if (code >= 45 && code <= 48) return 'linear-gradient(160deg, #9ca3af 0%, #6b7280 100%)';
  if (code >= 51 && code <= 67) return 'linear-gradient(160deg, #374151 0%, #1e3a5f 100%)';
  if (code >= 71 && code <= 77) return 'linear-gradient(160deg, #bfdbfe 0%, #93c5fd 50%, #60a5fa 100%)';
  if (code >= 80 && code <= 86) return 'linear-gradient(160deg, #334155 0%, #1e3a5f 100%)';
  if (code >= 95)               return 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)';
  return 'linear-gradient(160deg, #0284c7 0%, #1d4ed8 100%)';
}

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function r(n: number) { return Math.round(n); }

function formatHour(isoTime: string) {
  const h = parseInt(isoTime.slice(11, 13), 10);
  return h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
}

async function fetchWeather(): Promise<OpenMeteoResponse> {
  const params = new URLSearchParams({
    latitude: String(LAT),
    longitude: String(LON),
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day,uv_index',
    hourly: 'temperature_2m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max',
    timezone: 'America/Mazatlan',
    forecast_days: '7',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error('No se pudo obtener el clima');
  return res.json();
}

export function WeatherWidget() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['weather-durango'],
    queryFn: fetchWeather,
    staleTime: 30 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div
        className="rounded-3xl overflow-hidden shadow-xl animate-pulse"
        style={{ background: 'linear-gradient(160deg, #0284c7 0%, #1d4ed8 100%)', minHeight: 220 }}
      >
        <div className="p-6 space-y-4">
          <div className="h-4 w-32 rounded-full bg-white/20" />
          <div className="h-16 w-24 rounded-xl bg-white/20" />
          <div className="h-4 w-48 rounded-full bg-white/20" />
        </div>
      </div>
    );
  }

  if (isError || !data) return null;

  const { current, hourly, daily } = data;
  const wmo = getWmo(current.weather_code);
  const isDay = current.is_day === 1;
  const gradient = getGradient(current.weather_code, isDay);

  // Next 12 hours from now
  const nowIso = new Date().toISOString().slice(0, 13); // "2026-03-24T14"
  const startIdx = hourly.time.findIndex(t => t >= nowIso) ?? 0;
  const hourlySlice = Array.from({ length: 12 }, (_, i) => ({
    time: hourly.time[startIdx + i] ?? '',
    temp: hourly.temperature_2m[startIdx + i] ?? 0,
    code: hourly.weather_code[startIdx + i] ?? 0,
  })).filter(h => h.time);

  // Temperature range for bar normalisation
  const allMin = Math.min(...daily.temperature_2m_min);
  const allMax = Math.max(...daily.temperature_2m_max);
  const tempRange = allMax - allMin || 1;

  const uvLabel = (uv: number) => {
    if (uv <= 2) return 'Bajo';
    if (uv <= 5) return 'Moderado';
    if (uv <= 7) return 'Alto';
    if (uv <= 10) return 'Muy alto';
    return 'Extremo';
  };

  return (
    <div
      className="rounded-3xl overflow-hidden shadow-2xl text-white relative"
      style={{ background: gradient }}
    >
      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }}
      />

      {/* Main content */}
      <div className="relative">

        {/* ── Top: location + temp ─────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 opacity-90">
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-sm font-medium tracking-wide">Durango, Dgo.</span>
            </div>
            <div className="flex items-start leading-none mt-1">
              <span className="text-8xl font-extralight tracking-tighter">{r(current.temperature_2m)}</span>
              <span className="text-3xl font-light mt-3 ml-0.5">°C</span>
            </div>
            <p className="text-base mt-1.5 font-medium opacity-90">{wmo.label}</p>
            <p className="text-sm opacity-70 mt-0.5">
              Máx {r(daily.temperature_2m_max[0])}° · Mín {r(daily.temperature_2m_min[0])}°
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-7xl" role="img" aria-label={wmo.label}>{wmo.icon}</span>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Actualizar clima"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Info pills ───────────────────────────────────────────────────── */}
        <div className="px-6 pb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2.5 flex items-center gap-2">
            <Droplets className="h-4 w-4 opacity-80 shrink-0" />
            <div>
              <p className="text-xs opacity-70">Humedad</p>
              <p className="text-sm font-semibold">{current.relative_humidity_2m}%</p>
            </div>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2.5 flex items-center gap-2">
            <Wind className="h-4 w-4 opacity-80 shrink-0" />
            <div>
              <p className="text-xs opacity-70">Viento</p>
              <p className="text-sm font-semibold">{r(current.wind_speed_10m)} km/h</p>
            </div>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2.5 flex items-center gap-2">
            <Thermometer className="h-4 w-4 opacity-80 shrink-0" />
            <div>
              <p className="text-xs opacity-70">Sensación</p>
              <p className="text-sm font-semibold">{r(current.apparent_temperature)}°C</p>
            </div>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2.5 flex items-center gap-2">
            <Sun className="h-4 w-4 opacity-80 shrink-0" />
            <div>
              <p className="text-xs opacity-70">Índice UV</p>
              <p className="text-sm font-semibold">{r(current.uv_index)} <span className="font-normal opacity-70 text-xs">{uvLabel(current.uv_index)}</span></p>
            </div>
          </div>
        </div>

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        <div className="mx-5 h-px bg-white/20" />

        {/* ── Hourly forecast ──────────────────────────────────────────────── */}
        {hourlySlice.length > 0 && (
          <div className="px-5 pt-3 pb-2">
            <p className="text-xs opacity-50 uppercase tracking-widest mb-2">Próximas horas</p>
            <div
              className="flex gap-1 overflow-x-auto pb-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
            >
              {hourlySlice.map((h, i) => (
                <div
                  key={h.time}
                  className="flex flex-col items-center gap-1.5 min-w-[56px] bg-white/10 rounded-2xl py-2 px-1"
                >
                  <span className="text-xs opacity-70">{i === 0 ? 'Ahora' : formatHour(h.time)}</span>
                  <span className="text-xl leading-none">{getWmo(h.code).icon}</span>
                  <span className="text-sm font-semibold">{r(h.temp)}°</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        <div className="mx-5 mt-2 h-px bg-white/20" />

        {/* ── 7-day forecast ───────────────────────────────────────────────── */}
        <div className="px-5 pt-3 pb-5">
          <p className="text-xs opacity-50 uppercase tracking-widest mb-2">Próximos 7 días</p>
          <div className="space-y-1.5">
            {daily.time.map((d, i) => {
              const date = new Date(d + 'T12:00:00');
              const dayLabel = i === 0 ? 'Hoy' : DAYS_ES[date.getDay()];
              const icon = getWmo(daily.weather_code[i]).icon;
              const precip = daily.precipitation_probability_max[i];
              const minT = r(daily.temperature_2m_min[i]);
              const maxT = r(daily.temperature_2m_max[i]);
              // Bar: position and width as % of overall range
              const barLeft = ((daily.temperature_2m_min[i] - allMin) / tempRange) * 100;
              const barWidth = ((daily.temperature_2m_max[i] - daily.temperature_2m_min[i]) / tempRange) * 100;

              return (
                <div key={d} className="flex items-center gap-2">
                  <span className="w-9 text-sm font-medium opacity-90">{dayLabel}</span>
                  <span className="text-lg w-7 text-center leading-none">{icon}</span>
                  <span className="w-10 text-xs text-sky-200 text-right">
                    {precip > 15 ? `${precip}%` : ''}
                  </span>
                  <div className="flex flex-1 items-center gap-2">
                    <span className="w-8 text-xs text-right opacity-70">{minT}°</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/20 relative overflow-hidden">
                      <div
                        className="absolute top-0 h-full rounded-full"
                        style={{
                          left: `${barLeft}%`,
                          width: `${Math.max(barWidth, 8)}%`,
                          background: i === 0
                            ? 'linear-gradient(90deg, #fbbf24, #f97316)'
                            : 'linear-gradient(90deg, #93c5fd, #60a5fa)',
                        }}
                      />
                    </div>
                    <span className="w-8 text-xs font-semibold">{maxT}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="px-5 pb-3">
          <p className="text-xs opacity-40 text-right">
            Fuente: Open-Meteo · Actualiza cada 30 min
          </p>
        </div>
      </div>
    </div>
  );
}
