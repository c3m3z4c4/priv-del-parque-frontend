import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRsvps } from '@/hooks/useDataStore';
import { RsvpStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Check, X, HelpCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface RsvpButtonsProps {
  targetType: 'meeting' | 'event';
  targetId: string;
  compact?: boolean;
}

const statusConfig: Record<RsvpStatus, { label: string; icon: typeof Check; activeClass: string }> = {
  attending: { label: 'Asistiré', icon: Check, activeClass: 'bg-primary text-primary-foreground hover:bg-primary/90' },
  maybe: { label: 'Tal vez', icon: HelpCircle, activeClass: 'bg-accent text-accent-foreground hover:bg-accent/90' },
  not_attending: { label: 'No iré', icon: X, activeClass: 'bg-destructive text-destructive-foreground hover:bg-destructive/90' },
};

export function RsvpButtons({ targetType, targetId, compact = false }: RsvpButtonsProps) {
  const { user } = useAuth();
  const { setRsvp, removeRsvp, getUserRsvp, getAttendingCount } = useRsvps();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const currentRsvp = getUserRsvp(user.id, targetType, targetId);
  const attendingCount = getAttendingCount(targetType, targetId);

  const handleRsvp = async (status: RsvpStatus) => {
    setLoading(true);
    try {
      if (currentRsvp?.status === status) {
        await removeRsvp(user.id, targetType, targetId);
        toast({ title: 'Respuesta eliminada', description: 'Se eliminó tu confirmación.' });
      } else {
        await setRsvp(user.id, user.name, targetType, targetId, status);
        const labels: Record<RsvpStatus, string> = {
          attending: 'Confirmaste tu asistencia',
          maybe: 'Respondiste "Tal vez"',
          not_attending: 'Indicaste que no asistirás',
        };
        toast({ title: labels[status] });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className={cn("flex gap-1.5", compact ? "flex-wrap" : "")}>
        {(Object.entries(statusConfig) as [RsvpStatus, typeof statusConfig.attending][]).map(([status, config]) => {
          const Icon = config.icon;
          const isActive = currentRsvp?.status === status;
          return (
            <Button
              key={status}
              variant="outline"
              size="sm"
              disabled={loading}
              className={cn(
                "gap-1 text-xs h-7",
                isActive && config.activeClass,
                compact && "px-2"
              )}
              onClick={() => handleRsvp(status)}
            >
              <Icon className="h-3 w-3" />
              {!compact && config.label}
            </Button>
          );
        })}
      </div>
      {attendingCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          {attendingCount} {attendingCount === 1 ? 'confirmado' : 'confirmados'}
        </div>
      )}
    </div>
  );
}

interface RsvpBadgeProps {
  targetType: 'meeting' | 'event';
  targetId: string;
}

export function RsvpCount({ targetType, targetId }: RsvpBadgeProps) {
  const { getRsvpsForTarget } = useRsvps();
  const rsvps = getRsvpsForTarget(targetType, targetId);
  const attending = rsvps.filter(r => r.status === 'attending').length;
  const maybe = rsvps.filter(r => r.status === 'maybe').length;
  const notAttending = rsvps.filter(r => r.status === 'not_attending').length;

  if (rsvps.length === 0) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex items-center gap-2 text-xs">
      {attending > 0 && (
        <span className="flex items-center gap-0.5 text-primary font-medium">
          <Check className="h-3 w-3" />{attending}
        </span>
      )}
      {maybe > 0 && (
        <span className="flex items-center gap-0.5 text-accent font-medium">
          <HelpCircle className="h-3 w-3" />{maybe}
        </span>
      )}
      {notAttending > 0 && (
        <span className="flex items-center gap-0.5 text-destructive font-medium">
          <X className="h-3 w-3" />{notAttending}
        </span>
      )}
    </div>
  );
}
