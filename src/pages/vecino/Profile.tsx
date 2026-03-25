import { useState, useRef } from 'react';
import { VecinoLayout } from '@/components/layouts/VecinoLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useHouses } from '@/hooks/useDataStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Home, Mail, Shield, Camera, Pencil, X, Check, Loader2, Phone } from 'lucide-react';
import { profileApi, toAbsoluteUrl } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn, compressImage } from '@/lib/utils';

const ROLE_LABEL: Record<string, string> = {
  VECINO: 'Vecino',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super Administrador',
  PRESIDENTE: 'Presidente',
  SECRETARIO: 'Secretario',
  TESORERO: 'Tesorero',
};

export default function VecinoProfile() {
  const { user, updateUser } = useAuth();
  const { houses } = useHouses();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userHouse = user?.houseId ? houses.find(h => h.id === user.houseId) : null;

  // Edit state
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const avatarSrc = toAbsoluteUrl(user?.avatarUrl);
  const initials = user ? `${user.name[0]}${user.lastName[0]}`.toUpperCase() : '?';

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const compressed = await compressImage(file);
      const { avatarUrl } = await profileApi.uploadAvatar(compressed);
      updateUser({ ...user!, avatarUrl });
      toast({ title: 'Foto actualizada correctamente' });
    } catch (err: any) {
      toast({ title: 'Error al subir la foto', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (password && password !== confirmPassword) {
      toast({ title: 'Las contraseñas no coinciden', variant: 'destructive' });
      return;
    }
    if (password && password.length < 6) {
      toast({ title: 'La contraseña debe tener al menos 6 caracteres', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload: any = { name: name.trim(), lastName: lastName.trim(), phone: phone.trim() };
      if (password) payload.password = password;
      const updated = await profileApi.updateMe(payload);
      updateUser({ ...user!, ...updated });
      setEditing(false);
      setPassword('');
      setConfirmPassword('');
      toast({ title: 'Perfil actualizado correctamente' });
    } catch (err: any) {
      toast({ title: 'Error al actualizar perfil', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setName(user?.name ?? '');
    setLastName(user?.lastName ?? '');
    setPhone(user?.phone ?? '');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <VecinoLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold">Mi Perfil</h1>
          <p className="mt-1 text-muted-foreground">Información de tu cuenta y vivienda</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* User Info Card */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <button
                      onClick={handleAvatarClick}
                      disabled={uploadingAvatar}
                      className="group relative h-16 w-16 overflow-hidden rounded-full ring-2 ring-primary/20 hover:ring-primary/50 transition-all"
                    >
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground text-xl font-bold">
                          {initials}
                        </div>
                      )}
                      <div className={cn(
                        "absolute inset-0 flex items-center justify-center rounded-full bg-black/40 transition-opacity",
                        uploadingAvatar ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}>
                        {uploadingAvatar
                          ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                          : <Camera className="h-5 w-5 text-white" />
                        }
                      </div>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{user?.name} {user?.lastName}</CardTitle>
                    <CardDescription>Residente de Privadas del Parque</CardDescription>
                  </div>
                </div>
                {!editing && (
                  <Button variant="ghost" size="icon" onClick={() => setEditing(true)} title="Editar perfil">
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Nombre</Label>
                      <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">Apellido</Label>
                      <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(618) 000-0000" />
                  </div>
                  <Separator />
                  <p className="text-xs text-muted-foreground">Dejar en blanco para no cambiar la contraseña</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Nueva contraseña</Label>
                    <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm">Confirmar contraseña</Label>
                    <Input id="confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Guardar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-1.5">
                      <X className="h-3.5 w-3.5" /> Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <Mail className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Correo electrónico</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  {user?.phone && (
                    <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                      <Phone className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Teléfono</p>
                        <p className="text-sm text-muted-foreground">{user.phone}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <Shield className="h-5 w-5 text-accent shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Rol</p>
                      <p className="text-sm text-muted-foreground">{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* House Info Card */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
                  <Home className="h-8 w-8 text-accent-foreground" />
                </div>
                <div>
                  <CardTitle className="text-xl">Mi Vivienda</CardTitle>
                  <CardDescription>Información de tu propiedad</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {userHouse ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm font-medium">Número de casa</p>
                    <p className="text-2xl font-bold text-primary">{userHouse.houseNumber}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm font-medium">Estado</p>
                      <p className={`text-sm font-medium ${userHouse.status === 'active' ? 'text-primary' : 'text-destructive'}`}>
                        {userHouse.status === 'active' ? 'Activo' : 'Inactivo'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm font-medium">Dirección</p>
                      <p className="text-sm text-muted-foreground">{userHouse.address || '—'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Home className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No tienes una vivienda asignada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </VecinoLayout>
  );
}
