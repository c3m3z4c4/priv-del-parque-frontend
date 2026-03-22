import { useState } from 'react';
import { VecinoLayout } from '@/components/layouts/VecinoLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsApi, duesApi } from '@/lib/api';
import { GreenAreaReservation } from '@/types';
import { greenAreas } from '@/data/mockData';
import { Plus, TreePine, Clock, CalendarDays, X, AlertCircle, CheckCircle2, XCircle, Loader2, DollarSign } from 'lucide-react';
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

function statusIcon(status: GreenAreaReservation['status']) {
  switch (status) {
    case 'pending':   return <Clock className="h-5 w-5 text-amber-500" />;
    case 'approved':  return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case 'rejected':  return <XCircle className="h-5 w-5 text-red-500" />;
    case 'cancelled': return <XCircle className="h-5 w-5 text-muted-foreground" />;
    case 'closed':    return <CheckCircle2 className="h-5 w-5 text-blue-600" />;
  }
}

function formatDate(d: string) {
  try { return format(new Date(d + 'T12:00:00'), "EEEE d 'de' MMMM yyyy", { locale: es }); }
  catch { return d; }
}

export default function GreenAreaRequestPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: reservationsApi.getAll,
  });

  const { data: duesConfig } = useQuery({
    queryKey: ['dues-summary-current'],
    queryFn: async () => {
      const now = new Date();
      return duesApi.getSummary(now.getMonth() + 1, now.getFullYear());
    },
  });

  // Check pending dues from own reservations list is not available directly,
  // so we use a flag from the API error when creating
  const [hasDues, setHasDues] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: (id: string) => reservationsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      toast({ title: 'Solicitud cancelada' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // ── Form ──────────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    greenArea: '',
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
  });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!form.greenArea || !form.title || !form.date || !form.startTime) {
      toast({ title: 'Completa los campos requeridos', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      await reservationsApi.create({
        greenArea: form.greenArea,
        title: form.title,
        description: form.description || undefined,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime || undefined,
      });
      qc.invalidateQueries({ queryKey: ['reservations'] });
      toast({ title: 'Solicitud enviada', description: 'La mesa directiva revisará tu solicitud.' });
      setDialogOpen(false);
      setForm({ greenArea: '', title: '', description: '', date: '', startTime: '', endTime: '' });
    } catch (e: any) {
      if (e.message?.includes('adeudo')) setHasDues(true);
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const pending  = reservations.filter(r => r.status === 'pending');
  const approved = reservations.filter(r => r.status === 'approved');
  const past     = reservations.filter(r => r.status === 'rejected' || r.status === 'cancelled' || r.status === 'closed');

  return (
    <VecinoLayout>
      <div className="container max-w-3xl py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Área Verde</h1>
            <p className="text-muted-foreground text-sm">Solicita el uso de las áreas comunes</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nueva Solicitud
          </Button>
        </div>

        {hasDues && (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="flex gap-3 pt-4 pb-4">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-red-700">Tienes adeudos pendientes</p>
                <p className="text-sm text-red-600">Para solicitar el área verde debes estar al corriente con tus cuotas.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : reservations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center gap-3">
              <TreePine className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">Aún no tienes solicitudes</p>
              <Button variant="outline" onClick={() => setDialogOpen(true)}>Hacer mi primera solicitud</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {/* Pending */}
            {pending.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pendientes</h2>
                {pending.map(r => <ReservationCard key={r.id} r={r} onCancel={() => cancelMutation.mutate(r.id)} />)}
              </section>
            )}
            {/* Approved */}
            {approved.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Aprobadas</h2>
                {approved.map(r => <ReservationCard key={r.id} r={r} />)}
              </section>
            )}
            {/* Past */}
            {past.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Historial</h2>
                {past.map(r => <ReservationCard key={r.id} r={r} />)}
              </section>
            )}
          </div>
        )}
      </div>

      {/* New Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitar Área Verde</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Área Verde *</Label>
              <Select value={form.greenArea} onValueChange={v => setForm(f => ({ ...f, greenArea: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona un área" /></SelectTrigger>
                <SelectContent position="popper">
                  {greenAreas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nombre del evento *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Cumpleaños de Ana" />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción opcional del evento..." rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-3 sm:col-span-1">
                <Label>Fecha *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} min={new Date().toISOString().slice(0, 10)} />
              </div>
              <div className="space-y-1.5">
                <Label>Hora inicio *</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Hora fin</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : 'Enviar Solicitud'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </VecinoLayout>
  );
}

function ReservationCard({ r, onCancel }: { r: GreenAreaReservation; onCancel?: () => void }) {
  return (
    <Card className={r.status === 'approved' ? 'border-green-200 bg-green-50/30' : r.status === 'rejected' ? 'border-red-200 bg-red-50/20' : ''}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 flex-1 min-w-0">
            <div className="mt-0.5 shrink-0">{statusIcon(r.status)}</div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap gap-2 items-center">
                <p className="font-semibold truncate">{r.title}</p>
                {statusBadge(r.status)}
              </div>
              <p className="text-sm text-muted-foreground">{r.greenArea}</p>
              <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex gap-1 items-center"><CalendarDays className="h-3 w-3" />{formatDate(r.date)}</span>
                <span className="flex gap-1 items-center"><Clock className="h-3 w-3" />{r.startTime}{r.endTime ? ` – ${r.endTime}` : ''}</span>
              </div>
              {r.adminNotes && (
                <p className="text-sm mt-1 italic text-muted-foreground">
                  <span className="font-medium not-italic">Nota: </span>{r.adminNotes}
                </p>
              )}
              {r.reviewedBy && r.status !== 'closed' && (
                <p className="text-xs text-muted-foreground">
                  Revisado por {r.reviewedBy.name} {r.reviewedBy.lastName}
                </p>
              )}
              {r.status === 'closed' && (
                <div className="mt-2 rounded-md border border-blue-200 bg-blue-50/50 px-3 py-2 space-y-1">
                  <p className="text-xs font-medium text-blue-700">Reporte de cierre</p>
                  <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className={r.checklistBanos ? 'text-green-700' : 'text-red-600'}>
                      {r.checklistBanos ? '✓' : '✗'} Baños
                    </span>
                    <span className={r.checklistInstalaciones ? 'text-green-700' : 'text-red-600'}>
                      {r.checklistInstalaciones ? '✓' : '✗'} Instalaciones
                    </span>
                    {r.chargeAmount != null && Number(r.chargeAmount) > 0 && (
                      <span className="text-red-600 font-medium flex items-center gap-0.5">
                        <DollarSign className="h-3 w-3" /> Cargo: ${Number(r.chargeAmount).toFixed(2)}
                      </span>
                    )}
                  </div>
                  {r.closureNotes && <p className="text-xs text-muted-foreground italic">{r.closureNotes}</p>}
                </div>
              )}
            </div>
          </div>
          {r.status === 'pending' && onCancel && (
            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-red-600 shrink-0" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
