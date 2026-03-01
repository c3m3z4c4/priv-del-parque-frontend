/**
 * Export an array of objects to a CSV file and trigger download.
 * @param data - Array of objects to export
 * @param columns - Column definitions: { key, header }
 * @param filename - Name of the downloaded file (without extension)
 */
export function exportToCSV<T>(
  data: T[],
  columns: { key: keyof T & string; header: string }[],
  filename: string
) {
  if (data.length === 0) return;

  const separator = ',';
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility with accents

  const headerRow = columns.map(c => escapeCSV(c.header)).join(separator);
  const rows = data.map(item =>
    columns.map(c => escapeCSV(String((item as Record<string, unknown>)[c.key] ?? ''))).join(separator)
  );

  const csv = BOM + [headerRow, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
