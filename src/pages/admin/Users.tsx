import { useState, useMemo, useRef } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { UserFormDialog } from '@/components/admin/UserFormDialog';
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog';
import { TablePagination, paginate } from '@/components/admin/TablePagination';
import { useUsers, useHouses } from '@/hooks/useDataStore';
import { exportBrandedPDF } from '@/lib/exportPDF';
import logo from '@/assets/logo.png';
import { useSortable, applySortLocale } from '@/hooks/useSortable';
import { SortableHead } from '@/components/admin/SortableHead';
import { User } from '@/types';
import { CreateUserPayload, UpdateUserPayload, usersApi, ImportUserRow } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Users as UsersIcon, Loader2, Shield, Home, Search, FileText, Star, Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ─── CSV helpers ──────────────────────────────────────────────────────────────

const POR_LLENAR = 'Por Llenar';

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
    } else if (ch === ',' && !inQ) {
      cols.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

function exportUsersCSV(users: User[], houses: { id: string; houseNumber: string }[]) {
  const BOM = '\uFEFF';
  const houseMap = Object.fromEntries(houses.map(h => [h.id, h.houseNumber]));
  const headers = ['Email', 'Nombre', 'Apellidos', 'Teléfono', 'Rol', 'Casa', 'Contraseña'];
  const rows = users.map(u => [
    escapeCSV(u.email),
    escapeCSV(u.name || POR_LLENAR),
    escapeCSV(u.lastName || POR_LLENAR),
    escapeCSV(u.phone || POR_LLENAR),
    escapeCSV(u.role),
    escapeCSV(u.houseId ? (houseMap[u.houseId] || POR_LLENAR) : POR_LLENAR),
    escapeCSV(POR_LLENAR), // passwords never exported
  ].join(','));
  const csv = BOM + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Import dialog ────────────────────────────────────────────────────────────

const CSV_PLACEHOLDER = `juan@email.com,Juan,García,555-1234,VECINO,A-01
maria@email.com,María,López,,VECINO,B-02
admin@email.com,Por Llenar,Por Llenar,,,`;

interface UserPreviewRow {
  email: string;
  name: string;
  lastName: string;
  phone: string;
  role: string;
  houseNumber: string;
  password: string;
  duplicate: boolean;
  incomplete: boolean; // name or lastName is missing/Por Llenar
}

function ImportUsersDialog({
  open, onOpenChange, onImported, existingEmails,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
  existingEmails: Set<string>;
}) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = useMemo<UserPreviewRow[]>(() => {
    return text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        // Columns: 0=Email, 1=Nombre, 2=Apellidos, 3=Teléfono, 4=Rol, 5=Casa, 6=Contraseña
        const cols = parseCSVLine(line);
        const email = (cols[0] ?? '').toLowerCase();
        const name = cols[1] || POR_LLENAR;
        const lastName = cols[2] || POR_LLENAR;
        const phone = cols[3] || POR_LLENAR;
        const role = cols[4] || 'VECINO';
        const houseNumber = cols[5] || '';
        const password = cols[6] || '';
        const incomplete = name === POR_LLENAR || name === '' || lastName === POR_LLENAR || lastName === '';
        return { email, name, lastName, phone, role, houseNumber, password, duplicate: existingEmails.has(email), incomplete };
      })
      .filter(r => r.email && r.email.includes('@'));
  }, [text, existingEmails]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const cleaned = ((ev.target?.result as string) ?? '').replace(/^\uFEFF/, '');
      const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
      const firstCell = parseCSVLine(lines[0] ?? '')[0]?.toLowerCase() ?? '';
      const isHeader = ['email', 'correo'].some(k => firstCell.includes(k));
      setText((isHeader ? lines.slice(1) : lines).join('\n'));
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleImport = async () => {
    const newRows = preview.filter(r => !r.duplicate && !r.incomplete);
    if (newRows.length === 0) return;
    setLoading(true);
    try {
      const payload: ImportUserRow[] = newRows.map(r => ({
        email: r.email,
        name: r.name !== POR_LLENAR ? r.name : undefined,
        lastName: r.lastName !== POR_LLENAR ? r.lastName : undefined,
        phone: r.phone !== POR_LLENAR && r.phone ? r.phone : undefined,
        role: r.role && r.role !== POR_LLENAR ? r.role : undefined,
        houseNumber: r.houseNumber && r.houseNumber !== POR_LLENAR ? r.houseNumber : undefined,
        password: r.password && r.password !== POR_LLENAR ? r.password : undefined,
      }));
      const result = await usersApi.import(payload);
      toast({
        title: 'Importación completada',
        description: `${result.created} usuarios creados${result.skipped ? `, ${result.skipped} omitidos` : ''}. Contraseña por defecto: Bienvenido2026!`,
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

  const newCount = preview.filter(r => !r.duplicate && !r.incomplete).length;
  const dupCount = preview.filter(r => r.duplicate).length;
  const incompleteCount = preview.filter(r => !r.duplicate && r.incomplete).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">Importar usuarios por CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Formato de columnas:</p>
            <p><span className="font-mono">Email, Nombre, Apellidos, Teléfono, Rol, Casa, Contraseña</span></p>
            <p>• El correo es el único campo obligatorio. Campos vacíos quedan como <strong>Por Llenar</strong>.</p>
            <p>• Si no se incluye contraseña se asigna <strong>Bienvenido2026!</strong> por defecto.</p>
            <p>• Roles válidos: <span className="font-mono">VECINO, ADMIN, SUPER_ADMIN, PRESIDENTE, SECRETARIO, TESORERO</span></p>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
            <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Subir archivo .csv
            </Button>
            <span className="text-xs text-muted-foreground">o pega el contenido abajo</span>
          </div>

          <div className="space-y-1">
            <Label>
              Lista de usuarios{' '}
              <span className="text-muted-foreground text-xs">(una por línea: email,nombre,apellidos,...)</span>
            </Label>
            <Textarea
              rows={6}
              placeholder={CSV_PLACEHOLDER}
              value={text}
              onChange={e => setText(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          {preview.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                <p className="text-xs font-medium text-muted-foreground">Vista previa — {preview.length} usuarios</p>
                <div className="flex gap-3 text-xs">
                  <span className="text-green-700 font-medium">{newCount} nuevos</span>
                  {dupCount > 0 && <span className="text-amber-600 font-medium">{dupCount} duplicados</span>}
                  {incompleteCount > 0 && <span className="text-red-600 font-medium">{incompleteCount} incompletos</span>}
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">Nombre</TableHead>
                      <TableHead className="text-xs">Apellidos</TableHead>
                      <TableHead className="text-xs">Rol</TableHead>
                      <TableHead className="text-xs">Casa</TableHead>
                      <TableHead className="text-xs">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 15).map((r, i) => (
                      <TableRow key={i} className={r.duplicate || r.incomplete ? 'opacity-60' : ''}>
                        <TableCell className="text-xs">{r.email}</TableCell>
                        <TableCell className={`text-xs ${r.incomplete && r.name === POR_LLENAR ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>{r.name}</TableCell>
                        <TableCell className={`text-xs ${r.incomplete && r.lastName === POR_LLENAR ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>{r.lastName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.role}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.houseNumber || '—'}</TableCell>
                        <TableCell className="text-xs">
                          {r.duplicate
                            ? <span className="text-amber-600 font-medium">Duplicado</span>
                            : r.incomplete
                              ? <span className="text-red-600 font-medium">Incompleto</span>
                              : <span className="text-green-700 font-medium">Nuevo</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                    {preview.length > 15 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-xs text-muted-foreground text-center">
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
            <Button onClick={handleImport} disabled={newCount === 0 || loading}>
              {loading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando...</>
                : `Importar ${newCount} usuarios nuevos`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const { users, isLoading, addUser, updateUser, deleteUser, refetch } = useUsers();
  const { houses } = useHouses();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'SUPER_ADMIN' | 'ADMIN' | 'PRESIDENTE' | 'SECRETARIO' | 'TESORERO' | 'VECINO'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { sortCol, sortDir, handleSort } = useSortable('name');

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

  const getHouseInfo = (houseId?: string) => {
    if (!houseId) return { number: '—', address: '' };
    const h = houses.find(h => h.id === houseId);
    return { number: h?.houseNumber || '—', address: h?.address || '' };
  };

  const roleBadge = (role: string) => {
    if (role === 'SUPER_ADMIN') return <Badge className="gap-1 bg-purple-600 hover:bg-purple-700"><Star className="h-3 w-3" /> Super Admin</Badge>;
    if (role === 'ADMIN') return <Badge variant="default" className="gap-1"><Shield className="h-3 w-3" /> Admin</Badge>;
    if (role === 'PRESIDENTE') return <Badge className="gap-1 bg-amber-600 hover:bg-amber-700"><Star className="h-3 w-3" /> Presidente</Badge>;
    if (role === 'SECRETARIO') return <Badge className="gap-1 bg-sky-600 hover:bg-sky-700"><Shield className="h-3 w-3" /> Secretario</Badge>;
    if (role === 'TESORERO') return <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-700"><Shield className="h-3 w-3" /> Tesorero</Badge>;
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

  const displayed = useMemo(() => {
    const houseMap = Object.fromEntries(houses.map(h => [h.id, h.houseNumber]));
    return applySortLocale(filtered, sortCol, sortDir, (u, col) => {
      if (col === 'name') return `${u.name} ${u.lastName}`;
      if (col === 'email') return u.email;
      if (col === 'role') return u.role;
      if (col === 'phone') return u.phone ?? '';
      if (col === 'house') return u.houseId ? (houseMap[u.houseId] ?? '') : '';
      return '';
    });
  }, [filtered, sortCol, sortDir, houses]);

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
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="gap-2" onClick={() => {
              const houseMap = Object.fromEntries(houses.map(h => [h.id, h.houseNumber]));
              const roleLabel = (r: string) => r === 'SUPER_ADMIN' ? 'Super Admin' : r === 'ADMIN' ? 'Admin' : r;
              exportBrandedPDF({
                title: 'Directorio de Usuarios',
                subtitle: `Reporte de residentes — ${filtered.length} usuarios`,
                logoUrl: logo,
                columns: ['Nombre', 'Email', 'Rol', 'Teléfono', 'Casa', 'Calle'],
                rows: filtered.map(u => {
                  const house = u.houseId ? houses.find(h => h.id === u.houseId) : undefined;
                  return [
                    `${u.name} ${u.lastName}`,
                    u.email,
                    roleLabel(u.role),
                    u.phone || POR_LLENAR,
                    house?.houseNumber || POR_LLENAR,
                    house?.address || POR_LLENAR,
                  ];
                }),
              });
            }} disabled={filtered.length === 0}>
              <FileText className="h-4 w-4" /> Exportar PDF
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => exportUsersCSV(filtered, houses)} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Importar CSV
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
              <SelectItem value="PRESIDENTE">Presidente</SelectItem>
              <SelectItem value="SECRETARIO">Secretario</SelectItem>
              <SelectItem value="TESORERO">Tesorero</SelectItem>
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
                        <SortableHead label="Nombre" colKey="name" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                        <SortableHead label="Email" colKey="email" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
                        <SortableHead label="Rol" colKey="role" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                        <SortableHead label="Teléfono" colKey="phone" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                        <SortableHead label="Casa" colKey="house" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginate(displayed, page, pageSize).map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name} {u.lastName}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{u.email}</TableCell>
                          <TableCell>{roleBadge(u.role)}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{u.phone || '—'}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {(() => { const h = getHouseInfo(u.houseId); return h.address ? <span>{h.number} <span className="text-muted-foreground text-xs">· {h.address}</span></span> : h.number; })()}
                          </TableCell>
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
                <TablePagination totalItems={displayed.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <UserFormDialog key={selectedUser?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} user={selectedUser} onSubmit={handleFormSubmit} houses={houses} />
      <DeleteUserDialog open={deleteOpen} onOpenChange={setDeleteOpen} user={selectedUser} onConfirm={handleConfirmDelete} />
      <ImportUsersDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={refetch}
        existingEmails={new Set(users.map(u => u.email.toLowerCase()))}
      />
    </AdminLayout>
  );
}
