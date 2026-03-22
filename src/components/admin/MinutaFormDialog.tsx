import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, FileText } from 'lucide-react';
import { Meeting } from '@/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface MinutaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: Meeting | null;
  onSubmit: (data: {
    minutes?: string;
    minutesAgreements?: string;
    minutesResponsibles?: string;
    minutesClosingTime?: string;
  }) => Promise<void>;
}

export function MinutaFormDialog({ open, onOpenChange, meeting, onSubmit }: MinutaFormDialogProps) {
  const [development, setDevelopment] = useState('');
  const [agreements, setAgreements] = useState('');
  const [responsibles, setResponsibles] = useState('');
  const [closingTime, setClosingTime] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset fields when dialog opens with meeting data
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && meeting) {
      setDevelopment(meeting.minutes || '');
      setAgreements(meeting.minutesAgreements || '');
      setResponsibles(meeting.minutesResponsibles || '');
      setClosingTime(meeting.minutesClosingTime || meeting.endTime || '');
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit({
        minutes: development || undefined,
        minutesAgreements: agreements || undefined,
        minutesResponsibles: responsibles || undefined,
        minutesClosingTime: closingTime || undefined,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  if (!meeting) return null;

  const meetingDate = parseISO(meeting.date);
  const hasContent = !!(meeting.minutes || meeting.minutesAgreements || meeting.minutesResponsibles);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-xl">
            <FileText className="h-5 w-5" />
            {hasContent ? 'Editar Minuta' : 'Registrar Minuta'}
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">{meeting.title}</span> —{' '}
            {format(meetingDate, "d 'de' MMMM 'de' yyyy", { locale: es })} a las {meeting.startTime}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Section 5: Desarrollo */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">5) Desarrollo de la asamblea</Label>
            <p className="text-xs text-muted-foreground">
              Un punto por línea. Cada línea se mostrará como viñeta en el acta.
            </p>
            <Textarea
              value={development}
              onChange={e => setDevelopment(e.target.value)}
              placeholder={"Se plantea que la junta tenga recurrencia trimestral.\nSe acuerda recibir cuotas el último domingo de cada mes.\nSe revisan pendientes de la mesa anterior..."}
              className="min-h-[140px] resize-y font-mono text-sm"
            />
          </div>

          <Separator />

          {/* Section 6: Acuerdos */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">6) Acuerdos y resoluciones</Label>
            <p className="text-xs text-muted-foreground">
              Un acuerdo por línea. Se numerarán automáticamente en el acta.
            </p>
            <Textarea
              value={agreements}
              onChange={e => setAgreements(e.target.value)}
              placeholder={"Quórum: Se realizará la junta con los vecinos asistentes.\nFrecuencia de juntas: Se acuerda recurrencia trimestral.\nCuotas mensuales: Se acuerda recibirlas el último domingo de cada mes."}
              className="min-h-[140px] resize-y font-mono text-sm"
            />
          </div>

          <Separator />

          {/* Section 7: Responsables */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">7) Responsables y seguimiento</Label>
            <p className="text-xs text-muted-foreground">
              Un punto por línea. Cada línea se mostrará como viñeta en el acta.
            </p>
            <Textarea
              value={responsibles}
              onChange={e => setResponsibles(e.target.value)}
              placeholder={"Comité de Vecinos: solicitar cotizaciones; coordinar mantenimiento.\nTesorero: presentar estado de cuentas en próxima reunión."}
              className="min-h-[100px] resize-y font-mono text-sm"
            />
          </div>

          <Separator />

          {/* Clausura time */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" htmlFor="closing-time">Hora de clausura</Label>
            <p className="text-xs text-muted-foreground">
              Hora en que se dio por concluida la asamblea.
            </p>
            <Input
              id="closing-time"
              type="time"
              value={closingTime}
              onChange={e => setClosingTime(e.target.value)}
              className="w-40"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar minuta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
