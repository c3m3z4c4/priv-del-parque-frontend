import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { House } from '@/types';
import { CreateHousePayload, UpdateHousePayload } from '@/lib/api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const houseSchema = z.object({
  houseNumber: z.string().trim().min(1, 'El número de casa es requerido'),
  address: z.string().trim().optional(),
  status: z.enum(['active', 'inactive']),
});

type HouseFormValues = z.infer<typeof houseSchema>;

interface HouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house: House | null;
  onSubmit: (data: CreateHousePayload | UpdateHousePayload) => Promise<void>;
}

export function HouseFormDialog({ open, onOpenChange, house, onSubmit }: HouseFormDialogProps) {
  const form = useForm<HouseFormValues>({
    resolver: zodResolver(houseSchema),
    defaultValues: {
      houseNumber: '',
      address: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (open) {
      if (house) {
        form.reset({
          houseNumber: house.houseNumber,
          address: house.address ?? '',
          status: house.status,
        });
      } else {
        form.reset({ houseNumber: '', address: '', status: 'active' });
      }
    }
  }, [open, house, form]);

  const isSubmitting = form.formState.isSubmitting;

  const handleSubmit = async (data: HouseFormValues) => {
    await onSubmit({
      houseNumber: data.houseNumber,
      address: data.address || undefined,
      status: data.status,
    });
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
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Calle Roble 101" {...field} />
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : house ? 'Guardar Cambios' : 'Crear Casa'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
