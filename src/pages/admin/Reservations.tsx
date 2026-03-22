import { useState } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsApi } from '@/lib/api';
import { GreenAreaReservation } from '@/types';
import {
  CheckCircle2, XCircle, Clock, Search, TreePine, Loader2,
  MessageSquare, ClipboardCheck, DollarSign, AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function statusBadge(status: GreenAreaReservation['status']) {
  switch (status) {
    case 'pending':   return <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50">Pendiente</Badge>;
    case 'approved':  return <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">Aprobada</Badge>;
    case 'rejected':  return <Badge variant="outline" className="border-red-400 text-red-600 bg-red-50">Rechazada</Badge>;
    case 'cancelled': return <Badge variant="outline" className="text-muted-foreground">Cancelada</Badge>;
    case 'closed':    return <Badge variant="outline" className="border-blue-400 text-blue-700 bg-blue-50">Cerrada</Badge>;
  }
}

function formatDate(d: string) {
  try { return format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy', { locale: es }); }
  catch { return d; }
}

function formatDateTime(d: string) {
  try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: es }); }
  catch { return d; }
}

function isPast(dateStr: string) {
  return new Date(dateStr + 'T23:59:59') < new Date();
}

export default function AdminReservations() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  // Review dialog
  const [reviewTarget, setReviewTarget] = useState<GreenAreaReservation | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');

  // Closure dialog
  const [closeTarget, setCloseTarget] = useState<GreenAreaReservation | null>(null);
  const [closeBanos, setCloseBanos] = useState(false);
  const [closeInstalaciones, setCloseInstalaciones] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');
  const [closeCharge, setCloseCharge] = useState('');

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
      setReviewTarget(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) =>
      reservationsApi.close(id, {
        checklistBanos: closeBanos,
        checklistInstalaciones: closeInstalaciones,
        closureNotes: closeNotes || undefined,
        chargeAmount: closeCharge ? parseFloat(closeCharge) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      toast({ title: 'Evento cerrado', description: 'El cierre quedó registrado.' });
      setCloseTarget(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openCloseDialog = (r: GreenAreaReservation) => {
    setCloseTarget(r);
    setCloseBanos(false);
    setCloseInstalaciones(false);
    setCloseNotes('');
    setCloseCharge('');
  };

  const pending  = reservations.filter(r => r.status === 'pending');
  const approved = reservations.filter(r => r.status === 'approved');
  const rest     = reservations.filter(r => r.status !== 'pending' && r.status !== 'approved');

  const filterRows = (rows: GreenAreaReservation[]) => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.greenArea.toLowerCase().includes(q) ||
      `${r.user?.name} ${r.user?.lastName}`.toLowerCase().includes(q) ||
      (r.user?.email ?? '').toLowerCase().includes(q),
    );
  };

  const renderTable = (rows: GreenAreaReservation[], mode: 'pending' | 'approved' | 'history') => (
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
              <TableHead className="w-28">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>
                  <p className="font-medium text-sm">{r.user?.name} {r.user?.lastName}</p>
                  <p className="text-xs text-muted-foreground">{r.user?.email}</p>
                </TableCell>
                <TableCell className="text-sm">{r.greenArea}</TableCell>
                <TableCell>
                  <p className="text-sm font-medium">{r.title}</p>
                  {r.description && <p className="text-xs text-muted-foreground truncate max-w-[160px]">{r.description}</p>}
                </TableCell>
                <TableCell className="text-sm">{formatDate(r.date)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.startTime}{r.endTime ? ` – ${r.endTime}` : ''}
                </TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                <TableCell>
                  {mode === 'pending' && (
                    <Button size="sm" variant="outline" className="gap-1"
                      onClick={() => { setReviewTarget(r); setReviewNotes(''); setReviewStatus('approved'); }}>
                      <MessageSquare className="h-3.5 w-3.5" /> Revisar
                    </Button>
                  )}
                  {mode === 'approved' && isPast(r.date) && (
                    <Button size="sm" variant="outline" className="gap-1"
                      onClick={() => openCloseDialog(r)}>
                      <ClipboardCheck className="h-3.5 w-3.5" /> Cerrar
                    </Button>
                  )}
                  {mode === 'history' && r.status === 'closed' && (
                    <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground"
                      onClick={() => openCloseDialog(r)}>
                      <ClipboardCheck className="h-3.5 w-3.5" /> Ver cierre
                    </Button>
                  )}
                </TableCell>
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
                <Clock className="h-4 w-4" /> Pendientes
                {pending.length > 0 && (
                  <span className="ml-1 rounded-full bg-amber-500 text-white text-xs px-1.5 py-0.5 leading-none">{pending.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                <CheckCircle2 className="h-4 w-4" /> Aprobadas
                {approved.filter(r => isPast(r.date)).length > 0 && (
                  <span className="ml-1 rounded-full bg-blue-500 text-white text-xs px-1.5 py-0.5 leading-none">
                    {approved.filter(r => isPast(r.date)).length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <XCircle className="h-4 w-4" /> Historial
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">{renderTable(filterRows(pending), 'pending')}</TabsContent>
            <TabsContent value="approved" className="mt-4">{renderTable(filterRows(approved), 'approved')}</TabsContent>
            <TabsContent value="history" className="mt-4">{renderTable(filterRows(rest), 'history')}</TabsContent>
          </Tabs>
        )}
      </div>

      {/* ── Review Dialog ── */}
      <Dialog open={!!reviewTarget} onOpenChange={v => !v && setReviewTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Revisar Solicitud</DialogTitle></DialogHeader>
          {reviewTarget && (
            <div className="space-y-4 pt-2">
              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-4 space-y-1.5">
                  <div className="flex justify-between">
                    <p className="font-semibold">{reviewTarget.title}</p>
                    <span className="text-sm text-muted-foreground">{reviewTarget.greenArea}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{reviewTarget.user?.name} {reviewTarget.user?.lastName} — {reviewTarget.user?.email}</p>
                  <p className="text-sm">{formatDate(reviewTarget.date)} · {reviewTarget.startTime}{reviewTarget.endTime ? ` – ${reviewTarget.endTime}` : ''}</p>
                  {reviewTarget.description && <p className="text-sm text-muted-foreground italic">{reviewTarget.description}</p>}
                </CardContent>
              </Card>
              <div className="space-y-1.5">
                <Label>Decisión *</Label>
                <Select value={reviewStatus} onValueChange={v => setReviewStatus(v as 'approved' | 'rejected')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="approved"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Aprobar</span></SelectItem>
                    <SelectItem value="rejected"><span className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" /> Rechazar</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Anotaciones / Notas</Label>
                <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Instrucciones, condiciones, motivo de rechazo..." rows={3} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setReviewTarget(null)}>Cancelar</Button>
                <Button onClick={() => reviewMutation.mutate({ id: reviewTarget.id, status: reviewStatus, adminNotes: reviewNotes || undefined })}
                  disabled={reviewMutation.isPending}
                  className={reviewStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}>
                  {reviewMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : reviewStatus === 'approved' ? 'Aprobar' : 'Rechazar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Closure Dialog ── */}
      <Dialog open={!!closeTarget} onOpenChange={v => !v && setCloseTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              {closeTarget?.status === 'closed' ? 'Detalle de Cierre' : 'Cierre de Evento'}
            </DialogTitle>
          </DialogHeader>
          {closeTarget && (
            <div className="space-y-5 pt-2">
              {/* Event summary */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-4 space-y-1">
                  <p className="font-semibold">{closeTarget.title} <span className="font-normal text-muted-foreground">· {closeTarget.greenArea}</span></p>
                  <p className="text-sm text-muted-foreground">{closeTarget.user?.name} {closeTarget.user?.lastName}</p>
                  <p className="text-sm">{formatDate(closeTarget.date)} · {closeTarget.startTime}{closeTarget.endTime ? ` – ${closeTarget.endTime}` : ''}</p>
                </CardContent>
              </Card>

              {/* Checklist */}
              <div className="space-y-3">
                <p className="text-sm font-semibold">Checklist de entrega</p>
                <div className="space-y-3 pl-1">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="banos"
                      checked={closeTarget.status === 'closed' ? !!closeTarget.checklistBanos : closeBanos}
                      onCheckedChange={closeTarget.status !== 'closed' ? (v => setCloseBanos(!!v)) : undefined}
                      disabled={closeTarget.status === 'closed'}
                    />
                    <label htmlFor="banos" className="text-sm cursor-pointer">Baños entregados en orden</label>
                    {closeTarget.status === 'closed' && (
                      closeTarget.checklistBanos
                        ? <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                        : <XCircle className="h-4 w-4 text-red-500 ml-auto" />
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="instalaciones"
                      checked={closeTarget.status === 'closed' ? !!closeTarget.checklistInstalaciones : closeInstalaciones}
                      onCheckedChange={closeTarget.status !== 'closed' ? (v => setCloseInstalaciones(!!v)) : undefined}
                      disabled={closeTarget.status === 'closed'}
                    />
                    <label htmlFor="instalaciones" className="text-sm cursor-pointer">Instalaciones en buen estado</label>
                    {closeTarget.status === 'closed' && (
                      closeTarget.checklistInstalaciones
                        ? <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                        : <XCircle className="h-4 w-4 text-red-500 ml-auto" />
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Anotaciones / Daños
                </Label>
                {closeTarget.status === 'closed' ? (
                  <p className="text-sm text-muted-foreground border rounded-md px-3 py-2 min-h-[60px]">
                    {closeTarget.closureNotes || 'Sin anotaciones'}
                  </p>
                ) : (
                  <Textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)}
                    placeholder="Describe daños o incidencias encontradas..." rows={3} />
                )}
              </div>

              {/* Charge */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" /> Cargo por daños
                </Label>
                {closeTarget.status === 'closed' ? (
                  <p className="text-sm font-semibold">
                    {closeTarget.chargeAmount != null
                      ? `$${Number(closeTarget.chargeAmount).toFixed(2)}`
                      : 'Sin cargo'}
                  </p>
                ) : (
                  <div className="relative max-w-[180px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input className="pl-7" type="number" min="0" step="0.01" placeholder="0.00"
                      value={closeCharge} onChange={e => setCloseCharge(e.target.value)} />
                  </div>
                )}
              </div>

              {closeTarget.status === 'closed' && closeTarget.closedBy && (
                <p className="text-xs text-muted-foreground">
                  Cerrado por {closeTarget.closedBy.name} {closeTarget.closedBy.lastName}
                  {closeTarget.closedAt ? ` · ${formatDateTime(closeTarget.closedAt)}` : ''}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setCloseTarget(null)}>
                  {closeTarget.status === 'closed' ? 'Cerrar' : 'Cancelar'}
                </Button>
                {closeTarget.status !== 'closed' && (
                  <Button onClick={() => closeMutation.mutate(closeTarget.id)} disabled={closeMutation.isPending}>
                    {closeMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Registrar cierre'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
