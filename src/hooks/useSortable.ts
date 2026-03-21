import { useState } from 'react';

export type SortDir = 'asc' | 'desc';

export function useSortable(initialCol: string, initialDir: SortDir = 'asc') {
  const [sortCol, setSortCol] = useState(initialCol);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);

  const handleSort = (col: string) => {
    if (col === sortCol) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  return { sortCol, sortDir, handleSort };
}

export function applySortLocale<T>(
  items: T[],
  col: string,
  dir: SortDir,
  getValue: (item: T, col: string) => string | number | undefined,
): T[] {
  return [...items].sort((a, b) => {
    const aVal = getValue(a, col) ?? '';
    const bVal = getValue(b, col) ?? '';
    let cmp: number;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      cmp = aVal - bVal;
    } else {
      cmp = String(aVal).localeCompare(String(bVal), 'es', { numeric: true, sensitivity: 'base' });
    }
    return dir === 'asc' ? cmp : -cmp;
  });
}
