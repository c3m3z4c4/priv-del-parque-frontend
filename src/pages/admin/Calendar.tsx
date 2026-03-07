import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { useMeetings, useEvents } from '@/hooks/useDataStore';
import { EventFormDialog } from '@/components/admin/EventFormDialog';
import { MeetingFormDialog } from '@/components/admin/MeetingFormDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon, TreePine, Clock, MapPin, ChevronLeft, ChevronRight, Plus,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay,
  addMonths, subMonths, startOfWeek, endOfWeek, isToday,
  addWeeks, subWeeks, addYears, subYears, startOfYear, eachMonthOfInterval,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Meeting, GreenAreaEvent } from '@/types';
import { useToast } from '@/hooks/use-toast';

type CalendarItem =
  | { type: 'meeting'; data: Meeting }
  | { type: 'event'; data: GreenAreaEvent };

type ViewMode = 'monthly' | 'weekly' | 'annual';

export default function AdminCalendar() {
  const { meetings, addMeeting } = useMeetings();
  const { events, addEvent } = useEvents();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentYear, setCurrentYear] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [meetingFormOpen, setMeetingFormOpen] = useState(false);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    meetings.forEach(m => {
      const key = m.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ type: 'meeting', data: m });
    });
    events.forEach(e => {
      const key = e.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ type: 'event', data: e });
    });
    return map;
  }, [meetings, events]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const weekDays = useMemo(() => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
  }, [currentWeekStart]);

  const yearMonths = useMemo(() => {
    const yearStart = startOfYear(currentYear);
    return eachMonthOfInterval({ start: yearStart, end: new Date(currentYear.getFullYear(), 11, 1) });
  }, [currentYear]);

  const selectedItems = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return itemsByDate.get(key) || [];
  }, [selectedDate, itemsByDate]);

  const weekDayLabels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

  const handleCreateEvent = async (data: { title: string; greenArea: string; date: string; startTime: string; endTime?: string; description?: string }) => {
    try {
      await addEvent(data);
      toast({ title: 'Evento creado', description: `"${data.title}" se creo correctamente.` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'No se pudo crear el evento.', variant: 'destructive' });
    }
  };

  const handleCreateMeeting = async (data: { title: string; location: string; date: string; startTime: string; endTime?: string; description?: string }) => {
    try {
      await addMeeting(data);
      toast({ title: 'Reunion creada', description: `"${data.title}" se creo correctamente.` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'No se pudo crear la reunion.', variant: 'destructive' });
    }
  };

  const renderDayDetail = () => (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {selectedDate
            ? format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })
            : 'Selecciona un dia'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selectedDate && (
          <div className="flex gap-2 mb-4">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEventFormOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Evento
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setMeetingFormOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Reunion
            </Button>
          </div>
        )}
        {selectedItems.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-muted-foreground">
            <CalendarIcon className="mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm">Sin actividades este dia</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedItems.map(item => (
              <div
                key={`${item.type}-${item.data.id}`}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  item.type === 'meeting' ? "border-primary/20 bg-primary/5" : "border-accent/20 bg-accent/5"
                )}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <Badge variant={item.type === 'meeting' ? 'default' : 'secondary'} className="text-[10px]">
                    {item.type === 'meeting' ? 'Reunion' : 'Evento'}
                  </Badge>
                </div>
                <h4 className="font-medium text-sm">{item.data.title}</h4>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {item.data.startTime} hrs
                    {item.data.endTime && ` - ${item.data.endTime} hrs`}
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
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {item.data.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderMonthlyView = () => (
    <Card className="shadow-card lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="font-serif text-xl capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 mb-1">
          {weekDayLabels.map(day => (
            <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const items = itemsByDate.get(dateKey) || [];
            const hasMeetings = items.some(i => i.type === 'meeting');
            const hasEvents = items.some(i => i.type === 'event');
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-lg p-1.5 transition-colors min-h-[3.5rem] md:min-h-[4rem]",
                  isCurrentMonth ? "text-foreground" : "text-muted-foreground/40",
                  isSelected && "bg-primary/10 ring-2 ring-primary",
                  !isSelected && "hover:bg-muted",
                  today && !isSelected && "bg-accent/20"
                )}
              >
                <span className={cn("text-sm font-medium", today && "text-primary font-bold")}>
                  {format(day, 'd')}
                </span>
                {items.length > 0 && (
                  <div className="flex gap-0.5">
                    {hasMeetings && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    {hasEvents && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
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
  );

  const renderWeeklyView = () => (
    <Card className="shadow-card lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(prev => subWeeks(prev, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="font-serif text-lg">
            {format(currentWeekStart, "d MMM", { locale: es })} — {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "d MMM yyyy", { locale: es })}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(prev => addWeeks(prev, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const items = itemsByDate.get(dateKey) || [];
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const today = isToday(day);

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex flex-col rounded-lg border p-2 transition-colors min-h-[8rem]",
                  isSelected && "ring-2 ring-primary bg-primary/5",
                  !isSelected && "hover:bg-muted",
                  today && !isSelected && "bg-accent/10 border-accent/30"
                )}
              >
                <div className="text-center mb-2">
                  <div className="text-xs text-muted-foreground capitalize">
                    {format(day, 'EEE', { locale: es })}
                  </div>
                  <div className={cn("text-lg font-medium", today && "text-primary font-bold")}>
                    {format(day, 'd')}
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  {items.map(item => (
                    <div
                      key={`${item.type}-${item.data.id}`}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] truncate",
                        item.type === 'meeting' ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                      )}
                    >
                      {item.data.startTime} {item.data.title}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderAnnualView = () => (
    <Card className="shadow-card lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setCurrentYear(prev => subYears(prev, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="font-serif text-xl">{format(currentYear, 'yyyy')}</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setCurrentYear(prev => addYears(prev, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {yearMonths.map(month => {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);
            const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
            const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
            const days = eachDayOfInterval({ start: calStart, end: calEnd });

            return (
              <div key={month.toISOString()} className="border rounded-lg p-2">
                <h3 className="text-sm font-medium text-center mb-1 capitalize">
                  {format(month, 'MMMM', { locale: es })}
                </h3>
                <div className="grid grid-cols-7 gap-px text-[9px]">
                  {weekDayLabels.map(d => (
                    <div key={d} className="text-center text-muted-foreground font-medium py-0.5">{d[0]}</div>
                  ))}
                  {days.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const items = itemsByDate.get(dateKey) || [];
                    const hasMeetings = items.some(i => i.type === 'meeting');
                    const hasEvents = items.some(i => i.type === 'event');
                    const inMonth = isSameMonth(day, month);
                    const today = isToday(day);

                    return (
                      <button
                        key={dateKey}
                        onClick={() => { setSelectedDate(day); setViewMode('monthly'); setCurrentMonth(month); }}
                        className={cn(
                          "relative flex flex-col items-center rounded py-0.5",
                          !inMonth && "text-muted-foreground/20",
                          inMonth && "text-foreground",
                          today && "font-bold text-primary"
                        )}
                      >
                        <span>{format(day, 'd')}</span>
                        {items.length > 0 && inMonth && (
                          <div className="flex gap-px">
                            {hasMeetings && <span className="h-1 w-1 rounded-full bg-primary" />}
                            {hasEvents && <span className="h-1 w-1 rounded-full bg-accent" />}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Calendario</h1>
            <p className="mt-1 text-muted-foreground">Vista de reuniones y eventos</p>
          </div>
          <div className="flex gap-1 rounded-lg border p-1">
            {(['monthly', 'weekly', 'annual'] as ViewMode[]).map(mode => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(mode)}
              >
                {mode === 'monthly' ? 'Mensual' : mode === 'weekly' ? 'Semanal' : 'Anual'}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {viewMode === 'monthly' && renderMonthlyView()}
          {viewMode === 'weekly' && renderWeeklyView()}
          {viewMode === 'annual' && renderAnnualView()}

          <div className="space-y-4">
            {renderDayDetail()}
          </div>
        </div>
      </div>

      <EventFormDialog
        key={`event-${selectedDate?.toISOString() ?? 'new'}`}
        open={eventFormOpen}
        onOpenChange={setEventFormOpen}
        onSubmit={handleCreateEvent}
        defaultDate={selectedDate || undefined}
      />
      <MeetingFormDialog
        key={`meeting-${selectedDate?.toISOString() ?? 'new'}`}
        open={meetingFormOpen}
        onOpenChange={setMeetingFormOpen}
        onSubmit={handleCreateMeeting}
        defaultDate={selectedDate || undefined}
      />
    </AdminLayout>
  );
}
