import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { House } from '@/types';
import { useUsers } from '@/hooks/useDataStore';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const houseSchema = z.object({
  houseNumber: z.string().min(1, 'El número de casa es requerido'),
  responsibleName: z.string().min(1, 'El nombre del responsable es requerido'),
  responsibleUserId: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

type HouseFormValues = z.infer<typeof houseSchema>;

interface HouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house: House | null;
  onSubmit: (data: HouseFormValues) => void;
}

export function HouseFormDialog({ open, onOpenChange, house, onSubmit }: HouseFormDialogProps) {
  const { users } = useUsers();
  const vecinos = users.filter(u => u.role === 'VECINO');

  const form = useForm<HouseFormValues>({
    resolver: zodResolver(houseSchema),
    defaultValues: {
      houseNumber: '',
      responsibleName: 'Sin asignar',
      responsibleUserId: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (open) {
      if (house) {
        form.reset({
          houseNumber: house.houseNumber,
          responsibleName: house.responsibleName,
          responsibleUserId: house.responsibleUserId || '',
          status: house.status,
        });
      } else {
        form.reset({
          houseNumber: '',
          responsibleName: 'Sin asignar',
          responsibleUserId: '',
          status: 'active',
        });
      }
    }
  }, [open, house, form]);

  const handleUserChange = (userId: string) => {
    if (userId === 'none') {
      form.setValue('responsibleUserId', '');
      form.setValue('responsibleName', 'Sin asignar');
    } else {
      const user = vecinos.find(u => u.id === userId);
      if (user) {
        form.setValue('responsibleUserId', userId);
        form.setValue('responsibleName', user.name);
      }
    }
  };

  const handleSubmit = (data: HouseFormValues) => {
    onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {house ? 'Editar Casa' : 'Nueva Casa'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="houseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Casa</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: A-101" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsibleUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsable (Vecino)</FormLabel>
                  <Select
                    value={field.value || 'none'}
                    onValueChange={handleUserChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar responsable" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {vecinos.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsibleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Responsable</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="inactive">Inactiva</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {house ? 'Guardar Cambios' : 'Crear Casa'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
