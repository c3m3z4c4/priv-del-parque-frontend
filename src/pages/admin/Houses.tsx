import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { TenantGuard } from '@/components/TenantGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Home, Search, Download } from 'lucide-react';
import { useHousesQuery, useCreateHouse, useUpdateHouse, useDeleteHouse } from '@/hooks/useApi';
import { House } from '@/types';
import { HouseFormDialog } from '@/components/admin/HouseFormDialog';
import { DeleteHouseDialog } from '@/components/admin/DeleteHouseDialog';
import { DataTable } from '@/components/admin/DataTable';
import { exportToCSV } from '@/lib/exportCSV';
import { useToast } from '@/hooks/use-toast';

export default function AdminHouses() {
  const { data: houses = [], isLoading } = useHousesQuery();
  const createHouse = useCreateHouse();
  const updateHouse = useUpdateHouse();
  const deleteHouse = useDeleteHouse();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const handleCreate = () => { setSelectedHouse(null); setFormOpen(true); };
  const handleEdit = (house: House) => { setSelectedHouse(house); setFormOpen(true); };
  const handleDeleteClick = (house: House) => { setSelectedHouse(house); setDeleteOpen(true); };

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      if (selectedHouse) {
        await updateHouse.mutateAsync({ id: selectedHouse.id, data });
        toast({ title: 'Casa actualizada', description: `Casa ${data.houseNumber} actualizada correctamente.` });
      } else {
        await createHouse.mutateAsync(data as Parameters<typeof createHouse.mutateAsync>[0]);
        toast({ title: 'Casa creada', description: `Casa ${data.houseNumber} registrada correctamente.` });
      }
      setFormOpen(false);
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la casa.', variant: 'destructive' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (selectedHouse) {
      try {
        await deleteHouse.mutateAsync(selectedHouse.id);
        toast({ title: 'Casa eliminada', description: `Casa ${selectedHouse.houseNumber} eliminada.`, variant: 'destructive' });
        setDeleteOpen(false);
        setSelectedHouse(null);
      } catch {
        toast({ title: 'Error', description: 'No se pudo eliminar la casa.', variant: 'destructive' });
      }
    }
  };

  const getResidentsDisplay = (house: House) =>
    house.residents?.map(r => `${r.name} ${r.lastName}`).join(', ') || '—';

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...houses]
      .filter(h => {
        if (q && !h.houseNumber.toLowerCase().includes(q)) return false;
        if (statusFilter !== 'all' && h.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => a.houseNumber.localeCompare(b.houseNumber));
  }, [houses, search, statusFilter]);

  const activeCount = houses.filter(h => h.status === 'active').length;

  const columns = useMemo<ColumnDef<House>[]>(() => [
    {
      accessorKey: 'houseNumber',
      header: 'Número',
      cell: ({ row }) => <span className="font-medium">{row.original.houseNumber}</span>,
    },
    {
      id: 'residentes',
      header: 'Residentes',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{getResidentsDisplay(row.original)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'}>
          {row.original.status === 'active' ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Registro',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.createdAt}</span>,
      meta: { className: 'hidden md:table-cell', headerClassName: 'hidden md:table-cell' },
    },
    {
      id: 'acciones',
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(row.original)}>
            <Trash2 className="h-4 w-4 text-destructive" />
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Gestión de Casas</h1>
            <p className="text-muted-foreground">{houses.length} casas · {activeCount} activas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => exportToCSV(filtered, [
              { key: 'houseNumber', header: 'Número' },
              { key: 'status', header: 'Estado' }, { key: 'createdAt', header: 'Registro' },
            ], 'casas')} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" /> Nueva Casa</Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por número..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={filtered}
              isLoading={isLoading}
              emptyState={
                houses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Home className="h-12 w-12 text-muted-foreground/40" />
                    <p className="mt-4 text-lg font-medium">No hay casas registradas</p>
                    <p className="text-sm text-muted-foreground">Registra la primera casa</p>
                    <Button onClick={handleCreate} className="mt-4 gap-2" variant="outline">
                      <Plus className="h-4 w-4" /> Nueva Casa
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Search className="h-10 w-10 text-muted-foreground/40" />
                    <p className="mt-3 text-sm text-muted-foreground">No se encontraron resultados</p>
                  </div>
                )
              }
            />
          </CardContent>
        </Card>
      </div>

      <HouseFormDialog open={formOpen} onOpenChange={setFormOpen} house={selectedHouse} onSubmit={handleSubmit} />
      <DeleteHouseDialog open={deleteOpen} onOpenChange={setDeleteOpen} house={selectedHouse} onConfirm={handleDeleteConfirm} />
      </TenantGuard>
    </AdminLayout>
  );
}
