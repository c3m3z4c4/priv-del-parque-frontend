import { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { TablePagination, paginate } from '@/components/admin/TablePagination';
import { useAuth } from '@/contexts/AuthContext';
import { DuesPayment, DuesSummary, DuesConfig, DuesPromotion } from '@/types';
import { duesApi, promotionsApi } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DollarSign, CheckCircle2, Clock, Ban, Banknote, Loader2, Search, RefreshCw, Upload, CalendarDays, Plus, Pencil, Trash2, Tag, FileDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportBrandedPDF } from '@/lib/exportPDF';
import logo from '@/assets/logo.png';
import { useSortable, applySortLocale } from '@/hooks/useSortable';
import { SortableHead } from '@/components/admin/SortableHead';

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

function promotionStatusBadge(promo: DuesPromotion) {
  if (!promo.isActive) return <Badge variant="secondary">Inactiva</Badge>;
  const now = new Date();
  const to = new Date(promo.validTo + (promo.validTo.includes('T') ? '' : 'T23:59:59'));
  if (to < now) return <Badge variant="outline" className="text-red-600 border-red-400">Expirada</Badge>;
  return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Activa</Badge>;
}

const EMPTY_PROMO = {
  name: '',
  description: '',
  monthCount: 1,
  discountPercentage: 0,
  validFrom: '',
  validTo: '',
  isActive: true,
};

export default function AdminDues() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isTesorero = user?.role === 'TESORERO';

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
  const { sortCol, sortDir, handleSort } = useSortable('house');

  const [selectedPayment, setSelectedPayment] = useState<DuesPayment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  const [annualSummaries, setAnnualSummaries] = useState<(DuesSummary & { month: number })[]>([]);
  const [annualLoading, setAnnualLoading] = useState(false);

  // Promotions state
  const [promotions, setPromotions] = useState<DuesPromotion[]>([]);
  const [promosLoading, setPromosLoading] = useState(true);
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<DuesPromotion | null>(null);
  const [promoForm, setPromoForm] = useState(EMPTY_PROMO);
  const [promoSaving, setPromoSaving] = useState(false);
  const [deletePromo, setDeletePromo] = useState<DuesPromotion | null>(null);

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

  const loadPromotions = useCallback(async () => {
    setPromosLoading(true);
    try {
      const all = await promotionsApi.getAll();
      setPromotions(all);
    } catch (err: any) {
      toast({ title: 'Error al cargar promociones', description: err.message, variant: 'destructive' });
    } finally {
      setPromosLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadPromotions(); }, [loadPromotions]);

  const loadAnnual = useCallback(async () => {
    setAnnualLoading(true);
    try {
      const results = await Promise.all(
        Array.from({ length: 12 }, (_, i) => i + 1).map(m =>
          duesApi.getSummary(m, year).then(s => ({ ...s, month: m })),
        ),
      );
      setAnnualSummaries(results);
    } catch (err: any) {
      toast({ title: 'Error al cargar resumen anual', description: err.message, variant: 'destructive' });
    } finally {
      setAnnualLoading(false);
    }
  }, [year]);

  const handleImportPayments = async () => {
    const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = lines.map(line => {
      const [email, monthStr, yearStr, paidAt, ...notesParts] = line.split(',');
      return {
        email: email?.trim(),
        month: Number(monthStr?.trim()),
        year: Number(yearStr?.trim()),
        paidAt: paidAt?.trim() || undefined,
        notes: notesParts.join(',').trim() || undefined,
      };
    }).filter(p => p.email && p.month && p.year);

    if (parsed.length === 0) {
      toast({ title: 'Error', description: 'No se detectaron registros validos.', variant: 'destructive' });
      return;
    }
    setImportLoading(true);
    try {
      const result = await duesApi.importPayments(parsed);
      toast({
        title: 'Importacion completada',
        description: `${result.created} creados, ${result.updated} actualizados, ${result.skipped} omitidos.${result.errors.length ? ` Errores: ${result.errors.slice(0, 3).join('; ')}` : ''}`,
      });
      setImportText('');
      setImportOpen(false);
      load();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setImportLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      const result = await duesApi.generate({ month, year });
      toast({ title: 'Cuotas generadas', description: `Se generaron ${result.generated} cuotas y ${result.exempt} exentas para ${MONTHS[month - 1]} ${year}.` });
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

  // Promotions handlers
  const openPromoCreate = () => {
    setEditingPromo(null);
    setPromoForm(EMPTY_PROMO);
    setPromoDialogOpen(true);
  };

  const openPromoEdit = (promo: DuesPromotion) => {
    setEditingPromo(promo);
    setPromoForm({
      name: promo.name,
      description: promo.description || '',
      monthCount: promo.monthCount,
      discountPercentage: promo.discountPercentage,
      validFrom: promo.validFrom.split('T')[0],
      validTo: promo.validTo.split('T')[0],
      isActive: promo.isActive,
    });
    setPromoDialogOpen(true);
  };

  const handlePromoSubmit = async () => {
    if (!promoForm.name.trim()) {
      toast({ title: 'Error', description: 'Ingresa un nombre para la promocion.', variant: 'destructive' });
      return;
    }
    if (!promoForm.validFrom || !promoForm.validTo) {
      toast({ title: 'Error', description: 'Selecciona fechas de vigencia.', variant: 'destructive' });
      return;
    }
    setPromoSaving(true);
    try {
      const payload = {
        name: promoForm.name,
        description: promoForm.description || undefined,
        monthCount: promoForm.monthCount,
        discountPercentage: promoForm.discountPercentage,
        validFrom: promoForm.validFrom,
        validTo: promoForm.validTo,
        isActive: promoForm.isActive,
      };
      if (editingPromo) {
        await promotionsApi.update(editingPromo.id, payload);
        toast({ title: 'Promocion actualizada' });
      } else {
        await promotionsApi.create(payload);
        toast({ title: 'Promocion creada' });
      }
      setPromoDialogOpen(false);
      loadPromotions();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setPromoSaving(false);
    }
  };

  const handlePromoDelete = async () => {
    if (!deletePromo) return;
    try {
      await promotionsApi.remove(deletePromo.id);
      toast({ title: 'Promocion eliminada' });
      setDeletePromo(null);
      loadPromotions();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleExportPDF = () => {
    const monthName = MONTHS[month - 1];
    const collected = summary?.collectedAmount ?? 0;
    const total = summary?.totalAmount ?? 0;
    const rows = payments.map(p => {
      const name = p.user ? `${p.user.name} ${p.user.lastName}` : p.userId;
      const house = p.house?.houseNumber ?? '—';
      const amount = `$${Number(p.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
      const statusLabel = p.status === 'paid' ? 'Pagado' : p.status === 'exempt' ? 'Exento' : 'Pendiente';
      const paidDate = p.paidAt
        ? new Date(p.paidAt + (p.paidAt.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('es-MX')
        : '—';
      return [name, house, amount, statusLabel, paidDate];
    });
    exportBrandedPDF({
      title: `Reporte de Cuotas — ${monthName} ${year}`,
      subtitle: `Periodo: ${monthName} ${year}`,
      logoUrl: logo,
      columns: ['Vecino', 'Casa', 'Monto', 'Estado', 'Fecha de pago'],
      rows,
      stats: [
        { label: 'Total registros', value: String(summary?.total ?? 0) },
        { label: 'Pagados', value: String(summary?.paid ?? 0), color: '#16a34a' },
        { label: 'Pendientes', value: String(summary?.pending ?? 0), color: '#d97706' },
        { label: 'Exentos', value: String(summary?.exempt ?? 0), color: '#6b7280' },
        { label: 'Recaudado', value: `$${collected.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
        { label: 'Total esperado', value: `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
      ],
    });
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

  const displayed = useMemo(() =>
    applySortLocale(filtered, sortCol, sortDir, (p, col) => {
      if (col === 'vecino') return p.user ? `${p.user.name} ${p.user.lastName}` : '';
      if (col === 'house') return p.house?.houseNumber ?? '';
      if (col === 'amount') return Number(p.amount);
      if (col === 'status') return p.status;
      if (col === 'paidAt') return p.paidAt ?? '';
      return '';
    }),
  [filtered, sortCol, sortDir]);

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
              Administra los pagos mensuales y promociones
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
            <Button variant="outline" className="gap-2" onClick={handleExportPDF} disabled={payments.length === 0}>
              <FileDown className="h-4 w-4" /> Exportar PDF
            </Button>
            {isTesorero && (
              <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" /> Importar pagos
              </Button>
            )}
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

        {/* Main Tabs: Cuotas / Promociones */}
        <Tabs defaultValue="cuotas">
          <TabsList>
            <TabsTrigger value="cuotas">Cuotas</TabsTrigger>
            <TabsTrigger value="promociones">Promociones</TabsTrigger>
          </TabsList>

          {/* ─── Tab: Cuotas ──────────────────────────────────────────── */}
          <TabsContent value="cuotas" className="space-y-6">
            {/* Monthly / Annual sub-tabs */}
            <Tabs defaultValue="monthly" onValueChange={v => { if (v === 'annual') loadAnnual(); }}>
              <TabsList>
                <TabsTrigger value="monthly">Vista mensual</TabsTrigger>
                <TabsTrigger value="annual" className="gap-2">
                  <CalendarDays className="h-4 w-4" /> Vista anual {year}
                </TabsTrigger>
              </TabsList>

              {/* Annual view */}
              <TabsContent value="annual">
                {annualLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {annualSummaries.map(s => (
                      <Card key={s.month} className="shadow-card">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                          <CardTitle className="text-base font-semibold">{MONTHS[s.month - 1]}</CardTitle>
                          <span className="text-xs text-muted-foreground">{s.total} registros</span>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-green-600 font-medium">Pagados</span>
                            <span className="font-bold">{s.paid}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-amber-600">Pendientes</span>
                            <span>{s.pending}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Exentos</span>
                            <span>{s.exempt}</span>
                          </div>
                          <div className="flex justify-between border-t pt-1 mt-1">
                            <span className="text-muted-foreground text-xs">Recaudado</span>
                            <span className="font-semibold text-xs">
                              ${s.collectedAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Monthly view */}
              <TabsContent value="monthly" className="space-y-6">
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
                                <SortableHead label="Vecino" colKey="vecino" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                                <SortableHead label="Casa" colKey="house" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
                                <SortableHead label="Monto" colKey="amount" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                                <SortableHead label="Estado" colKey="status" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                                <SortableHead label="Fecha de pago" colKey="paidAt" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                                <TableHead className="text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginate(displayed, page, pageSize).map(payment => (
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
                        <TablePagination totalItems={displayed.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ─── Tab: Promociones ─────────────────────────────────────── */}
          <TabsContent value="promociones" className="space-y-6">
            {user?.role === 'SUPER_ADMIN' && (
              <div className="flex justify-end">
                <Button onClick={openPromoCreate} className="gap-2">
                  <Plus className="h-4 w-4" /> Nueva Promocion
                </Button>
              </div>
            )}

            {promosLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : promotions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Tag className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-lg font-medium">No hay promociones</p>
                <p className="text-sm text-muted-foreground">Crea una promocion para comenzar</p>
              </div>
            ) : (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-serif text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    Promociones de Cuotas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead className="hidden md:table-cell">Descripcion</TableHead>
                          <TableHead>Meses</TableHead>
                          <TableHead>Descuento</TableHead>
                          <TableHead className="hidden sm:table-cell">Desde</TableHead>
                          <TableHead className="hidden sm:table-cell">Hasta</TableHead>
                          <TableHead>Estado</TableHead>
                          {user?.role === 'SUPER_ADMIN' && (
                            <TableHead className="text-right">Acciones</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {promotions.map(promo => (
                          <TableRow key={promo.id}>
                            <TableCell className="font-medium">{promo.name}</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                              {promo.description || '--'}
                            </TableCell>
                            <TableCell>{promo.monthCount}</TableCell>
                            <TableCell>{promo.discountPercentage}%</TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                              {new Date(promo.validFrom + (promo.validFrom.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('es-MX')}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                              {new Date(promo.validTo + (promo.validTo.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('es-MX')}
                            </TableCell>
                            <TableCell>{promotionStatusBadge(promo)}</TableCell>
                            {user?.role === 'SUPER_ADMIN' && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button size="icon" variant="ghost" onClick={() => openPromoEdit(promo)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeletePromo(promo)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Import payments dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Importar pagos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Lista de pagos <span className="text-muted-foreground text-xs">(email,mes,ano,fecha_pago,notas)</span></Label>
              <Textarea
                rows={8}
                placeholder={`juan@email.com,3,2026,2026-03-10\nana@email.com,3,2026,2026-03-12,Recibo #45`}
                value={importText}
                onChange={e => setImportText(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                El mes debe ser un numero (1-12). La fecha es opcional (se usa la fecha actual). Los roles exentos se omiten automaticamente.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
              <Button onClick={handleImportPayments} disabled={!importText.trim() || importLoading}>
                {importLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando...</> : 'Importar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Promotion Create/Edit dialog */}
      <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingPromo ? 'Editar Promocion' : 'Nueva Promocion'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input
                value={promoForm.name}
                onChange={e => setPromoForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nombre de la promocion"
              />
            </div>
            <div className="space-y-1">
              <Label>Descripcion (opcional)</Label>
              <Textarea
                value={promoForm.description}
                onChange={e => setPromoForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descripcion de la promocion..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Cantidad de meses</Label>
                <Input
                  type="number"
                  min={1}
                  value={promoForm.monthCount}
                  onChange={e => setPromoForm(f => ({ ...f, monthCount: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Descuento %</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={promoForm.discountPercentage}
                    onChange={e => setPromoForm(f => ({ ...f, discountPercentage: parseFloat(e.target.value) || 0 }))}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Valida desde</Label>
                <Input
                  type="date"
                  value={promoForm.validFrom}
                  onChange={e => setPromoForm(f => ({ ...f, validFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Valida hasta</Label>
                <Input
                  type="date"
                  value={promoForm.validTo}
                  onChange={e => setPromoForm(f => ({ ...f, validTo: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="promoActive"
                checked={promoForm.isActive}
                onCheckedChange={v => setPromoForm(f => ({ ...f, isActive: v }))}
              />
              <Label htmlFor="promoActive" className="cursor-pointer">Activa</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPromoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handlePromoSubmit} disabled={promoSaving}>
                {promoSaving ? 'Guardando...' : editingPromo ? 'Guardar cambios' : 'Crear promocion'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete promotion confirmation */}
      <Dialog open={!!deletePromo} onOpenChange={() => setDeletePromo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar promocion</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Estas seguro de eliminar <strong>{deletePromo?.name}</strong>? Esta accion no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletePromo(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handlePromoDelete}>Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
