import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface PostponeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  currentDate?: string;
  currentStartTime?: string;
  currentEndTime?: string;
  onConfirm: (data: { date: string; startTime: string; endTime?: string }) => Promise<void>;
}

export function PostponeDialog({
  open, onOpenChange, title, currentDate, currentStartTime, currentEndTime, onConfirm,
}: PostponeDialogProps) {
  const [date, setDate] = useState(currentDate ?? '');
  const [startTime, setStartTime] = useState(currentStartTime ?? '');
  const [endTime, setEndTime] = useState(currentEndTime ?? '');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!date || !startTime) return;
    setLoading(true);
    try {
      await onConfirm({ date, startTime, endTime: endTime || undefined });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  // Reset fields when dialog opens with new values
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setDate(currentDate ?? '');
      setStartTime(currentStartTime ?? '');
      setEndTime(currentEndTime ?? '');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Posponer: {title}</DialogTitle>
          <DialogDescription>
            Selecciona la nueva fecha y hora. Los vecinos serán notificados del cambio.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="postpone-date">Nueva fecha *</Label>
            <Input
              id="postpone-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postpone-start">Hora inicio *</Label>
              <Input
                id="postpone-start"
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postpone-end">Hora fin (opcional)</Label>
              <Input
                id="postpone-end"
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !date || !startTime}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Posponer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
