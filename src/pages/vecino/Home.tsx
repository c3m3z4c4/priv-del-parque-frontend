import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { VecinoLayout } from '@/components/layouts/VecinoLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useMeetings, useEvents } from '@/hooks/useDataStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  DollarSign, ClipboardList, Clock, MapPin, TreePine,
  ChevronLeft, ChevronRight, ArrowRight, AlertCircle, CheckCircle2,
} from 'lucide-react';
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek,
  isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { duesApi, projectsApi } from '@/lib/api';
import type { Meeting, GreenAreaEvent, ProjectStatus } from '@/types';
import { RsvpButtons } from '@/components/RsvpButtons';

const STATUS_LABEL: Record<ProjectStatus, string> = {
  planned:   'Planeado',
  started:   'Iniciado',
  in_review: 'En Revisión',
  completed: 'Terminado',
  paused:    'En Pausa',
};
const STATUS_BADGE: Record<ProjectStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  planned:   'secondary',
  started:   'default',
  in_review: 'outline',
  completed: 'default',
  paused:    'destructive',
};

type CalendarItem =
  | { type: 'meeting'; data: Meeting }
  | { type: 'event'; data: GreenAreaEvent };

const WEEK_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function VecinoHome() {
  const { user } = useAuth();
  const { meetings } = useMeetings();
  const { events } = useEvents();

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // ─── Cuotas ───────────────────────────────────────────────────────────────
  const { data: dues = [] } = useQuery({
    queryKey: ['dues'],
    queryFn: duesApi.getAll,
  });

  const thisMonthDue = dues.find(
    (d) => d.month === currentMonth && d.year === currentYear,
  );
  const pendingCount = dues.filter((d) => d.status === 'pending').length;

  // ─── Proyectos ────────────────────────────────────────────────────────────
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  });

  // ─── Calendario ───────────────────────────────────────────────────────────
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    meetings.forEach((m) => {
      if (!map.has(m.date)) map.set(m.date, []);
      map.get(m.date)!.push({ type: 'meeting', data: m });
    });
    events.forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push({ type: 'event', data: e });
    });
    return map;
  }, [meetings, events]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(calMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [calMonth]);

  const selectedItems = useMemo(() => {
    if (!selectedDate) return [];
    return itemsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || [];
  }, [selectedDate, itemsByDate]);

  return (
    <VecinoLayout>
      <div className="space-y-8">

        {/* Welcome */}
        <div className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-8 text-primary-foreground shadow-lg">
          <h1 className="font-serif text-3xl font-bold md:text-4xl">
            ¡Bienvenido, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="mt-2 text-primary-foreground/90">
            Mantente al día con tu comunidad
          </p>
        </div>

        {/* ─── Cuotas ─────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold">Mis Cuotas</h2>
            <Link to="/cuotas">
              <Button variant="ghost" size="sm" className="gap-1">
                Ver todo <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Mes actual */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cuota {format(today, 'MMMM yyyy', { locale: es })}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {thisMonthDue ? (
                  <>
                    <div className="text-2xl font-bold">
                      ${Number(thisMonthDue.amount).toFixed(2)}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm">
                      {thisMonthDue.status === 'paid' && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" /> Pagada
                        </span>
                      )}
                      {thisMonthDue.status === 'pending' && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertCircle className="h-4 w-4" /> Pendiente de pago
                        </span>
                      )}
                      {thisMonthDue.status === 'exempt' && (
                        <span className="text-muted-foreground">Exenta</span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin cuota generada</p>
                )}
              </CardContent>
            </Card>

            {/* Pendientes totales */}
            <Card className={pendingCount > 0 ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30' : ''}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cuotas pendientes
                </CardTitle>
                <AlertCircle className={cn('h-4 w-4', pendingCount > 0 ? 'text-amber-500' : 'text-muted-foreground')} />
              </CardHeader>
              <CardContent>
                <div className={cn('text-2xl font-bold', pendingCount > 0 ? 'text-amber-600 dark:text-amber-400' : '')}>
                  {pendingCount}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pendingCount === 0 ? '¡Estás al corriente!' : `${pendingCount} cuota${pendingCount > 1 ? 's' : ''} sin pagar`}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ─── Proyectos del año ───────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold">Proyectos del Año</h2>
            <Link to="/proyectos">
              <Button variant="ghost" size="sm" className="gap-1">
                Ver todo <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">Sin proyectos publicados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card key={project.id} className="flex flex-col gap-0">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold leading-snug">
                        {project.name}
                      </CardTitle>
                      <Badge variant={STATUS_BADGE[project.status]} className="shrink-0 text-xs">
                        {STATUS_LABEL[project.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Avance</span>
                        <span className="font-medium">{project.completionPercentage}%</span>
                      </div>
                      <Progress value={project.completionPercentage} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ─── Calendario mensual ──────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold">Agenda del Mes</h2>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Calendario */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCalMonth((m) => subMonths(m, 1))}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <CardTitle className="font-serif text-lg capitalize">
                    {format(calMonth, 'MMMM yyyy', { locale: es })}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCalMonth((m) => addMonths(m, 1))}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Headers días */}
                <div className="grid grid-cols-7 mb-1">
                  {WEEK_LABELS.map((d) => (
                    <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
                      {d}
                    </div>
                  ))}
                </div>
                {/* Días */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((day) => {
                    const key = format(day, 'yyyy-MM-dd');
                    const items = itemsByDate.get(key) || [];
                    const hasMeetings = items.some((i) => i.type === 'meeting');
                    const hasEvents = items.some((i) => i.type === 'event');
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const inMonth = isSameMonth(day, calMonth);
                    const todayDay = isToday(day);

                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          'relative flex min-h-[3.5rem] flex-col items-center gap-0.5 rounded-lg p-1.5 transition-colors',
                          inMonth ? 'text-foreground' : 'text-muted-foreground/30',
                          isSelected && 'bg-primary/10 ring-2 ring-primary',
                          !isSelected && 'hover:bg-muted',
                          todayDay && !isSelected && 'bg-accent/20',
                        )}
                      >
                        <span className={cn('text-sm font-medium', todayDay && 'font-bold text-primary')}>
                          {format(day, 'd')}
                        </span>
                        {items.length > 0 && inMonth && (
                          <div className="flex gap-0.5">
                            {hasMeetings && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                            {hasEvents && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Leyenda */}
                <div className="mt-4 flex items-center gap-4 border-t pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Reuniones
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-accent" /> Eventos
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Panel del día seleccionado */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {selectedDate
                    ? format(selectedDate, "d 'de' MMMM", { locale: es })
                    : 'Selecciona un día'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedItems.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-muted-foreground">
                    <ClipboardList className="mb-2 h-8 w-8 opacity-40" />
                    <p className="text-sm">Sin actividades este día</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedItems.map((item) => (
                      <div
                        key={`${item.type}-${item.data.id}`}
                        className={cn(
                          'rounded-lg border p-3',
                          item.type === 'meeting'
                            ? 'border-primary/20 bg-primary/5'
                            : 'border-accent/20 bg-accent/5',
                        )}
                      >
                        <div className="mb-1.5">
                          <Badge
                            variant={item.type === 'meeting' ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
                            {item.type === 'meeting' ? 'Reunión' : 'Evento'}
                          </Badge>
                        </div>
                        <h4 className="text-sm font-medium">{item.data.title}</h4>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {item.data.startTime} hrs
                            {item.data.endTime && ` – ${item.data.endTime} hrs`}
                          </div>
                          {item.type === 'meeting' && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {(item.data as Meeting).location}
                            </div>
                          )}
                          {item.type === 'event' && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <TreePine className="h-3 w-3" />
                              {(item.data as GreenAreaEvent).greenArea}
                            </div>
                          )}
                        </div>
                        {item.data.description && (
                          <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {item.data.description}
                          </p>
                        )}
                        <div className="mt-3 border-t pt-2">
                          <RsvpButtons targetType={item.type} targetId={item.data.id} compact />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

      </div>
    </VecinoLayout>
  );
}
