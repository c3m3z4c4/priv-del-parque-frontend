import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { useMeetingsQuery, useEventsQuery, useHousesQuery, useUsersQuery } from '@/hooks/useApi';
import { Calendar, TreePine, Home, Users, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { ADMIN_ROLES } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/* ─── Label pill — the "Roca 3154" block from BONJO ────────── */
function Pill({
  children,
  on = 'white',
}: {
  children: React.ReactNode;
  on?: 'white' | 'taupe' | 'dark';
}) {
  return (
    <span
      className={cn(
        'inline-block px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.2em]',
        on === 'white' && 'bg-foreground text-background',
        on === 'taupe' && 'bg-foreground/15 text-foreground',
        on === 'dark'  && 'bg-white/20 text-white',
      )}
    >
      {children}
    </span>
  );
}

/* ─── Architectural image block ─────────────────────────────
   Ready to swap gradient for a real <img> or CSS background-image.
   Simulates a concrete / modern building facade with CSS only.
─────────────────────────────────────────────────────────── */
function ArchBlock({ label }: { label: string }) {
  return (
    <div
      className="h-full w-full flex flex-col justify-between p-8 relative overflow-hidden"
      style={{
        background: `
          linear-gradient(160deg,
            #d0ccc6 0%,
            #b0ab a4 18%,
            #c8c4be 35%,
            #9a9690 52%,
            #bfbbb5 68%,
            #a8a49e 82%,
            #d4d0ca 100%
          )
        `,
      }}
    >
      {/* Concrete texture overlay */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(0,0,0,0.03) 3px,
            rgba(0,0,0,0.03) 4px
          )`,
        }}
      />
      <div />
      <div className="relative">
        <Pill on="dark">{label}</Pill>
      </div>
    </div>
  );
}

/* ─── Mosaic stat block ─────────────────────────────────────── */
function StatBlock({
  label,
  value,
  sub,
  bg = 'white',
  size = 'lg',
  icon: Icon,
}: {
  label: string;
  value: number;
  sub: string;
  bg?: 'white' | 'taupe' | 'dark';
  size?: 'lg' | 'md';
  icon?: React.ElementType;
}) {
  return (
    <div
      className="p-8 flex flex-col justify-between"
      style={
        bg === 'taupe' ? { background: 'hsl(var(--taupe))' }
        : bg === 'dark'  ? { background: 'hsl(var(--accent))' }
        : {}
      }
    >
      <div className="flex items-start justify-between">
        <Pill on={bg === 'dark' ? 'dark' : bg === 'taupe' ? 'taupe' : 'white'}>
          {label}
        </Pill>
        {Icon && (
          <Icon
            className={cn(
              'h-3.5 w-3.5 mt-0.5 shrink-0',
              bg === 'dark' ? 'text-white/30' : 'text-foreground/20',
            )}
          />
        )}
      </div>
      <div className="mt-6">
        <div
          className={cn(
            'font-title font-light leading-none tracking-tighter',
            size === 'lg' ? 'text-[86px]' : 'text-[68px]',
            bg === 'dark' ? 'text-white' : 'text-foreground',
          )}
        >
          {value}
        </div>
        <p
          className={cn(
            'text-[10px] uppercase tracking-[0.2em] mt-3',
            bg === 'dark' ? 'text-white/35' : 'text-muted-foreground',
          )}
        >
          {sub}
        </p>
      </div>
    </div>
  );
}

/* ─── Mobile mini stat ──────────────────────────────────────── */
function MiniStat({
  label, value, sub,
}: { label: string; value: number; sub: string }) {
  return (
    <div className="p-5 border-b border-r border-border bg-background last:border-r-0">
      <Pill>{ label }</Pill>
      <div className="font-title font-light text-[52px] leading-none tracking-tighter text-foreground mt-4">
        {value}
      </div>
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-2">{sub}</p>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'PLATFORM_ADMIN') navigate('/admin/platform', { replace: true });
  }, [user, navigate]);

  const { data: meetings = [] } = useMeetingsQuery();
  const { data: events   = [] } = useEventsQuery();
  const { data: houses   = [] } = useHousesQuery();
  const { data: users    = [] } = useUsersQuery();

  const today           = new Date().toISOString().split('T')[0];
  const upcomingMeet    = meetings.filter(m => m.date >= today);
  const upcomingEv      = events.filter(e => e.date >= today);
  const activeHouses    = houses.filter(h => h.status === 'active');
  const admins          = users.filter(u => ADMIN_ROLES.includes(u.role));
  const vecinos         = users.filter(u => u.role === 'RESIDENT');

  const barData = [
    { name: 'Reuniones', total: meetings.length, proximas: upcomingMeet.length },
    { name: 'Eventos',   total: events.length,   proximas: upcomingEv.length   },
  ];

  const upcoming = [
    ...upcomingMeet.map(m => ({ type: 'Reunión', title: m.title, date: m.date, time: m.startTime })),
    ...upcomingEv.map(e  => ({ type: 'Evento',   title: e.title, date: e.date, time: e.startTime })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 6);

  const todayLabel = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '0',
    fontSize: '11px',
    fontFamily: 'Inter',
  };

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-8">

        {/* ── Editorial header ────────────────────────────────── */}
        <div className="border-b border-border pb-6">
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-1.5 capitalize">
            {todayLabel}
          </p>
          <h1 className="font-title font-light text-5xl tracking-tight text-foreground">
            Dashboard
          </h1>
        </div>

        {/* ════════════════════════════════════════════════════════
            DESKTOP — BONJO-STYLE ASYMMETRIC MOSAIC
            3 cols: [1fr] [1.5fr] [1fr]
            Row 1 (tall):  Casas   | ArchBlock (r-span 2) | Reuniones
            Row 2 (tall):  Eventos | (arch cont.)          | Usuarios
            Row 3 (auto):  Upcoming (c-span 2)             | Chart
        ════════════════════════════════════════════════════════ */}
        <div className="hidden md:block border border-border overflow-hidden">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.5fr 1fr',
            }}
          >
            {/* R1 C1 — CASAS (white, large number) */}
            <div className="border-b border-r border-border" style={{ minHeight: 260 }}>
              <StatBlock
                label="Casas activas"
                value={activeHouses.length}
                sub={`de ${houses.length} en total`}
                bg="white"
                size="lg"
                icon={Home}
              />
            </div>

            {/* R1–2 C2 — ARCHITECTURAL IMAGE BLOCK */}
            <div
              className="border-b border-r border-border"
              style={{ gridRow: 'span 2', minHeight: 480 }}
            >
              <ArchBlock label={user?.condominiumId ? 'Fraccionamiento' : 'Niddo'} />
            </div>

            {/* R1 C3 — REUNIONES (white) */}
            <div className="border-b border-border" style={{ minHeight: 260 }}>
              <StatBlock
                label="Reuniones"
                value={meetings.length}
                sub={`${upcomingMeet.length} próximas`}
                bg="white"
                size="md"
                icon={Calendar}
              />
            </div>

            {/* R2 C1 — EVENTOS (taupe) */}
            <div className="border-b border-r border-border" style={{ minHeight: 220 }}>
              <StatBlock
                label="Eventos"
                value={events.length}
                sub={`${upcomingEv.length} próximos`}
                bg="taupe"
                size="md"
                icon={TreePine}
              />
            </div>

            {/* R2 C3 — USUARIOS (dark indigo) */}
            <div className="border-b border-border" style={{ minHeight: 220 }}>
              <StatBlock
                label="Usuarios"
                value={users.length}
                sub={`${admins.length} admin · ${vecinos.length} vecinos`}
                bg="dark"
                size="md"
                icon={Users}
              />
            </div>

            {/* R3 C1–2 — UPCOMING LIST (taupe light, spans 2 cols) */}
            <div
              className="border-r border-border p-8"
              style={{
                gridColumn: 'span 2',
                background: 'hsl(var(--taupe) / 0.35)',
                minHeight: 220,
              }}
            >
              <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/40 mb-7">
                Próximas actividades
              </p>
              {upcoming.length === 0 ? (
                <p className="font-title font-light text-2xl text-foreground/30">
                  Sin actividades próximas
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-x-12 gap-y-5">
                  {upcoming.map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <span className="font-title font-light text-3xl leading-none text-foreground/15 tabular-nums shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-medium text-foreground leading-tight truncate">
                          {item.title}
                        </p>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
                          {item.type} · {item.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* R3 C3 — ACTIVITY CHART (white) */}
            <div className="p-8 bg-background">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6 flex items-center gap-2">
                <TrendingUp className="h-3 w-3" /> Actividad
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={barData} barGap={3}>
                  <CartesianGrid
                    strokeDasharray="2 6"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    fontSize={9}
                    axisLine={false}
                    tickLine={false}
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontFamily: 'Inter', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    fontSize={9}
                    axisLine={false}
                    tickLine={false}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--border) / 0.4)' }} />
                  <Bar dataKey="total"    name="Total"    fill="hsl(var(--foreground))" radius={0} maxBarSize={36} />
                  <Bar dataKey="proximas" name="Próximas" fill="hsl(var(--primary))"    radius={0} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            MOBILE — stacked stat tiles
        ════════════════════════════════════════════════════════ */}
        <div className="md:hidden border border-border overflow-hidden">
          <div className="grid grid-cols-2">
            <MiniStat label="Casas activas" value={activeHouses.length} sub={`de ${houses.length} total`} />
            <MiniStat label="Reuniones"     value={meetings.length}     sub={`${upcomingMeet.length} próximas`} />
            <MiniStat label="Eventos"       value={events.length}       sub={`${upcomingEv.length} próximos`} />
            <MiniStat label="Usuarios"      value={users.length}        sub={`${admins.length} admin`} />
          </div>

          {/* Mobile upcoming */}
          <div
            className="border-t border-border p-5"
            style={{ background: 'hsl(var(--taupe) / 0.35)' }}
          >
            <p className="text-[10px] uppercase tracking-[0.22em] text-foreground/40 mb-5">
              Próximas actividades
            </p>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin actividades próximas</p>
            ) : (
              <div className="space-y-4">
                {upcoming.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="font-title font-light text-xl leading-none text-foreground/15 shrink-0 tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-tight">{item.title}</p>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">
                        {item.type} · {item.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
