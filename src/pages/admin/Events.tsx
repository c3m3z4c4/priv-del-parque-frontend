import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { EventFormDialog } from '@/components/admin/EventFormDialog';
import { DeleteEventDialog } from '@/components/admin/DeleteEventDialog';
import { TablePagination, paginate } from '@/components/admin/TablePagination';
import { exportToCSV } from '@/lib/exportCSV';
import { useEvents } from '@/hooks/useDataStore';
import { GreenAreaEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, TreePine, Calendar, Clock, MapPin, Loader2, Search, Download, Users, Ban, CalendarClock } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { greenAreas } from '@/data/mockData';
import { RsvpCount } from '@/components/RsvpButtons';
import { AttendanceDialog } from '@/components/admin/AttendanceDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CancelDialog } from '@/components/admin/CancelDialog';
import { PostponeDialog } from '@/components/admin/PostponeDialog';

export default function AdminEvents() {
  const { events, isLoading, addEvent, updateEvent, deleteEvent, cancelEvent, postponeEvent } = useEvents();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [postponeOpen, setPostponeOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GreenAreaEvent | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleCreate = () => { setSelectedEvent(null); setFormOpen(true); };
  const handleEdit = (ev: GreenAreaEvent) => { setSelectedEvent(ev); setFormOpen(true); };
  const handleDelete = (ev: GreenAreaEvent) => { setSelectedEvent(ev); setDeleteOpen(true); };
  const handleAttendance = (ev: GreenAreaEvent) => { setSelectedEvent(ev); setAttendanceOpen(true); };
  const handleCancel = (ev: GreenAreaEvent) => { setSelectedEvent(ev); setCancelOpen(true); };
  const handlePostpone = (ev: GreenAreaEvent) => { setSelectedEvent(ev); setPostponeOpen(true); };

  const handleConfirmCancel = async (reason?: string) => {
    if (!selectedEvent) return;
    try {
      await cancelEvent(selectedEvent.id, reason);
      toast({ title: 'Evento cancelado', description: `"${selectedEvent.title}" fue cancelado.` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'No se pudo cancelar.', variant: 'destructive' });
      throw e;
    }
  };

  const handleConfirmPostpone = async (data: { date: string; startTime: string; endTime?: string }) => {
    if (!selectedEvent) return;
    try {
      await postponeEvent(selectedEvent.id, data);
      toast({ title: 'Evento pospuesto', description: `"${selectedEvent.title}" fue reprogramado.` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'No se pudo posponer.', variant: 'destructive' });
      throw e;
    }
  };

  const handleFormSubmit = async (data: { title: string; greenArea: string; date: string; startTime: string; endTime?: string; description?: string }) => {
    try {
      if (selectedEvent) {
        await updateEvent(selectedEvent.id, data);
        toast({ title: 'Evento actualizado', description: `"${data.title}" se actualizó correctamente.` });
      } else {
        await addEvent(data);
        toast({ title: 'Evento creado', description: `"${data.title}" se creó correctamente.` });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'No se pudo guardar el evento.', variant: 'destructive' });
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedEvent) {
      try {
        await deleteEvent(selectedEvent.id);
        toast({ title: 'Evento eliminado', description: `"${selectedEvent.title}" fue eliminado.`, variant: 'destructive' });
        setDeleteOpen(false);
        setSelectedEvent(null);
      } catch (e: any) {
        toast({ title: 'Error', description: e.message || 'No se pudo eliminar el evento.', variant: 'destructive' });
      }
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...events]
      .filter(e => {
        if (q && !e.title.toLowerCase().includes(q) && !e.greenArea.toLowerCase().includes(q)) return false;
        if (statusFilter === 'upcoming' && isPast(parseISO(e.date))) return false;
        if (statusFilter === 'past' && !isPast(parseISO(e.date))) return false;
        if (areaFilter !== 'all' && e.greenArea !== areaFilter) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [events, search, statusFilter, areaFilter]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Gestión de Eventos</h1>
            <p className="text-muted-foreground">
              {events.length} {events.length === 1 ? 'evento registrado' : 'eventos registrados'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => exportToCSV(filtered, [
              { key: 'title', header: 'Título' }, { key: 'greenArea', header: 'Área Verde' },
              { key: 'date', header: 'Fecha' }, { key: 'startTime', header: 'Hora' },
              { key: 'description', header: 'Descripción' },
            ], 'eventos')} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Nuevo Evento
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por título o área verde..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las áreas</SelectItem>
              {greenAreas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="upcoming">Próximos</SelectItem>
              <SelectItem value="past">Pasados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <TreePine className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-lg font-medium">No hay eventos</p>
                <p className="text-sm text-muted-foreground">Crea tu primer evento en área verde</p>
                <Button onClick={handleCreate} className="mt-4 gap-2" variant="outline">
                  <Plus className="h-4 w-4" /> Crear evento
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Search className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">No se encontraron resultados</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Área Verde</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>RSVP</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginate(filtered, page, pageSize).map((ev) => {
                        const evDate = parseISO(ev.date);
                        const past = isPast(evDate);
                        return (
                          <TableRow key={ev.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">{ev.title}</TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />{ev.greenArea}
                              </span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                {format(evDate, 'dd MMM yyyy', { locale: es })}
                              </span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />{ev.startTime}
                              </span>
                            </TableCell>
                            <TableCell>
                              {ev.status === 'cancelled' ? (
                                <Badge variant="destructive">Cancelado</Badge>
                              ) : ev.status === 'postponed' ? (
                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pospuesto</Badge>
                              ) : (
                                <Badge variant={past ? 'secondary' : 'default'}>{past ? 'Pasado' : 'Próximo'}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <RsvpCount targetType="event" targetId={ev.id} />
                            </TableCell>
                            <TableCell className="text-right">
                              <TooltipProvider>
                                <div className="flex justify-end gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => handleAttendance(ev)} title="Ver asistencia">
                                        <Users className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Ver asistencia</TooltipContent>
                                  </Tooltip>
                                  {ev.status !== 'cancelled' && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handlePostpone(ev)} title="Posponer">
                                          <CalendarClock className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Posponer</TooltipContent>
                                    </Tooltip>
                                  )}
                                  {ev.status !== 'cancelled' && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleCancel(ev)} title="Cancelar" className="text-amber-600 hover:text-amber-700">
                                          <Ban className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Cancelar evento</TooltipContent>
                                    </Tooltip>
                                  )}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => handleEdit(ev)} title="Editar">
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Editar</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => handleDelete(ev)} title="Eliminar" className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Eliminar</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination totalItems={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <EventFormDialog key={selectedEvent?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} event={selectedEvent} onSubmit={handleFormSubmit} />
      <DeleteEventDialog open={deleteOpen} onOpenChange={setDeleteOpen} event={selectedEvent} onConfirm={handleConfirmDelete} />
      <AttendanceDialog
        open={attendanceOpen}
        onOpenChange={setAttendanceOpen}
        targetType="event"
        targetId={selectedEvent?.id ?? ''}
        targetTitle={selectedEvent?.title ?? ''}
      />
      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={selectedEvent?.title ?? ''}
        onConfirm={handleConfirmCancel}
      />
      <PostponeDialog
        open={postponeOpen}
        onOpenChange={setPostponeOpen}
        title={selectedEvent?.title ?? ''}
        currentDate={selectedEvent?.date}
        currentStartTime={selectedEvent?.startTime}
        currentEndTime={selectedEvent?.endTime}
        onConfirm={handleConfirmPostpone}
      />
    </AdminLayout>
  );
}
