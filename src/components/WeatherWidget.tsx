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
  0:  { label: 'Despejado',            icon: '☀️' },
  1:  { label: 'Mayorm. despejado',    icon: '🌤️' },
  2:  { label: 'Parcialm. nublado',    icon: '⛅' },
  3:  { label: 'Nublado',              icon: '☁️' },
  45: { label: 'Neblina',              icon: '🌫️' },
  48: { label: 'Neblina c/ escarcha',  icon: '🌫️' },
  51: { label: 'Llovizna ligera',      icon: '🌦️' },
  53: { label: 'Llovizna',             icon: '🌦️' },
  55: { label: 'Llovizna intensa',     icon: '🌧️' },
  61: { label: 'Lluvia ligera',        icon: '🌧️' },
  63: { label: 'Lluvia moderada',      icon: '🌧️' },
  65: { label: 'Lluvia intensa',       icon: '🌧️' },
  71: { label: 'Nevada ligera',        icon: '🌨️' },
  73: { label: 'Nevada moderada',      icon: '❄️' },
  75: { label: 'Nevada intensa',       icon: '❄️' },
  77: { label: 'Granizo',              icon: '🌨️' },
  80: { label: 'Chubascos ligeros',    icon: '🌦️' },
  81: { label: 'Chubascos moderados',  icon: '🌧️' },
  82: { label: 'Chubascos intensos',   icon: '⛈️' },
  85: { label: 'Nevada ligera',        icon: '🌨️' },
  86: { label: 'Nevada intensa',       icon: '❄️' },
  95: { label: 'Tormenta',            icon: '⛈️' },
  96: { label: 'Tormenta c/ granizo', icon: '⛈️' },
  99: { label: 'Tormenta c/ granizo', icon: '⛈️' },
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
  return h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`;
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

const NO_SCROLL: React.CSSProperties = { scrollbarWidth: 'none', msOverflowStyle: 'none' };

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
        className="rounded-2xl overflow-hidden shadow-lg animate-pulse h-40"
        style={{ background: 'linear-gradient(160deg, #0284c7 0%, #1d4ed8 100%)' }}
      />
    );
  }

  if (isError || !data) return null;

  const { current, hourly, daily } = data;
  const wmo = getWmo(current.weather_code);
  const isDay = current.is_day === 1;
  const gradient = getGradient(current.weather_code, isDay);

  // Next 10 hours from now
  const nowIso = new Date().toISOString().slice(0, 13);
  const startIdx = Math.max(hourly.time.findIndex(t => t >= nowIso), 0);
  const hourlySlice = Array.from({ length: 10 }, (_, i) => ({
    time: hourly.time[startIdx + i] ?? '',
    temp: hourly.temperature_2m[startIdx + i] ?? 0,
    code: hourly.weather_code[startIdx + i] ?? 0,
  })).filter(h => h.time);

  const allMin = Math.min(...daily.temperature_2m_min);
  const allMax = Math.max(...daily.temperature_2m_max);
  const tempRange = allMax - allMin || 1;

  const uvLabel = (uv: number) =>
    uv <= 2 ? 'Bajo' : uv <= 5 ? 'Moderado' : uv <= 7 ? 'Alto' : uv <= 10 ? 'Muy alto' : 'Extremo';

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-xl text-white"
      style={{ background: gradient }}
    >
      {/* ── Flex row: left info | right forecast ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row">

        {/* LEFT: main temp + pills */}
        <div className="sm:w-52 px-4 py-3 flex flex-col justify-between gap-2 sm:border-r sm:border-white/10">
          {/* Location + temp */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 opacity-80">
                <MapPin className="h-3 w-3" />
                <span className="text-xs font-medium">Durango, Dgo.</span>
              </div>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="Actualizar"
              >
                <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-5xl font-extralight leading-none">{r(current.temperature_2m)}°</span>
              <span className="text-3xl leading-none mb-0.5">{wmo.icon}</span>
            </div>
            <p className="text-xs font-medium opacity-85 mt-0.5">{wmo.label}</p>
            <p className="text-[10px] opacity-60">
              ↑{r(daily.temperature_2m_max[0])}° ↓{r(daily.temperature_2m_min[0])}°
            </p>
          </div>

          {/* Pills 2×2 */}
          <div className="grid grid-cols-2 gap-1">
            {[
              { icon: <Droplets className="h-3 w-3" />, label: 'Humedad', val: `${current.relative_humidity_2m}%` },
              { icon: <Wind className="h-3 w-3" />, label: 'Viento', val: `${r(current.wind_speed_10m)} km/h` },
              { icon: <Thermometer className="h-3 w-3" />, label: 'Sensación', val: `${r(current.apparent_temperature)}°` },
              { icon: <Sun className="h-3 w-3" />, label: `UV ${uvLabel(current.uv_index)}`, val: `${r(current.uv_index)}` },
            ].map(p => (
              <div key={p.label} className="bg-white/10 rounded-lg px-2 py-1 flex items-center gap-1.5">
                <span className="opacity-70">{p.icon}</span>
                <div>
                  <p className="text-[9px] opacity-60 leading-none">{p.label}</p>
                  <p className="text-[11px] font-semibold leading-none mt-0.5">{p.val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: hourly + daily */}
        <div className="flex-1 px-3 py-3 flex flex-col gap-2">

          {/* Hourly */}
          <div className="flex gap-1 overflow-x-auto" style={NO_SCROLL}>
            {hourlySlice.map((h, i) => (
              <div
                key={h.time}
                className="flex flex-col items-center gap-0.5 min-w-[44px] bg-white/10 rounded-xl py-1.5"
              >
                <span className="text-[10px] opacity-65">{i === 0 ? 'Ahora' : formatHour(h.time)}</span>
                <span className="text-base leading-none">{getWmo(h.code).icon}</span>
                <span className="text-xs font-semibold">{r(h.temp)}°</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/15" />

          {/* Daily — 5 days */}
          <div className="space-y-0.5">
            {daily.time.slice(0, 5).map((d, i) => {
              const date = new Date(d + 'T12:00:00');
              const day = i === 0 ? 'Hoy' : DAYS_ES[date.getDay()];
              const icon = getWmo(daily.weather_code[i]).icon;
              const precip = daily.precipitation_probability_max[i];
              const minT = r(daily.temperature_2m_min[i]);
              const maxT = r(daily.temperature_2m_max[i]);
              const barLeft = ((daily.temperature_2m_min[i] - allMin) / tempRange) * 100;
              const barWidth = Math.max(((daily.temperature_2m_max[i] - daily.temperature_2m_min[i]) / tempRange) * 100, 8);

              return (
                <div key={d} className="flex items-center gap-1.5 text-xs">
                  <span className="w-7 font-medium opacity-90">{day}</span>
                  <span className="w-5 text-center text-sm leading-none">{icon}</span>
                  <span className="w-7 text-[10px] text-sky-200 text-right">
                    {precip > 15 ? `${precip}%` : ''}
                  </span>
                  <span className="w-6 text-right opacity-60 text-[10px]">{minT}°</span>
                  <div className="flex-1 h-1 rounded-full bg-white/20 relative overflow-hidden">
                    <div
                      className="absolute top-0 h-full rounded-full"
                      style={{
                        left: `${barLeft}%`,
                        width: `${barWidth}%`,
                        background: i === 0
                          ? 'linear-gradient(90deg,#fbbf24,#f97316)'
                          : 'linear-gradient(90deg,#93c5fd,#60a5fa)',
                      }}
                    />
                  </div>
                  <span className="w-6 font-semibold text-[10px]">{maxT}°</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
