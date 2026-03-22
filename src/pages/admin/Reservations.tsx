import { useState } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsApi } from '@/lib/api';
import { GreenAreaReservation } from '@/types';
import { CheckCircle2, XCircle, Clock, Search, TreePine, Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function statusBadge(status: GreenAreaReservation['status']) {
  switch (status) {
    case 'pending':   return <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50">Pendiente</Badge>;
    case 'approved':  return <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">Aprobada</Badge>;
    case 'rejected':  return <Badge variant="outline" className="border-red-400 text-red-600 bg-red-50">Rechazada</Badge>;
    case 'cancelled': return <Badge variant="outline" className="text-muted-foreground">Cancelada</Badge>;
  }
}

function formatDate(d: string) {
  try { return format(new Date(d + 'T12:00:00'), "dd/MM/yyyy", { locale: es }); }
  catch { return d; }
}

function formatDateTime(d: string) {
  try { return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: es }); }
  catch { return d; }
}

export default function AdminReservations() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<GreenAreaReservation | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: reservationsApi.getAll,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, adminNotes }: { id: string; status: 'approved' | 'rejected'; adminNotes?: string }) =>
      reservationsApi.review(id, { status, adminNotes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      toast({ title: reviewStatus === 'approved' ? 'Solicitud aprobada' : 'Solicitud rechazada' });
      setSelected(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const handleReview = () => {
    if (!selected) return;
    reviewMutation.mutate({ id: selected.id, status: reviewStatus, adminNotes: reviewNotes || undefined });
  };

  const pending   = reservations.filter(r => r.status === 'pending');
  const reviewed  = reservations.filter(r => r.status !== 'pending');

  const filterRows = (rows: GreenAreaReservation[]) => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.greenArea.toLowerCase().includes(q) ||
      `${r.user?.name} ${r.user?.lastName}`.toLowerCase().includes(q) ||
      r.user?.email.toLowerCase().includes(q)
    );
  };

  const renderTable = (rows: GreenAreaReservation[], showActions = false) => (
    rows.length === 0 ? (
      <div className="flex flex-col items-center py-12 gap-2 text-muted-foreground">
        <TreePine className="h-8 w-8 opacity-40" />
        <p className="text-sm">No hay solicitudes</p>
      </div>
    ) : (
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vecino</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Horario</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Solicitud</TableHead>
              {showActions && <TableHead className="w-24">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{r.user?.name} {r.user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{r.user?.email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{r.greenArea}</TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    {r.description && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{r.description}</p>}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{formatDate(r.date)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.startTime}{r.endTime ? ` – ${r.endTime}` : ''}
                </TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                {showActions && (
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => { setSelected(r); setReviewNotes(''); setReviewStatus('approved'); }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Revisar
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  );

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reservaciones Área Verde</h1>
            <p className="text-muted-foreground text-sm">Gestiona las solicitudes de los vecinos</p>
          </div>
          {pending.length > 0 && (
            <Badge className="bg-amber-500 text-white px-3 py-1 text-sm">
              {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por vecino, área o evento..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" />
                Pendientes
                {pending.length > 0 && (
                  <span className="ml-1 rounded-full bg-amber-500 text-white text-xs px-1.5 py-0.5 leading-none">
                    {pending.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="reviewed" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Revisadas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {renderTable(filterRows(pending), true)}
            </TabsContent>
            <TabsContent value="reviewed" className="mt-4">
              {renderTable(filterRows(reviewed), false)}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Revisar Solicitud</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 pt-2">
              {/* Request details */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-4 space-y-1.5">
                  <div className="flex justify-between">
                    <p className="font-semibold">{selected.title}</p>
                    <span className="text-sm text-muted-foreground">{selected.greenArea}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selected.user?.name} {selected.user?.lastName} — {selected.user?.email}
                  </p>
                  <p className="text-sm">
                    {formatDate(selected.date)} · {selected.startTime}{selected.endTime ? ` – ${selected.endTime}` : ''}
                  </p>
                  {selected.description && (
                    <p className="text-sm text-muted-foreground italic">{selected.description}</p>
                  )}
                </CardContent>
              </Card>

              {/* Decision */}
              <div className="space-y-1.5">
                <Label>Decisión *</Label>
                <Select value={reviewStatus} onValueChange={v => setReviewStatus(v as 'approved' | 'rejected')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">
                      <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Aprobar</span>
                    </SelectItem>
                    <SelectItem value="rejected">
                      <span className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" /> Rechazar</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Anotaciones / Notas</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Instrucciones, condiciones, motivo de rechazo..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
                <Button
                  onClick={handleReview}
                  disabled={reviewMutation.isPending}
                  className={reviewStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  {reviewMutation.isPending
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                    : reviewStatus === 'approved' ? 'Aprobar solicitud' : 'Rechazar solicitud'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
