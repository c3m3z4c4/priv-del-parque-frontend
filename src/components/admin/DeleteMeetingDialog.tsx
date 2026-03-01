import { Meeting } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: Meeting | null;
  onConfirm: () => void;
}

export function DeleteMeetingDialog({ open, onOpenChange, meeting, onConfirm }: DeleteMeetingDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif">¿Eliminar reunión?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de eliminar la reunión <strong>"{meeting?.title}"</strong>. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
