import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SortDir } from '@/hooks/useSortable';

interface Props {
  label: string;
  colKey: string;
  sortCol: string;
  sortDir: SortDir;
  onSort: (col: string) => void;
  className?: string;
}

export function SortableHead({ label, colKey, sortCol, sortDir, onSort, className }: Props) {
  const active = colKey === sortCol;
  return (
    <TableHead
      className={cn('cursor-pointer select-none whitespace-nowrap', className)}
      onClick={() => onSort(colKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (
          sortDir === 'asc'
            ? <ChevronUp className="h-3.5 w-3.5 text-primary shrink-0" />
            : <ChevronDown className="h-3.5 w-3.5 text-primary shrink-0" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
        )}
      </span>
    </TableHead>
  );
}
