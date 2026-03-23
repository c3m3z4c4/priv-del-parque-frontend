import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { TablePagination, paginate } from '@/components/admin/TablePagination';
import { useAuth } from '@/contexts/AuthContext';
import { DuesPayment, DuesSummary, DuesConfig, DuesPromotion, DuesPolicy, Debtor, ExtraordinaryIncome, House } from '@/types';
import { duesApi, promotionsApi, duesPolicyApi, extraordinaryApi, houseHistoryApi, housesApi } from '@/lib/api';
import * as XLSX from 'xlsx';
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
  DollarSign, CheckCircle2, Clock, Ban, Banknote, Loader2, Search, RefreshCw, Upload, CalendarDays, Plus, Pencil, Trash2, Tag, FileDown, Download, AlertTriangle, ShieldAlert, Smartphone, CreditCard, Settings2, ChevronDown, ChevronRight, Home, Zap,
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

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function escapeCSV(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function parseCSVLine(line: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  cols.push(cur.trim());
  return cols;
}

export default function AdminDues() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isTesorero = user?.role === 'TESORERO';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const canManage = isTesorero || isAdmin;

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
  const [importPreviewRows, setImportPreviewRows] = useState<{ email: string; month: number; year: number; paidAt: string; notes: string }[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

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

  // Debtors & policy state
  const [policy, setPolicy] = useState<DuesPolicy | null>(null);
  const [policyForm, setPolicyForm] = useState({ dueDay: 1, mobileLockMonths: 1, cardLockMonths: 3 });
  const [policyLoading, setPolicyLoading] = useState(false);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [debtorsLoading, setDebtorsLoading] = useState(false);
  const [expandedDebtor, setExpandedDebtor] = useState<string | null>(null);

  // Extraordinary income state
  const [extraordinary, setExtraordinary] = useState<ExtraordinaryIncome[]>([]);
  const [extLoading, setExtLoading] = useState(false);
  const [extDialogOpen, setExtDialogOpen] = useState(false);
  const [editingExt, setEditingExt] = useState<ExtraordinaryIncome | null>(null);
  const [deleteExt, setDeleteExt] = useState<ExtraordinaryIncome | null>(null);
  const EMPTY_EXT = { concept: '', description: '', amount: 0, date: new Date().toISOString().split('T')[0], category: 'otro' as const, houseId: '', notes: '' };
  const [extForm, setExtForm] = useState(EMPTY_EXT);
  const [extSaving, setExtSaving] = useState(false);

  // House history state
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState('');
  const [houseHistory, setHouseHistory] = useState<{ payments: DuesPayment[]; extraordinary: ExtraordinaryIncome[] } | null>(null);
  const [houseHistoryLoading, setHouseHistoryLoading] = useState(false);

  // Apply promotion state
  const [applyPromoOpen, setApplyPromoOpen] = useState(false);
  const [applyPromoForm, setApplyPromoForm] = useState({ houseId: '', promotionId: '', startMonth: now.getMonth() + 1, startYear: now.getFullYear(), paidAt: '' });
  const [applyPromoSaving, setApplyPromoSaving] = useState(false);

  const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const loadDebtors = useCallback(async () => {
    setDebtorsLoading(true);
    try {
      const [d, p] = await Promise.all([duesPolicyApi.getDebtors(), duesPolicyApi.get()]);
      setDebtors(d);
      if (p) { setPolicy(p); setPolicyForm({ dueDay: p.dueDay, mobileLockMonths: p.mobileLockMonths, cardLockMonths: p.cardLockMonths }); }
    } catch (err: any) {
      toast({ title: 'Error al cargar adeudos', description: err.message, variant: 'destructive' });
    } finally {
      setDebtorsLoading(false);
    }
  }, []);

  const handleSavePolicy = async () => {
    setPolicyLoading(true);
    try {
      const saved = await duesPolicyApi.set(policyForm);
      setPolicy(saved);
      toast({ title: 'Política actualizada', description: `Cuotas vencen el día ${saved.dueDay} de cada mes.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setPolicyLoading(false);
    }
  };

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

  const loadExtraordinary = useCallback(async () => {
    setExtLoading(true);
    try {
      setExtraordinary(await extraordinaryApi.getAll());
    } catch (err: any) {
      toast({ title: 'Error al cargar ingresos extraordinarios', description: err.message, variant: 'destructive' });
    } finally {
      setExtLoading(false);
    }
  }, []);

  const loadHouseHistory = useCallback(async (houseId: string) => {
    if (!houseId) return;
    setHouseHistoryLoading(true);
    try {
      setHouseHistory(await houseHistoryApi.get(houseId));
    } catch (err: any) {
      toast({ title: 'Error al cargar historial', description: err.message, variant: 'destructive' });
    } finally {
      setHouseHistoryLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadPromotions(); }, [loadPromotions]);
  useEffect(() => { housesApi.getAll().then(setHouses).catch(() => {}); }, []);

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

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isXLS = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows: typeof importPreviewRows = [];
      if (isXLS) {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        for (const cols of data) {
          const email = String(cols[0] ?? '').trim();
          const monthNum = Number(cols[1]);
          const yearNum = Number(cols[2]);
          if (!email || email.toLowerCase() === 'email' || !monthNum || !yearNum) continue;
          rows.push({ email, month: monthNum, year: yearNum, paidAt: String(cols[3] ?? '').trim(), notes: String(cols[4] ?? '').trim() });
        }
      } else {
        const text = ev.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          const cols = parseCSVLine(line);
          const email = cols[0]?.trim();
          const monthNum = Number(cols[1]?.trim());
          const yearNum = Number(cols[2]?.trim());
          if (!email || email.toLowerCase() === 'email' || !monthNum || !yearNum) continue;
          rows.push({ email, month: monthNum, year: yearNum, paidAt: cols[3]?.trim() || '', notes: cols[4]?.trim() || '' });
        }
      }
      setImportPreviewRows(rows);
    };
    if (isXLS) reader.readAsBinaryString(file);
    else reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportPayments = async () => {
    if (importPreviewRows.length === 0) {
      toast({ title: 'Error', description: 'No se detectaron registros validos.', variant: 'destructive' });
      return;
    }
    const payload = importPreviewRows.map(r => ({
      email: r.email,
      month: r.month,
      year: r.year,
      paidAt: r.paidAt || undefined,
      notes: r.notes || undefined,
    }));
    setImportLoading(true);
    try {
      const result = await duesApi.importPayments(payload);
      toast({
        title: 'Importacion completada',
        description: `${result.created} creados, ${result.updated} actualizados, ${result.skipped} omitidos.${result.errors.length ? ` Errores: ${result.errors.slice(0, 3).join('; ')}` : ''}`,
      });
      setImportPreviewRows([]);
      setImportOpen(false);
      load();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setImportLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleteAllLoading(true);
    try {
      const result = await duesApi.deleteAll();
      toast({ title: 'Pagos eliminados', description: `Se eliminaron ${result.deleted} registros.` });
      setDeleteAllOpen(false);
      load();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const handleExportCSV = () => {
    const monthName = MONTHS[month - 1];
    const header = ['Vecino', 'Email', 'Casa', 'Monto', 'Estado', 'Fecha de pago', 'Notas'];
    const rows = payments.map(p => [
      p.user ? `${p.user.name} ${p.user.lastName}` : p.userId,
      p.user?.email ?? '',
      p.house?.houseNumber ?? '',
      Number(p.amount).toFixed(2),
      p.status === 'paid' ? 'Pagado' : p.status === 'exempt' ? 'Exento' : 'Pendiente',
      p.paidAt ? new Date(p.paidAt + (p.paidAt.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('es-MX') : '',
      p.notes ?? '',
    ]);
    const csv = [header, ...rows].map(r => r.map(escapeCSV).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuotas_${monthName}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportXLS = () => {
    const monthName = MONTHS[month - 1];
    const data = [
      ['Vecino', 'Email', 'Casa', 'Monto', 'Estado', 'Fecha de pago', 'Notas'],
      ...payments.map(p => [
        p.user ? `${p.user.name} ${p.user.lastName}` : p.userId,
        p.user?.email ?? '',
        p.house?.houseNumber ?? '',
        Number(p.amount),
        p.status === 'paid' ? 'Pagado' : p.status === 'exempt' ? 'Exento' : 'Pendiente',
        p.paidAt ?? '',
        p.notes ?? '',
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${year}`);
    XLSX.writeFile(wb, `cuotas_${monthName}_${year}.xlsx`);
  };

  // Extraordinary handlers
  const openExtCreate = () => {
    setEditingExt(null);
    setExtForm(EMPTY_EXT);
    setExtDialogOpen(true);
  };

  const openExtEdit = (ext: ExtraordinaryIncome) => {
    setEditingExt(ext);
    setExtForm({ concept: ext.concept, description: ext.description || '', amount: Number(ext.amount), date: ext.date, category: ext.category, houseId: ext.houseId || '', notes: ext.notes || '' });
    setExtDialogOpen(true);
  };

  const handleExtSubmit = async () => {
    if (!extForm.concept.trim()) { toast({ title: 'Error', description: 'Ingresa un concepto.', variant: 'destructive' }); return; }
    if (!extForm.amount || extForm.amount <= 0) { toast({ title: 'Error', description: 'Ingresa un monto válido.', variant: 'destructive' }); return; }
    setExtSaving(true);
    try {
      const payload = { concept: extForm.concept, description: extForm.description || undefined, amount: extForm.amount, date: extForm.date, category: extForm.category || undefined, houseId: extForm.houseId || undefined, notes: extForm.notes || undefined };
      if (editingExt) { await extraordinaryApi.update(editingExt.id, payload); toast({ title: 'Ingreso actualizado' }); }
      else { await extraordinaryApi.create(payload); toast({ title: 'Ingreso creado' }); }
      setExtDialogOpen(false);
      loadExtraordinary();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setExtSaving(false);
    }
  };

  const handleExtDelete = async () => {
    if (!deleteExt) return;
    try {
      await extraordinaryApi.remove(deleteExt.id);
      toast({ title: 'Ingreso eliminado' });
      setDeleteExt(null);
      loadExtraordinary();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Apply promotion handler
  const handleApplyPromo = async () => {
    if (!applyPromoForm.houseId || !applyPromoForm.promotionId) { toast({ title: 'Error', description: 'Selecciona casa y promoción.', variant: 'destructive' }); return; }
    setApplyPromoSaving(true);
    try {
      const result = await promotionsApi.apply({ ...applyPromoForm, paidAt: applyPromoForm.paidAt || undefined });
      toast({ title: 'Promoción aplicada', description: `Se crearon/actualizaron ${result.applied} pagos.` });
      setApplyPromoOpen(false);
      load();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setApplyPromoSaving(false);
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
            <Button variant="outline" className="gap-2" onClick={handleExportCSV} disabled={payments.length === 0}>
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExportXLS} disabled={payments.length === 0}>
              <Download className="h-4 w-4" /> Exportar XLS
            </Button>
            {canManage && (
              <Button variant="outline" className="gap-2" onClick={() => { setImportPreviewRows([]); setImportOpen(true); }}>
                <Upload className="h-4 w-4" /> Importar pagos
              </Button>
            )}
            {isAdmin && (
              <Button variant="outline" className="gap-2 text-destructive hover:text-destructive border-destructive/40 hover:border-destructive" onClick={() => setDeleteAllOpen(true)}>
                <Trash2 className="h-4 w-4" /> Eliminar todos
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
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="cuotas">Cuotas</TabsTrigger>
            <TabsTrigger value="promociones">Promociones</TabsTrigger>
            {canManage && (
              <TabsTrigger value="extraordinarios" className="gap-2" onClick={() => { if (extraordinary.length === 0 && !extLoading) loadExtraordinary(); }}>
                <Zap className="h-4 w-4" /> Extraordinarios
              </TabsTrigger>
            )}
            {canManage && (
              <TabsTrigger value="por-casa" className="gap-2" onClick={() => {}}>
                <Home className="h-4 w-4" /> Por Casa
              </TabsTrigger>
            )}
            {canManage && (
              <TabsTrigger value="deudores" className="gap-2" onClick={() => { if (debtors.length === 0 && !debtorsLoading) loadDebtors(); }}>
                <ShieldAlert className="h-4 w-4" /> Deudores
                {debtors.length > 0 && <span className="ml-1 rounded-full bg-red-500 text-white text-xs px-1.5">{debtors.length}</span>}
              </TabsTrigger>
            )}
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
                    <SelectContent position="popper">
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
            <div className="flex justify-end gap-2">
              {canManage && (
                <Button variant="outline" onClick={() => { setApplyPromoForm({ houseId: '', promotionId: '', startMonth: now.getMonth() + 1, startYear: now.getFullYear(), paidAt: '' }); setApplyPromoOpen(true); }} className="gap-2">
                  <Zap className="h-4 w-4" /> Aplicar promoción
                </Button>
              )}
              {user?.role === 'SUPER_ADMIN' && (
                <Button onClick={openPromoCreate} className="gap-2">
                  <Plus className="h-4 w-4" /> Nueva Promocion
                </Button>
              )}
            </div>

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

          {/* ─── Tab: Extraordinarios ─────────────────────────────── */}
          {canManage && (
            <TabsContent value="extraordinarios" className="space-y-6">
              <div className="flex justify-end">
                <Button onClick={openExtCreate} className="gap-2">
                  <Plus className="h-4 w-4" /> Nuevo ingreso
                </Button>
              </div>
              {extLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : extraordinary.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Zap className="h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-4 text-lg font-medium">Sin ingresos extraordinarios</p>
                  <p className="text-sm text-muted-foreground">Registra multas, eventos, obras u otros ingresos</p>
                </div>
              ) : (
                <Card className="shadow-card">
                  <CardHeader><CardTitle className="font-serif text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Ingresos Extraordinarios</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Concepto</TableHead>
                            <TableHead className="hidden sm:table-cell">Categoría</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead className="hidden md:table-cell">Casa</TableHead>
                            <TableHead className="hidden md:table-cell">Notas</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {extraordinary.map(ext => (
                            <TableRow key={ext.id}>
                              <TableCell className="font-medium">{ext.concept}</TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <Badge variant="outline">{ext.category}</Badge>
                              </TableCell>
                              <TableCell>${Number(ext.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-muted-foreground">{new Date(ext.date + 'T00:00:00').toLocaleDateString('es-MX')}</TableCell>
                              <TableCell className="hidden md:table-cell text-muted-foreground">{ext.house?.houseNumber || '—'}</TableCell>
                              <TableCell className="hidden md:table-cell text-muted-foreground max-w-[150px] truncate">{ext.notes || '—'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button size="icon" variant="ghost" onClick={() => openExtEdit(ext)}><Pencil className="h-4 w-4" /></Button>
                                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteExt(ext)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* ─── Tab: Por Casa ─────────────────────────────────────── */}
          {canManage && (
            <TabsContent value="por-casa" className="space-y-6">
              <Card className="shadow-card">
                <CardHeader><CardTitle className="font-serif text-lg flex items-center gap-2"><Home className="h-5 w-5 text-primary" /> Historial por Casa</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-3 items-center">
                    <Select value={selectedHouseId} onValueChange={v => { setSelectedHouseId(v); setHouseHistory(null); loadHouseHistory(v); }}>
                      <SelectTrigger className="w-full sm:w-[280px]">
                        <SelectValue placeholder="Selecciona una casa..." />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {houses.map(h => (
                          <SelectItem key={h.id} value={h.id}>
                            Casa {h.houseNumber}{h.address ? ` — ${h.address}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedHouseId && (
                      <Button variant="outline" size="sm" onClick={() => loadHouseHistory(selectedHouseId)} disabled={houseHistoryLoading}>
                        <RefreshCw className={`h-4 w-4 ${houseHistoryLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {houseHistoryLoading && (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              )}

              {houseHistory && !houseHistoryLoading && (
                <>
                  {/* Monthly payments history */}
                  <Card className="shadow-card">
                    <CardHeader><CardTitle className="font-serif text-base flex items-center gap-2"><Banknote className="h-4 w-4 text-primary" /> Cuotas mensuales</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      {houseHistory.payments.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4">Sin registros de cuotas para esta casa.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Periodo</TableHead>
                                <TableHead>Residente</TableHead>
                                <TableHead>Monto</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="hidden md:table-cell">Fecha pago</TableHead>
                                <TableHead className="hidden md:table-cell">Notas</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {houseHistory.payments.map(p => (
                                <TableRow key={p.id}>
                                  <TableCell className="font-medium">{MONTHS[p.month - 1]} {p.year}</TableCell>
                                  <TableCell className="text-muted-foreground">{p.user ? `${p.user.name} ${p.user.lastName}` : p.userId}</TableCell>
                                  <TableCell>${Number(p.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell>{statusBadge(p.status)}</TableCell>
                                  <TableCell className="hidden md:table-cell text-muted-foreground">{p.paidAt ? new Date(p.paidAt + 'T00:00:00').toLocaleDateString('es-MX') : '—'}</TableCell>
                                  <TableCell className="hidden md:table-cell text-muted-foreground max-w-[150px] truncate">{p.notes || '—'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Extraordinary income history */}
                  <Card className="shadow-card">
                    <CardHeader><CardTitle className="font-serif text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Ingresos extraordinarios</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      {houseHistory.extraordinary.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4">Sin ingresos extraordinarios para esta casa.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Concepto</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Monto</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead className="hidden md:table-cell">Notas</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {houseHistory.extraordinary.map(ext => (
                                <TableRow key={ext.id}>
                                  <TableCell className="font-medium">{ext.concept}</TableCell>
                                  <TableCell><Badge variant="outline">{ext.category}</Badge></TableCell>
                                  <TableCell>${Number(ext.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-muted-foreground">{new Date(ext.date + 'T00:00:00').toLocaleDateString('es-MX')}</TableCell>
                                  <TableCell className="hidden md:table-cell text-muted-foreground max-w-[150px] truncate">{ext.notes || '—'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          )}

          {/* ─── Tab: Deudores ────────────────────────────────────── */}
          {canManage && (
            <TabsContent value="deudores" className="space-y-6">

              {/* Policy Config */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-serif text-lg flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-primary" /> Política de Cuotas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Día de vencimiento (mes)</Label>
                      <Input
                        type="number" min={1} max={31}
                        value={policyForm.dueDay}
                        onChange={e => setPolicyForm(f => ({ ...f, dueDay: parseInt(e.target.value) || 1 }))}
                      />
                      <p className="text-xs text-muted-foreground">Las cuotas vencen el día {policyForm.dueDay} de cada mes</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" /> Suspensión app (meses)</Label>
                      <Input
                        type="number" min={1}
                        value={policyForm.mobileLockMonths}
                        onChange={e => setPolicyForm(f => ({ ...f, mobileLockMonths: parseInt(e.target.value) || 1 }))}
                      />
                      <p className="text-xs text-muted-foreground">Acceso móvil suspendido a partir de {policyForm.mobileLockMonths} mes(es) de adeudo</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> Suspensión tarjeta (meses)</Label>
                      <Input
                        type="number" min={1}
                        value={policyForm.cardLockMonths}
                        onChange={e => setPolicyForm(f => ({ ...f, cardLockMonths: parseInt(e.target.value) || 1 }))}
                      />
                      <p className="text-xs text-muted-foreground">Tarjeta suspendida a partir de {policyForm.cardLockMonths} mes(es) de adeudo</p>
                    </div>
                  </div>
                  {policy && (
                    <p className="text-xs text-muted-foreground">
                      Política actual: vence día <strong>{policy.dueDay}</strong> · app suspende a <strong>{policy.mobileLockMonths}</strong> mes(es) · tarjeta a <strong>{policy.cardLockMonths}</strong> mes(es)
                    </p>
                  )}
                  <div className="flex justify-end">
                    <Button onClick={handleSavePolicy} disabled={policyLoading} className="gap-2">
                      {policyLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar política'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Debtors Table */}
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="font-serif text-lg flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-red-500" />
                    Residentes con adeudo
                    {debtors.length > 0 && <span className="text-sm font-normal text-muted-foreground">— {debtors.length} con pagos pendientes</span>}
                  </CardTitle>
                  <Button variant="outline" size="sm" className="gap-2" onClick={loadDebtors} disabled={debtorsLoading}>
                    <RefreshCw className={`h-4 w-4 ${debtorsLoading ? 'animate-spin' : ''}`} /> Actualizar
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {debtorsLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : debtors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <CheckCircle2 className="h-12 w-12 text-green-400" />
                      <p className="mt-4 text-lg font-medium">Sin adeudos</p>
                      <p className="text-sm text-muted-foreground">Todos los residentes están al corriente</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-6" />
                            <TableHead>Residente</TableHead>
                            <TableHead className="hidden sm:table-cell">Casa</TableHead>
                            <TableHead>Meses adeudo</TableHead>
                            <TableHead>Estado acceso</TableHead>
                            <TableHead className="hidden md:table-cell">Monto total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {debtors.map(d => {
                            const rowBg =
                              d.accessStatus === 'card_suspended' ? 'bg-red-50 dark:bg-red-950/30' :
                              d.accessStatus === 'mobile_suspended' ? 'bg-orange-50 dark:bg-orange-950/30' :
                              'bg-amber-50 dark:bg-amber-950/30';
                            const isExpanded = expandedDebtor === d.userId;
                            const totalAmount = d.pendingPayments.reduce((s, p) => s + p.amount, 0);
                            return (
                              <>
                                <TableRow key={d.userId} className={`${rowBg} cursor-pointer`} onClick={() => setExpandedDebtor(isExpanded ? null : d.userId)}>
                                  <TableCell className="pr-0">
                                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium">{d.userName}</div>
                                    <div className="text-xs text-muted-foreground">{d.userEmail}</div>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                                    {d.houseNumber || '—'}
                                    {d.houseAddress && <span className="text-xs ml-1">· {d.houseAddress}</span>}
                                  </TableCell>
                                  <TableCell>
                                    <span className={`font-bold text-lg ${
                                      d.accessStatus === 'card_suspended' ? 'text-red-600' :
                                      d.accessStatus === 'mobile_suspended' ? 'text-orange-600' :
                                      'text-amber-600'
                                    }`}>{d.pendingMonths}</span>
                                    <span className="text-xs text-muted-foreground ml-1">mes(es)</span>
                                  </TableCell>
                                  <TableCell>
                                    {d.accessStatus === 'card_suspended' && (
                                      <Badge className="gap-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300">
                                        <CreditCard className="h-3 w-3" /> Tarjeta suspendida
                                      </Badge>
                                    )}
                                    {d.accessStatus === 'mobile_suspended' && (
                                      <Badge className="gap-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300">
                                        <Smartphone className="h-3 w-3" /> App suspendida
                                      </Badge>
                                    )}
                                    {d.accessStatus === 'active' && (
                                      <Badge className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-300">
                                        <Clock className="h-3 w-3" /> En aviso
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell font-medium">
                                    ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                  </TableCell>
                                </TableRow>
                                {isExpanded && (
                                  <TableRow key={`${d.userId}-detail`} className={rowBg}>
                                    <TableCell colSpan={6} className="py-2 px-6">
                                      <div className="flex flex-wrap gap-2 text-xs">
                                        {d.pendingPayments.map((p, i) => (
                                          <span key={i} className="rounded bg-white dark:bg-gray-800 border px-2 py-0.5 text-muted-foreground">
                                            {MONTHS_FULL[p.month - 1]} {p.year} — ${p.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                          </span>
                                        ))}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm bg-amber-200" /> En aviso (según política)</div>
                <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm bg-orange-200" /> App suspendida</div>
                <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm bg-red-200" /> Tarjeta suspendida</div>
              </div>

            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Import payments dialog */}
      <Dialog open={importOpen} onOpenChange={v => { setImportOpen(v); if (!v) setImportPreviewRows([]); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Importar pagos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Format info */}
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Formato del archivo CSV / XLS</p>
              <p>Columnas: <code className="bg-muted rounded px-1">Email, Mes, Año, Fecha de pago, Notas</code></p>
              <p>Ejemplo CSV: <code className="bg-muted rounded px-1">juan@email.com,3,2026,2026-03-10,Recibo #45</code></p>
              <p>Acepta .csv, .xlsx, .xls. La primera fila puede ser encabezado (se omite). Fecha y notas son opcionales.</p>
            </div>

            {/* File picker */}
            <div className="flex items-center gap-3">
              <input
                ref={importFileRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                className="hidden"
                onChange={handleImportFileChange}
              />
              <Button variant="outline" className="gap-2" onClick={() => importFileRef.current?.click()}>
                <Upload className="h-4 w-4" /> Seleccionar archivo CSV / XLS
              </Button>
              {importPreviewRows.length > 0 && (
                <span className="text-sm text-muted-foreground">{importPreviewRows.length} registros detectados</span>
              )}
            </div>

            {/* Preview table */}
            {importPreviewRows.length > 0 && (
              <div className="rounded-lg border overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Mes</TableHead>
                        <TableHead className="text-xs">Año</TableHead>
                        <TableHead className="text-xs">Fecha pago</TableHead>
                        <TableHead className="text-xs">Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreviewRows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{r.email}</TableCell>
                          <TableCell className="text-xs">{MONTHS_SHORT[r.month - 1] ?? r.month}</TableCell>
                          <TableCell className="text-xs">{r.year}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{r.paidAt || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{r.notes || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
              <Button onClick={handleImportPayments} disabled={importPreviewRows.length === 0 || importLoading}>
                {importLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando...</> : `Importar ${importPreviewRows.length > 0 ? importPreviewRows.length + ' registros' : ''}`}
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

      {/* Delete ALL payments confirmation */}
      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Eliminar todos los pagos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive space-y-2">
              <p className="font-semibold">Esta accion es irreversible.</p>
              <p>Se eliminaran <strong>todos</strong> los registros de pago de todos los meses y años. Utiliza esta opcion solo para reiniciar el sistema desde cero.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteAllOpen(false)} disabled={deleteAllLoading}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDeleteAll} disabled={deleteAllLoading}>
                {deleteAllLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminando...</> : 'Eliminar todos los pagos'}
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

      {/* Extraordinary income create/edit dialog */}
      <Dialog open={extDialogOpen} onOpenChange={setExtDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingExt ? 'Editar ingreso' : 'Nuevo ingreso extraordinario'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Concepto *</Label>
              <Input value={extForm.concept} onChange={e => setExtForm(f => ({ ...f, concept: e.target.value }))} placeholder="Ej. Multa por ruido..." />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Textarea value={extForm.description} onChange={e => setExtForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Descripción opcional..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Monto *</Label>
                <Input type="number" min={0} step={0.01} value={extForm.amount} onChange={e => setExtForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label>Fecha *</Label>
                <Input type="date" value={extForm.date} onChange={e => setExtForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Categoría</Label>
                <Select value={extForm.category} onValueChange={v => setExtForm(f => ({ ...f, category: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="multa">Multa</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="obra">Obra</SelectItem>
                    <SelectItem value="cuota_especial">Cuota especial</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Casa (opcional)</Label>
                <Select value={extForm.houseId || '_'} onValueChange={v => setExtForm(f => ({ ...f, houseId: v === '_' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="General" /></SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="_">General</SelectItem>
                    {houses.map(h => <SelectItem key={h.id} value={h.id}>Casa {h.houseNumber}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input value={extForm.notes} onChange={e => setExtForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas opcionales..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setExtDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleExtSubmit} disabled={extSaving}>{extSaving ? 'Guardando...' : editingExt ? 'Guardar cambios' : 'Crear ingreso'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete extraordinary confirmation */}
      <Dialog open={!!deleteExt} onOpenChange={() => setDeleteExt(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar ingreso extraordinario</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">¿Estás seguro de eliminar <strong>{deleteExt?.concept}</strong>? Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteExt(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleExtDelete}>Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply promotion dialog */}
      <Dialog open={applyPromoOpen} onOpenChange={setApplyPromoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Aplicar promoción</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Casa</Label>
              <Select value={applyPromoForm.houseId} onValueChange={v => setApplyPromoForm(f => ({ ...f, houseId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona una casa..." /></SelectTrigger>
                <SelectContent position="popper">
                  {houses.map(h => <SelectItem key={h.id} value={h.id}>Casa {h.houseNumber}{h.address ? ` — ${h.address}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Promoción</Label>
              <Select value={applyPromoForm.promotionId} onValueChange={v => setApplyPromoForm(f => ({ ...f, promotionId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona una promoción..." /></SelectTrigger>
                <SelectContent position="popper">
                  {promotions.filter(p => p.isActive).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.monthCount} mes(es) {p.discountPercentage}% desc.</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Mes inicio</Label>
                <Select value={String(applyPromoForm.startMonth)} onValueChange={v => setApplyPromoForm(f => ({ ...f, startMonth: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent position="popper">{MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Año inicio</Label>
                <Input type="number" value={applyPromoForm.startYear} onChange={e => setApplyPromoForm(f => ({ ...f, startYear: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Fecha de pago (opcional)</Label>
              <Input type="date" value={applyPromoForm.paidAt} onChange={e => setApplyPromoForm(f => ({ ...f, paidAt: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApplyPromoOpen(false)}>Cancelar</Button>
              <Button onClick={handleApplyPromo} disabled={applyPromoSaving}>{applyPromoSaving ? 'Aplicando...' : 'Aplicar'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
