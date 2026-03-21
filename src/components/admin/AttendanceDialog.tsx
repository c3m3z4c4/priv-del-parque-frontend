import { useState, useEffect } from 'react';
import { rsvpsApi, RsvpWithUser } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, HelpCircle, X, Users } from 'lucide-react';

interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: 'meeting' | 'event';
  targetId: string;
  targetTitle: string;
}

const statusConfig = {
  attending: { label: 'Asistirá', icon: Check, className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  maybe: { label: 'Tal vez', icon: HelpCircle, className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  not_attending: { label: 'No asistirá', icon: X, className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
} as const;

export function AttendanceDialog({ open, onOpenChange, targetType, targetId, targetTitle }: AttendanceDialogProps) {
  const [rsvps, setRsvps] = useState<RsvpWithUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !targetId) return;
    setLoading(true);
    rsvpsApi.getAttendance(targetType, targetId)
      .then(setRsvps)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, targetType, targetId]);

  const attending = rsvps.filter(r => r.status === 'attending');
  const maybe = rsvps.filter(r => r.status === 'maybe');
  const notAttending = rsvps.filter(r => r.status === 'not_attending');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Asistencia
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{targetTitle}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rsvps.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No hay confirmaciones aún.</p>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3">
                <div className="text-xl font-bold text-green-700 dark:text-green-300">{attending.length}</div>
                <div className="text-xs text-muted-foreground">Asistirán</div>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3">
                <div className="text-xl font-bold text-amber-700 dark:text-amber-300">{maybe.length}</div>
                <div className="text-xs text-muted-foreground">Tal vez</div>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3">
                <div className="text-xl font-bold text-red-700 dark:text-red-300">{notAttending.length}</div>
                <div className="text-xs text-muted-foreground">No asistirán</div>
              </div>
            </div>

            {/* Detail list */}
            <div className="max-h-72 overflow-y-auto space-y-1.5">
              {rsvps.map(rsvp => {
                const config = statusConfig[rsvp.status];
                const Icon = config.icon;
                const name = rsvp.user ? `${rsvp.user.name} ${rsvp.user.lastName}` : rsvp.userId;
                return (
                  <div key={rsvp.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="text-sm font-medium">{name}</span>
                    <Badge className={config.className}>
                      <Icon className="mr-1 h-3 w-3" />
                      {config.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
