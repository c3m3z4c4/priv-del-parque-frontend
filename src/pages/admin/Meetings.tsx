import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { TenantGuard } from '@/components/TenantGuard';
import { MeetingFormDialog } from '@/components/admin/MeetingFormDialog';
import { DeleteMeetingDialog } from '@/components/admin/DeleteMeetingDialog';
import { DataTable } from '@/components/admin/DataTable';
import { exportToCSV } from '@/lib/exportCSV';
import { useMeetingsQuery, useCreateMeeting, useUpdateMeeting, useDeleteMeeting } from '@/hooks/useApi';
import { Meeting } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Calendar, MapPin, Clock, Search, Download } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { RsvpCount } from '@/components/RsvpButtons';

export default function AdminMeetings() {
  const { data: meetings = [], isLoading } = useMeetingsQuery();
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();
  const deleteMeeting = useDeleteMeeting();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  const handleCreate = () => { setSelectedMeeting(null); setFormOpen(true); };
  const handleEdit = (meeting: Meeting) => { setSelectedMeeting(meeting); setFormOpen(true); };
  const handleDelete = (meeting: Meeting) => { setSelectedMeeting(meeting); setDeleteOpen(true); };

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    try {
      if (selectedMeeting) {
        await updateMeeting.mutateAsync({ id: selectedMeeting.id, data });
        toast({ title: 'Reunión actualizada', description: `"${data.title}" se actualizó correctamente.` });
      } else {
        await createMeeting.mutateAsync(data as Parameters<typeof createMeeting.mutateAsync>[0]);
        toast({ title: 'Reunión creada', description: `"${data.title}" se creó correctamente.` });
      }
      setFormOpen(false);
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la reunión.', variant: 'destructive' });
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedMeeting) {
      try {
        await deleteMeeting.mutateAsync(selectedMeeting.id);
        toast({ title: 'Reunión eliminada', description: `"${selectedMeeting.title}" fue eliminada.`, variant: 'destructive' });
        setDeleteOpen(false);
        setSelectedMeeting(null);
      } catch {
        toast({ title: 'Error', description: 'No se pudo eliminar la reunión.', variant: 'destructive' });
      }
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...meetings]
      .filter(m => {
        if (q && !m.title.toLowerCase().includes(q) && !m.location.toLowerCase().includes(q)) return false;
        if (statusFilter === 'upcoming' && isPast(parseISO(m.date))) return false;
        if (statusFilter === 'past' && !isPast(parseISO(m.date))) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [meetings, search, statusFilter]);

  const columns = useMemo<ColumnDef<Meeting>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Título',
      cell: ({ row }) => (
        <span className="font-medium max-w-[200px] truncate block">{row.original.title}</span>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Fecha',
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          {format(parseISO(row.original.date), 'dd MMM yyyy', { locale: es })}
        </span>
      ),
    },
    {
      accessorKey: 'startTime',
      header: 'Hora',
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {row.original.startTime}
        </span>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Ubicación',
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          {row.original.location}
        </span>
      ),
      meta: { className: 'hidden md:table-cell', headerClassName: 'hidden md:table-cell' },
    },
    {
      id: 'estado',
      header: 'Estado',
      enableSorting: false,
      cell: ({ row }) => {
        const past = isPast(parseISO(row.original.date));
        return <Badge variant={past ? 'secondary' : 'default'}>{past ? 'Pasada' : 'Próxima'}</Badge>;
      },
    },
    {
      id: 'rsvp',
      header: 'RSVP',
      enableSorting: false,
      cell: ({ row }) => <RsvpCount targetType="meeting" targetId={row.original.id} />,
      meta: { className: 'hidden sm:table-cell', headerClassName: 'hidden sm:table-cell' },
    },
    {
      id: 'acciones',
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original)} title="Eliminar" className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <AdminLayout>
      <TenantGuard>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Gestión de Reuniones</h1>
            <p className="text-muted-foreground">
              {meetings.length} {meetings.length === 1 ? 'reunión registrada' : 'reuniones registradas'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => exportToCSV(filtered, [
              { key: 'title', header: 'Título' }, { key: 'date', header: 'Fecha' },
              { key: 'startTime', header: 'Hora' }, { key: 'location', header: 'Ubicación' },
              { key: 'description', header: 'Descripción' },
            ], 'reuniones')} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Nueva Reunión
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por título o ubicación..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="upcoming">Próximas</SelectItem>
              <SelectItem value="past">Pasadas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={filtered}
              isLoading={isLoading}
              emptyState={
                meetings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Calendar className="h-12 w-12 text-muted-foreground/40" />
                    <p className="mt-4 text-lg font-medium">No hay reuniones</p>
                    <p className="text-sm text-muted-foreground">Crea tu primera reunión vecinal</p>
                    <Button onClick={handleCreate} className="mt-4 gap-2" variant="outline">
                      <Plus className="h-4 w-4" /> Crear reunión
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Search className="h-10 w-10 text-muted-foreground/40" />
                    <p className="mt-3 text-sm text-muted-foreground">No se encontraron resultados</p>
                  </div>
                )
              }
            />
          </CardContent>
        </Card>
      </div>

      <MeetingFormDialog key={selectedMeeting?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} meeting={selectedMeeting} onSubmit={handleFormSubmit} />
      <DeleteMeetingDialog open={deleteOpen} onOpenChange={setDeleteOpen} meeting={selectedMeeting} onConfirm={handleConfirmDelete} />
      </TenantGuard>
    </AdminLayout>
  );
}
