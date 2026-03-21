import { useState, useMemo, useRef } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Home, Search, Download, Upload, Loader2, Users, FileText } from 'lucide-react';
import { useSortable, applySortLocale } from '@/hooks/useSortable';
import { SortableHead } from '@/components/admin/SortableHead';
import { useHouses, useUsers } from '@/hooks/useDataStore';
import { House } from '@/types';
import { CreateHousePayload, UpdateHousePayload, housesApi } from '@/lib/api';
import { HouseFormDialog, HouseFormSubmitData } from '@/components/admin/HouseFormDialog';
import { DeleteHouseDialog } from '@/components/admin/DeleteHouseDialog';
import { TablePagination, paginate } from '@/components/admin/TablePagination';
import { useToast } from '@/hooks/use-toast';
import { exportBrandedPDF } from '@/lib/exportPDF';
import logo from '@/assets/logo.png';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportHousesCSV(houses: House[]) {
  const BOM = '\uFEFF';
  const headers = ['Número', 'Calle', 'Estado', 'Registro', 'Residentes', 'Emails residentes'];
  const rows = houses.map(h => {
    const residents = h.residents ?? [];
    const names = residents.map(r => `${r.name} ${r.lastName}`).join('; ');
    const emails = residents.map(r => r.email).join('; ');
    return [
      escapeCSV(h.houseNumber),
      escapeCSV(h.address ?? ''),
      escapeCSV(h.status === 'active' ? 'Activa' : 'Inactiva'),
      escapeCSV(new Date(h.createdAt).toLocaleDateString('es-MX')),
      escapeCSV(names),
      escapeCSV(emails),
    ].join(',');
  });

  const csv = BOM + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `casas_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportHousesPDF(houses: House[]) {
  const rows = houses.map(h => {
    const residents = h.residents ?? [];
    const names = residents.length > 0 ? residents.map(r => `${r.name} ${r.lastName}`).join(', ') : '—';
    return [
      h.houseNumber,
      h.address || '—',
      h.status === 'active' ? 'Activa' : 'Inactiva',
      names,
      new Date(h.createdAt).toLocaleDateString('es-MX'),
    ];
  });
  exportBrandedPDF({
    title: 'Directorio de Casas',
    subtitle: `Reporte generado — ${houses.length} casas`,
    logoUrl: logo,
    columns: ['Número', 'Calle', 'Estado', 'Residentes', 'Registro'],
    rows,
  });
}

// ─── Import dialog ────────────────────────────────────────────────────────────
const CSV_PLACEHOLDER = `A-01,Calle del Parque 1
A-02,Calle del Parque 2
B-01
B-02,Av. Principal 10`;

// Parse a CSV line respecting quoted fields
function parseCSVLine(line: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === ',' && !inQuote) {
      cols.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

interface PreviewRow {
  houseNumber: string;
  address?: string;
  residentEmails: string[];
  duplicate: boolean;
}

function ImportHousesDialog({
  open, onOpenChange, onImported, existingNumbers, users,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
  existingNumbers: Set<string>;
  users: import('@/types').User[];
}) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = useMemo<PreviewRow[]>(() => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        // Columns: 0=Número, 1=Calle, 2=Estado, 3=Registro, 4=Residentes, 5=Emails
        const cols = parseCSVLine(line);
        const houseNumber = cols[0] ?? '';
        const address = cols[1] || undefined;
        // Col 5 = semicolon-separated emails (from our own CSV export)
        // Filter strictly to valid email-shaped values so "Sin residentes" or "—" are ignored
        const residentEmails = (cols[5] ?? '')
          .split(';')
          .map(e => e.trim())
          .filter(e => e.includes('@') && e.includes('.'));
        return { houseNumber, address, residentEmails, duplicate: existingNumbers.has(houseNumber) };
      })
      .filter(h => h.houseNumber);
  }, [text, existingNumbers]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = (ev.target?.result as string) ?? '';
      const cleaned = content.replace(/^\uFEFF/, '');
      const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
      const firstCell = parseCSVLine(lines[0] ?? '')[0]?.toLowerCase() ?? '';
      const isHeader = ['número', 'numero', 'housenuaber', 'house', 'casa'].some(k => firstCell.includes(k));
      setText((isHeader ? lines.slice(1) : lines).join('\n'));
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleImport = async () => {
    const newRows = preview.filter(h => !h.duplicate);
    if (newRows.length === 0) return;
    setLoading(true);
    try {
      // 1. Bulk-create houses
      const result = await housesApi.import(newRows.map(r => ({ houseNumber: r.houseNumber, address: r.address })));

      // 2. Assign residents for rows that have emails
      const rowsWithEmails = newRows.filter(r => r.residentEmails.length > 0);
      if (rowsWithEmails.length > 0) {
        // Fetch the freshly-created houses to get their IDs
        const allHouses = await housesApi.getAll();
        const emailIndex = new Map(users.map(u => [u.email.toLowerCase(), u.id]));

        await Promise.all(
          rowsWithEmails.map(row => {
            const house = allHouses.find(h => h.houseNumber === row.houseNumber);
            if (!house) return Promise.resolve();
            const userIds = row.residentEmails
              .map(e => emailIndex.get(e.toLowerCase()))
              .filter((id): id is string => !!id);
            if (userIds.length === 0) return Promise.resolve();
            return housesApi.assignResidents(house.id, userIds);
          })
        );
      }

      toast({
        title: 'Importación completada',
        description: `${result.created} casas creadas${result.skipped ? `, ${result.skipped} omitidas` : ''}${rowsWithEmails.length ? `. Residentes asignados.` : ''}.`,
      });
      setText('');
      onOpenChange(false);
      onImported();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Importar casas por CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* File upload */}
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
            <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Subir archivo .csv
            </Button>
            <span className="text-xs text-muted-foreground">o pega el contenido abajo</span>
          </div>

          <div className="space-y-1">
            <Label>
              Lista de casas{' '}
              <span className="text-muted-foreground text-xs">(una por línea: número,calle)</span>
            </Label>
            <Textarea
              rows={7}
              placeholder={CSV_PLACEHOLDER}
              value={text}
              onChange={e => setText(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          {preview.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                <p className="text-xs font-medium text-muted-foreground">
                  Vista previa — {preview.length} casas
                </p>
                <div className="flex gap-3 text-xs">
                  <span className="text-green-700 font-medium">
                    {preview.filter(h => !h.duplicate).length} nuevas
                  </span>
                  {preview.some(h => h.duplicate) && (
                    <span className="text-amber-600 font-medium">
                      {preview.filter(h => h.duplicate).length} duplicadas
                    </span>
                  )}
                </div>
              </div>
              <div className="max-h-44 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Número</TableHead>
                      <TableHead className="text-xs">Calle</TableHead>
                      <TableHead className="text-xs">Residentes</TableHead>
                      <TableHead className="text-xs">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 15).map((h, i) => (
                      <TableRow key={i} className={h.duplicate ? 'opacity-60' : ''}>
                        <TableCell className="text-xs font-medium">{h.houseNumber}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{h.address || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {h.residentEmails.length > 0 ? h.residentEmails.join(', ') : '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {h.duplicate
                            ? <span className="text-amber-600 font-medium">Duplicada</span>
                            : <span className="text-green-700 font-medium">Nueva</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                    {preview.length > 15 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-xs text-muted-foreground text-center">
                          +{preview.length - 15} más...
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleImport} disabled={preview.filter(h => !h.duplicate).length === 0 || loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando...</>
              ) : (
                `Importar ${preview.filter(h => !h.duplicate).length} casas nuevas`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AdminHouses() {
  const { houses, isLoading, addHouse, updateHouse, deleteHouse, refetch } = useHouses();
  const { users } = useUsers();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { sortCol, sortDir, handleSort } = useSortable('address');

  const handleCreate = () => { setSelectedHouse(null); setFormOpen(true); };
  const handleEdit = (house: House) => { setSelectedHouse(house); setFormOpen(true); };
  const handleDeleteClick = (house: House) => { setSelectedHouse(house); setDeleteOpen(true); };

  const handleSubmit = async (data: HouseFormSubmitData) => {
    const { residentIds, ...houseData } = data;
    try {
      let savedHouse: House;
      if (selectedHouse) {
        savedHouse = await updateHouse(selectedHouse.id, houseData as UpdateHousePayload);
        toast({ title: 'Casa actualizada', description: `Casa ${houseData.houseNumber} actualizada correctamente.` });
      } else {
        savedHouse = await addHouse(houseData as CreateHousePayload);
        toast({ title: 'Casa creada', description: `Casa ${houseData.houseNumber} registrada correctamente.` });
      }
      await housesApi.assignResidents(savedHouse.id, residentIds);
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Ocurrió un error.', variant: 'destructive' });
      throw err;
    }
  };

  const handleDeleteConfirm = async () => {
    if (selectedHouse) {
      try {
        await deleteHouse(selectedHouse.id);
        toast({ title: 'Casa eliminada', description: `Casa ${selectedHouse.houseNumber} eliminada.`, variant: 'destructive' });
        setDeleteOpen(false);
        setSelectedHouse(null);
      } catch (err: any) {
        toast({ title: 'Error', description: err.message || 'No se pudo eliminar.', variant: 'destructive' });
      }
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return houses.filter(h => {
      if (q) {
        const residentMatch = (h.residents ?? []).some(
          r => `${r.name} ${r.lastName}`.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
        );
        if (!h.houseNumber.toLowerCase().includes(q) && !(h.address ?? '').toLowerCase().includes(q) && !residentMatch)
          return false;
      }
      if (statusFilter !== 'all' && h.status !== statusFilter) return false;
      return true;
    });
  }, [houses, search, statusFilter]);

  const displayed = useMemo(() =>
    applySortLocale(filtered, sortCol, sortDir, (h, col) => {
      if (col === 'houseNumber') return h.houseNumber;
      if (col === 'address') return h.address ?? '';
      if (col === 'status') return h.status === 'active' ? 'Activa' : 'Inactiva';
      if (col === 'residents') return h.residents?.length ?? 0;
      if (col === 'createdAt') return h.createdAt;
      return '';
    }),
  [filtered, sortCol, sortDir]);

  const activeCount = houses.filter(h => h.status === 'active').length;
  const occupiedCount = houses.filter(h => (h.residents?.length ?? 0) > 0).length;

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold">Gestión de Casas</h1>
            <p className="text-muted-foreground">
              {houses.length} casas · {activeCount} activas · {occupiedCount} con residentes
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => exportHousesPDF(filtered)}
              disabled={filtered.length === 0}
            >
              <FileText className="h-4 w-4" /> Exportar PDF
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => exportHousesCSV(filtered)}
              disabled={filtered.length === 0}
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Importar CSV
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> Nueva Casa
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, dirección o residente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="inactive">Inactivas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif">
              <Home className="h-5 w-5" /> Directorio de Casas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {houses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Home className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-lg font-medium">No hay casas registradas</p>
                <Button onClick={handleCreate} className="mt-4 gap-2" variant="outline">
                  <Plus className="h-4 w-4" /> Crear casa
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Search className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">No se encontraron resultados</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableHead label="Número" colKey="houseNumber" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                        <SortableHead label="Calle" colKey="address" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
                        <SortableHead label="Estado" colKey="status" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                        <SortableHead label="Residentes" colKey="residents" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                        <SortableHead label="Registro" colKey="createdAt" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginate(displayed, page, pageSize).map(house => {
                        const residents = house.residents ?? [];
                        return (
                          <TableRow key={house.id}>
                            <TableCell className="font-medium">{house.houseNumber}</TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                              {house.address || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={house.status === 'active' ? 'default' : 'secondary'}>
                                {house.status === 'active' ? 'Activa' : 'Inactiva'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {residents.length === 0 ? (
                                <span className="text-xs text-muted-foreground">Sin residentes</span>
                              ) : (
                                <div className="space-y-0.5">
                                  {residents.slice(0, 2).map(r => (
                                    <div key={r.id} className="text-xs">
                                      <span className="font-medium">{r.name} {r.lastName}</span>
                                    </div>
                                  ))}
                                  {residents.length > 2 && (
                                    <span className="text-xs text-muted-foreground">
                                      +{residents.length - 2} más
                                    </span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">
                              {new Date(house.createdAt).toLocaleDateString('es-MX')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(house)} title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(house)} title="Eliminar">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  totalItems={displayed.length}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <HouseFormDialog open={formOpen} onOpenChange={setFormOpen} house={selectedHouse} users={users} onSubmit={handleSubmit} />
      <DeleteHouseDialog open={deleteOpen} onOpenChange={setDeleteOpen} house={selectedHouse} onConfirm={handleDeleteConfirm} />
      <ImportHousesDialog open={importOpen} onOpenChange={setImportOpen} onImported={refetch} existingNumbers={new Set(houses.map(h => h.houseNumber))} users={users} />
    </AdminLayout>
  );
}
