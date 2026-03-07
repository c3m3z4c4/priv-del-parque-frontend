import { useState, useMemo } from 'react';
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
import { Plus, Pencil, Trash2, Home, Search, Download, Upload, Loader2 } from 'lucide-react';
import { useHouses } from '@/hooks/useDataStore';
import { House } from '@/types';
import { CreateHousePayload, UpdateHousePayload, housesApi } from '@/lib/api';
import { HouseFormDialog } from '@/components/admin/HouseFormDialog';
import { DeleteHouseDialog } from '@/components/admin/DeleteHouseDialog';
import { TablePagination, paginate } from '@/components/admin/TablePagination';
import { exportToCSV } from '@/lib/exportCSV';
import { useToast } from '@/hooks/use-toast';

// ─── Import dialog ────────────────────────────────────────────────────────────
const CSV_PLACEHOLDER = `A-01,Calle del Parque 1
A-02,Calle del Parque 2
B-01
B-02,Av. Principal 10`;

function ImportHousesDialog({
  open, onOpenChange, onImported,
}: { open: boolean; onOpenChange: (v: boolean) => void; onImported: () => void }) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const preview = useMemo(() => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [houseNumber, ...rest] = line.split(',');
        return { houseNumber: houseNumber.trim(), address: rest.join(',').trim() || undefined };
      })
      .filter(h => h.houseNumber);
  }, [text]);

  const handleImport = async () => {
    if (preview.length === 0) return;
    setLoading(true);
    try {
      const result = await housesApi.import(preview);
      toast({
        title: 'Importación completada',
        description: `${result.created} casas creadas, ${result.skipped} omitidas${result.skippedNumbers.length ? ` (${result.skippedNumbers.join(', ')})` : ''}.`,
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
          <DialogTitle className="font-serif">Importar casas por lista</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Lista de casas <span className="text-muted-foreground text-xs">(una por línea: número,dirección)</span></Label>
            <Textarea
              rows={8}
              placeholder={CSV_PLACEHOLDER}
              value={text}
              onChange={e => setText(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          {preview.length > 0 && (
            <div className="rounded-lg border">
              <p className="px-3 pt-2 text-xs text-muted-foreground font-medium">Vista previa — {preview.length} casas</p>
              <div className="max-h-40 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Número</TableHead>
                      <TableHead className="text-xs">Dirección</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 10).map((h, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-medium">{h.houseNumber}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{h.address || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {preview.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-xs text-muted-foreground text-center">
                          +{preview.length - 10} más...
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
            <Button onClick={handleImport} disabled={preview.length === 0 || loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando...</> : `Importar ${preview.length} casas`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminHouses() {
  const { houses, isLoading, addHouse, updateHouse, deleteHouse, refetch } = useHouses();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleCreate = () => { setSelectedHouse(null); setFormOpen(true); };
  const handleEdit = (house: House) => { setSelectedHouse(house); setFormOpen(true); };
  const handleDeleteClick = (house: House) => { setSelectedHouse(house); setDeleteOpen(true); };

  const handleSubmit = async (data: CreateHousePayload | UpdateHousePayload) => {
    try {
      if (selectedHouse) {
        await updateHouse(selectedHouse.id, data as UpdateHousePayload);
        toast({ title: 'Casa actualizada', description: `Casa ${data.houseNumber} actualizada correctamente.` });
      } else {
        await addHouse(data as CreateHousePayload);
        toast({ title: 'Casa creada', description: `Casa ${data.houseNumber} registrada correctamente.` });
      }
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
    return [...houses]
      .filter(h => {
        if (q && !h.houseNumber.toLowerCase().includes(q) && !(h.address ?? '').toLowerCase().includes(q)) return false;
        if (statusFilter !== 'all' && h.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => a.houseNumber.localeCompare(b.houseNumber));
  }, [houses, search, statusFilter]);

  const activeCount = houses.filter(h => h.status === 'active').length;

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Gestión de Casas</h1>
            <p className="text-muted-foreground">{houses.length} casas · {activeCount} activas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => exportToCSV(filtered, [
              { key: 'houseNumber', header: 'Número' }, { key: 'address', header: 'Dirección' },
              { key: 'status', header: 'Estado' }, { key: 'createdAt', header: 'Registro' },
            ], 'casas')} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Importar
            </Button>
            <Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" /> Nueva Casa</Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por número o dirección..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead className="hidden sm:table-cell">Dirección</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="hidden md:table-cell">Registro</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginate(filtered, page, pageSize).map(house => (
                      <TableRow key={house.id}>
                        <TableCell className="font-medium">{house.houseNumber}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{house.address || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={house.status === 'active' ? 'default' : 'secondary'}>
                            {house.status === 'active' ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {new Date(house.createdAt).toLocaleDateString('es-MX')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(house)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(house)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination totalItems={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <HouseFormDialog open={formOpen} onOpenChange={setFormOpen} house={selectedHouse} onSubmit={handleSubmit} />
      <DeleteHouseDialog open={deleteOpen} onOpenChange={setDeleteOpen} house={selectedHouse} onConfirm={handleDeleteConfirm} />
      <ImportHousesDialog open={importOpen} onOpenChange={setImportOpen} onImported={refetch} />
    </AdminLayout>
  );
}
