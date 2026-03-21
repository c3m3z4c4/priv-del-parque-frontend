import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { House, User } from '@/types';
import { CreateHousePayload, UpdateHousePayload } from '@/lib/api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserRound, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const houseSchema = z.object({
  houseNumber: z.string().trim().min(1, 'El número es requerido'),
  address: z.string().trim().optional(),
  status: z.enum(['active', 'inactive']),
  residentIds: z.array(z.string()).default([]),
});

type HouseFormValues = z.infer<typeof houseSchema>;

export type HouseFormSubmitData = (CreateHousePayload | UpdateHousePayload) & {
  residentIds: string[];
};

interface HouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house: House | null;
  users: User[];
  onSubmit: (data: HouseFormSubmitData) => Promise<void>;
}

export function HouseFormDialog({ open, onOpenChange, house, users, onSubmit }: HouseFormDialogProps) {
  const [userSearch, setUserSearch] = useState('');

  const form = useForm<HouseFormValues>({
    resolver: zodResolver(houseSchema),
    defaultValues: {
      houseNumber: '',
      address: '',
      status: 'active',
      residentIds: [],
    },
  });

  useEffect(() => {
    if (open) {
      setUserSearch('');
      if (house) {
        form.reset({
          houseNumber: house.houseNumber,
          address: house.address ?? '',
          status: house.status,
          residentIds: (house.residents ?? []).map(r => r.id),
        });
      } else {
        form.reset({ houseNumber: '', address: '', status: 'active', residentIds: [] });
      }
    }
  }, [open, house, form]);

  const selectedIds = form.watch('residentIds');

  // Users available: VECINOs without a house, or already assigned to THIS house
  const availableUsers = users.filter(u =>
    u.role === 'VECINO' && (!u.houseId || u.houseId === house?.id)
  );

  const filteredUsers = availableUsers.filter(u => {
    const q = userSearch.toLowerCase();
    return (
      `${u.name} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const selectedUsers = users.filter(u => selectedIds.includes(u.id));

  const toggleUser = (userId: string) => {
    const current = form.getValues('residentIds');
    if (current.includes(userId)) {
      form.setValue('residentIds', current.filter(id => id !== userId));
    } else {
      form.setValue('residentIds', [...current, userId]);
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  const handleSubmit = async (data: HouseFormValues) => {
    await onSubmit({
      houseNumber: data.houseNumber,
      address: data.address || undefined,
      status: data.status,
      residentIds: data.residentIds,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {house ? 'Editar Casa' : 'Nueva Casa'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

            {/* Row: Número + Calle */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="houseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: A-101" {...field} />
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
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calle</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Calle del Parque" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Resident assignment */}
            <div className="space-y-2">
              <FormLabel>Residentes asignados</FormLabel>

              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedUsers.map(u => (
                    <Badge key={u.id} variant="secondary" className="gap-1 pr-1">
                      {u.name} {u.lastName}
                      <button
                        type="button"
                        onClick={() => toggleUser(u.id)}
                        className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <Input
                placeholder="Buscar vecino..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="h-8 text-sm"
              />

              <ScrollArea className="h-36 rounded-md border">
                {filteredUsers.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground text-center">
                    {availableUsers.length === 0
                      ? 'Sin vecinos disponibles para asignar'
                      : 'Sin resultados'}
                  </p>
                ) : (
                  <div className="p-1">
                    {filteredUsers.map(u => {
                      const selected = selectedIds.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleUser(u.id)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors text-left',
                            selected
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-muted',
                          )}
                        >
                          <UserRound className="h-3.5 w-3.5 shrink-0" />
                          <span className="flex-1 truncate">
                            {u.name} {u.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {u.email}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Solo vecinos sin casa asignada aparecen disponibles
              </p>
            </div>

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
