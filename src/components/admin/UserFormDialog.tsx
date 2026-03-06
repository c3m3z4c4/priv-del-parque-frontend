import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User } from '@/types';
import { CreateUserPayload, UpdateUserPayload } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const createSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  lastName: z.string().trim().min(1, 'El apellido es obligatorio').max(100),
  email: z.string().trim().email('Email inválido').max(255),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  role: z.enum(['ADMIN', 'VECINO', 'SUPER_ADMIN', 'PRESIDENTE', 'SECRETARIO', 'TESORERO'], { required_error: 'Selecciona un rol' }),
  houseId: z.string().optional(),
});

const editSchema = createSchema.extend({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional().or(z.literal('')),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSubmit: (data: CreateUserPayload | UpdateUserPayload) => Promise<void>;
  houses: { id: string; houseNumber: string }[];
}

export function UserFormDialog({ open, onOpenChange, user, onSubmit, houses }: UserFormDialogProps) {
  const isEditing = !!user;

  const form = useForm<EditFormValues>({
    resolver: zodResolver(isEditing ? editSchema : createSchema),
    defaultValues: {
      name: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      role: 'VECINO',
      houseId: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (user) {
        form.reset({
          name: user.name,
          lastName: user.lastName,
          email: user.email,
          password: '',
          phone: user.phone ?? '',
          address: user.address ?? '',
          role: user.role as 'ADMIN' | 'VECINO' | 'SUPER_ADMIN' | 'PRESIDENTE' | 'SECRETARIO' | 'TESORERO',
          houseId: user.houseId ?? '',
        });
      } else {
        form.reset({
          name: '',
          lastName: '',
          email: '',
          password: '',
          phone: '',
          address: '',
          role: 'VECINO',
          houseId: '',
        });
      }
    }
  }, [open, user, form]);

  const role = form.watch('role');
  const isSubmitting = form.formState.isSubmitting;

  const handleSubmit = async (values: EditFormValues) => {
    if (isEditing) {
      const payload: UpdateUserPayload = {
        name: values.name,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone || undefined,
        address: values.address || undefined,
        role: values.role,
        houseId: values.role === 'VECINO' ? (values.houseId || undefined) : undefined,
      };
      if (values.password) payload.password = values.password;
      await onSubmit(payload);
    } else {
      const payload: CreateUserPayload = {
        name: values.name,
        lastName: values.lastName,
        email: values.email,
        password: values.password as string,
        phone: values.phone || undefined,
        address: values.address || undefined,
        role: values.role,
        houseId: values.role === 'VECINO' ? (values.houseId || undefined) : undefined,
      };
      await onSubmit(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica los datos del usuario.' : 'Completa los datos para registrar un nuevo usuario.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Juan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellidos</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Pérez García" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isEditing ? 'Nueva contraseña (dejar en blanco para no cambiar)' : 'Contraseña'}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={isEditing ? 'Sin cambios' : 'Mínimo 6 caracteres'} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: 55 1234 5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="VECINO">Vecino</SelectItem>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                        <SelectItem value="PRESIDENTE">Presidente</SelectItem>
                        <SelectItem value="SECRETARIO">Secretario</SelectItem>
                        <SelectItem value="TESORERO">Tesorero</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Calle Principal 123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {role === 'VECINO' && (
              <FormField
                control={form.control}
                name="houseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Casa asignada</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin asignar</SelectItem>
                        {houses.map((h) => (
                          <SelectItem key={h.id} value={h.id}>{h.houseNumber}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
