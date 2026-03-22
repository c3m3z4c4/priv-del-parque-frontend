import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Meeting, User } from '@/types';
import { meetingsApi, usersApi } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Mail, Users, CheckSquare, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  meeting: Meeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendInvitationDialog({ meeting, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
    enabled: open,
  });

  const eligible = useMemo(
    () => users.filter((u) => u.isActive !== false && u.email),
    [users],
  );

  // Pre-select all eligible users when dialog opens
  useEffect(() => {
    if (open && eligible.length > 0) {
      setSelected(new Set(eligible.map((u) => u.email)));
    }
  }, [open, eligible.length]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return eligible;
    return eligible.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.house?.houseNumber?.toLowerCase().includes(q),
    );
  }, [eligible, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((u) => selected.has(u.email));

  function toggleUser(email: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(email) ? next.delete(email) : next.add(email);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((u) => next.delete(u.email));
      } else {
        filtered.forEach((u) => next.add(u.email));
      }
      return next;
    });
  }

  async function handleSend() {
    if (selected.size === 0) {
      toast({ title: 'Selecciona al menos un destinatario', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const result = await meetingsApi.sendInvitation(meeting!.id, [...selected]);
      toast({
        title: 'Convocatoria enviada',
        description: `${result.sent} correo${result.sent !== 1 ? 's' : ''} enviado${result.sent !== 1 ? 's' : ''}${result.failed ? `, ${result.failed} fallido${result.failed !== 1 ? 's' : ''}` : ''}.`,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error al enviar', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  if (!meeting) return null;

  const meetingDate = meeting.date
    ? format(new Date(meeting.date + 'T12:00:00'), "EEEE d 'de' MMMM yyyy", { locale: es })
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Enviar Convocatoria
          </DialogTitle>
        </DialogHeader>

        {/* Meeting summary */}
        <div className="rounded-md bg-muted/50 px-4 py-3 text-sm space-y-0.5">
          <p className="font-semibold">{meeting.title}</p>
          <p className="text-muted-foreground capitalize">{meetingDate} · {meeting.startTime} · {meeting.location}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, correo o casa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Select / deselect all */}
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                onClick={toggleAllFiltered}
              >
                {allFilteredSelected
                  ? <CheckSquare className="h-4 w-4 text-primary" />
                  : <Square className="h-4 w-4" />}
                {allFilteredSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* User list */}
            <ScrollArea className="h-64 rounded-md border">
              {filtered.length === 0 ? (
                <div className="flex items-center justify-center h-full py-8 text-sm text-muted-foreground">
                  No se encontraron usuarios
                </div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {filtered.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selected.has(user.email)}
                        onCheckedChange={() => toggleUser(user.email)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {user.name} {user.lastName}
                          {user.house && (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              Casa {user.house.houseNumber}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending || selected.size === 0} className="gap-2">
            {sending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
            ) : (
              <><Mail className="h-4 w-4" /> Enviar a {selected.size}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
