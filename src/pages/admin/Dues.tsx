import { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { TablePagination, paginate } from '@/components/admin/TablePagination';
import { useAuth } from '@/contexts/AuthContext';
import { DuesPayment, DuesSummary, DuesConfig } from '@/types';
import { duesApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DollarSign, CheckCircle2, Clock, Ban, Banknote, Loader2, Search, RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function statusBadge(status: DuesPayment['status']) {
  if (status === 'paid')
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Pagado</Badge>;
  if (status === 'exempt')
    return <Badge variant="secondary">Exento</Badge>;
  return <Badge variant="outline" className="text-amber-600 border-amber-400">Pendiente</Badge>;
}

export default function AdminDues() {
  const { user } = useAuth();
  const { toast } = useToast();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [payments, setPayments] = useState<DuesPayment[]>([]);
  const [summary, setSummary] = useState<DuesSummary | null>(null);
  const [config, setConfig] = useState<DuesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [newAmount, setNewAmount] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'exempt'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedPayment, setSelectedPayment] = useState<DuesPayment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [all, sum, cfg] = await Promise.all([
        duesApi.getAll(),
        duesApi.getSummary(month, year),
        duesApi.getConfig(),
      ]);
      setPayments(all.filter(p => p.month === month && p.year === year));
      setSummary(sum);
      setConfig(cfg);
    } catch (err: any) {
      toast({ title: 'Error al cargar cobros', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    try {
      const generated = await duesApi.generate({ month, year });
      toast({ title: 'Cuotas generadas', description: `Se generaron ${generated.length} cuotas para ${MONTHS[month - 1]} ${year}.` });
      load();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudieron generar las cuotas.', variant: 'destructive' });
    }
  };

  const handleUpdateConfig = async () => {
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Error', description: 'Ingresa un monto valido.', variant: 'destructive' });
      return;
    }
    try {
      const updated = await duesApi.setConfig({ amount });
      setConfig(updated);
      setNewAmount('');
      toast({ title: 'Configuracion actualizada', description: `El monto de cuota se actualizo a $${amount.toFixed(2)}.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo actualizar.', variant: 'destructive' });
    }
  };

  const openDialog = (payment: DuesPayment) => {
    setSelectedPayment(payment);
    setNotes(payment.notes ?? '');
    setDialogOpen(true);
  };

  const handleRegisterPayment = async () => {
    if (!selectedPayment) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await duesApi.update(selectedPayment.id, {
        status: 'paid',
        paidAt: today,
        notes: notes || undefined,
      });
      toast({ title: 'Pago registrado', description: 'El cobro fue registrado correctamente.' });
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (q) {
        const name = p.user ? `${p.user.name} ${p.user.lastName}`.toLowerCase() : '';
        const house = p.house?.houseNumber?.toLowerCase() || '';
        if (!name.includes(q) && !house.includes(q)) return false;
      }
      return true;
    });
  }, [payments, statusFilter, search]);

  if (loading) {
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
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Gestion de Cuotas</h1>
            <p className="text-muted-foreground">
              Administra los pagos mensuales de los vecinos
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="space-y-1">
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={month}
                onChange={e => { setMonth(Number(e.target.value)); setPage(1); }}
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <Input
              type="number"
              className="w-28"
              value={year}
              onChange={e => { setYear(Number(e.target.value)); setPage(1); }}
            />
            <Button onClick={handleGenerate} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Generar Cuotas del Mes
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total cuotas</CardTitle>
                <DollarSign className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total}</div>
                <p className="text-xs text-muted-foreground">registros en el mes</p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pagadas</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summary.paid}</div>
                <p className="text-xs text-muted-foreground">
                  ${summary.collectedAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} recaudados
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                <Clock className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{summary.pending}</div>
                <p className="text-xs text-muted-foreground">por cobrar</p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Exentos</CardTitle>
                <Ban className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.exempt}</div>
                <p className="text-xs text-muted-foreground">sin cuota asignada</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Config (SUPER_ADMIN only) */}
        {user?.role === 'SUPER_ADMIN' && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Configuracion de Cuota</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <p className="text-sm text-muted-foreground">
                  Monto actual: <span className="font-semibold text-foreground">${config?.amount != null ? Number(config.amount).toFixed(2) : '0.00'}</span>
                </p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Nuevo monto"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    className="w-[150px]"
                  />
                  <Button onClick={handleUpdateConfig} variant="outline">Actualizar</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o casa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="paid">Pagados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="exempt">Exentos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payments Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" />
              Detalle de cuotas — {MONTHS[month - 1]} {year}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <DollarSign className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-lg font-medium">No hay cuotas</p>
                <p className="text-sm text-muted-foreground">Genera las cuotas del mes para comenzar</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vecino</TableHead>
                        <TableHead className="hidden sm:table-cell">Casa</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="hidden md:table-cell">Fecha de pago</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginate(filtered, page, pageSize).map(payment => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.user
                              ? `${payment.user.name} ${payment.user.lastName}`
                              : payment.userId}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {payment.house?.houseNumber ?? '--'}
                          </TableCell>
                          <TableCell>
                            ${Number(payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>{statusBadge(payment.status)}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {payment.paidAt
                              ? new Date(payment.paidAt + (payment.paidAt.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('es-MX')
                              : '--'}
                          </TableCell>
                          <TableCell className="text-right">
                            {payment.status === 'pending' && (
                              <Button size="sm" onClick={() => openDialog(payment)}>
                                Registrar pago
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination totalItems={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mark as paid dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Registrar cobro en efectivo</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Vecino: </span>
                  <span className="font-medium">
                    {selectedPayment.user
                      ? `${selectedPayment.user.name} ${selectedPayment.user.lastName}`
                      : selectedPayment.userId}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Periodo: </span>
                  <span className="font-medium">
                    {MONTHS[selectedPayment.month - 1]} {selectedPayment.year}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Monto: </span>
                  <span className="font-medium">
                    ${Number(selectedPayment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Banknote className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-primary">Forma de pago: Efectivo</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Ej. Recibo #123..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleRegisterPayment} disabled={saving}>
                  {saving ? 'Guardando...' : 'Confirmar pago'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
