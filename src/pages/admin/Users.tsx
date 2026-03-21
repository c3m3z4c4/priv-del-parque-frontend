import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { UserFormDialog } from '@/components/admin/UserFormDialog';
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog';
import { TablePagination, paginate } from '@/components/admin/TablePagination';
import { useUsers, useHouses } from '@/hooks/useDataStore';
import { exportBrandedPDF } from '@/lib/exportPDF';
import logo from '@/assets/logo.png';
import { User } from '@/types';
import { CreateUserPayload, UpdateUserPayload } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Users as UsersIcon, Loader2, Shield, Home, Search, FileText, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminUsers() {
  const { users, isLoading, addUser, updateUser, deleteUser } = useUsers();
  const { houses } = useHouses();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'ADMIN' | 'VECINO' | 'SUPER_ADMIN'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleCreate = () => { setSelectedUser(null); setFormOpen(true); };
  const handleEdit = (u: User) => { setSelectedUser(u); setFormOpen(true); };
  const handleDelete = (u: User) => { setSelectedUser(u); setDeleteOpen(true); };

  const handleFormSubmit = async (data: CreateUserPayload | UpdateUserPayload) => {
    try {
      if (selectedUser) {
        await updateUser(selectedUser.id, data as UpdateUserPayload);
        toast({ title: 'Usuario actualizado', description: `"${data.name}" se actualizó correctamente.` });
      } else {
        const created = await addUser(data as CreateUserPayload);
        toast({ title: 'Usuario creado', description: `"${created.name}" se creó correctamente.` });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Ocurrió un error.', variant: 'destructive' });
      throw err;
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedUser) {
      try {
        await deleteUser(selectedUser.id);
        toast({ title: 'Usuario eliminado', description: `"${selectedUser.name}" fue eliminado.`, variant: 'destructive' });
        setDeleteOpen(false);
        setSelectedUser(null);
      } catch (err: any) {
        toast({ title: 'Error', description: err.message || 'No se pudo eliminar.', variant: 'destructive' });
      }
    }
  };

  const getHouseNumber = (houseId?: string) => {
    if (!houseId) return '—';
    return houses.find(h => h.id === houseId)?.houseNumber || '—';
  };

  const roleBadge = (role: string) => {
    if (role === 'SUPER_ADMIN') return <Badge className="gap-1 bg-purple-600 hover:bg-purple-700"><Star className="h-3 w-3" /> Super Admin</Badge>;
    if (role === 'ADMIN') return <Badge variant="default" className="gap-1"><Shield className="h-3 w-3" /> Admin</Badge>;
    return <Badge variant="secondary" className="gap-1"><Home className="h-3 w-3" /> Vecino</Badge>;
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => {
      const fullName = `${u.name} ${u.lastName}`.toLowerCase();
      if (q && !fullName.includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      return true;
    });
  }, [users, search, roleFilter]);

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">
              {users.length} {users.length === 1 ? 'usuario registrado' : 'usuarios registrados'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => {
              const houseMap = Object.fromEntries(houses.map(h => [h.id, h.houseNumber]));
              const roleLabel = (r: string) => r === 'SUPER_ADMIN' ? 'Super Admin' : r === 'ADMIN' ? 'Admin' : r;
              exportBrandedPDF({
                title: 'Directorio de Usuarios',
                subtitle: `Reporte de residentes — ${filtered.length} usuarios`,
                logoUrl: logo,
                columns: ['Nombre', 'Email', 'Rol', 'Teléfono', 'Casa'],
                rows: filtered.map(u => [
                  `${u.name} ${u.lastName}`,
                  u.email,
                  roleLabel(u.role),
                  u.phone || '—',
                  u.houseId ? (houseMap[u.houseId] || '—') : '—',
                ]),
              });
            }} disabled={filtered.length === 0}>
              <FileText className="h-4 w-4" /> Exportar PDF
            </Button>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Nuevo Usuario
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="VECINO">Vecino</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <UsersIcon className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-lg font-medium">No hay usuarios</p>
                <p className="text-sm text-muted-foreground">Registra el primer usuario</p>
                <Button onClick={handleCreate} className="mt-4 gap-2" variant="outline">
                  <Plus className="h-4 w-4" /> Crear usuario
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Search className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">No se encontraron resultados</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                        <TableHead className="hidden md:table-cell">Casa</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginate(filtered, page, pageSize).map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name} {u.lastName}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{u.email}</TableCell>
                          <TableCell>{roleBadge(u.role)}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{u.phone || '—'}</TableCell>
                          <TableCell className="hidden md:table-cell">{getHouseNumber(u.houseId)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(u)} title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(u)} title="Eliminar" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

      <UserFormDialog key={selectedUser?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} user={selectedUser} onSubmit={handleFormSubmit} houses={houses} />
      <DeleteUserDialog open={deleteOpen} onOpenChange={setDeleteOpen} user={selectedUser} onConfirm={handleConfirmDelete} />
    </AdminLayout>
  );
}
