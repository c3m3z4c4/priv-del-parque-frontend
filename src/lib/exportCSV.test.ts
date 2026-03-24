import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToCSV } from './exportCSV';

// Capture the last Blob created
let lastBlobContent = '';
const OriginalBlob = globalThis.Blob;

const mockClick = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

let mockAnchor: { href: string; download: string; click: typeof mockClick };

beforeEach(() => {
  mockClick.mockReset();
  mockAppendChild.mockReset();
  mockRemoveChild.mockReset();
  mockCreateObjectURL.mockReset().mockImplementation((b: Blob) => {
    // jsdom doesn't support Blob.text() so we capture via spy below
    return 'blob:mock-url';
  });
  mockRevokeObjectURL.mockReset();
  lastBlobContent = '';

  // Spy on Blob to capture content
  vi.spyOn(globalThis, 'Blob').mockImplementation((...args) => {
    const parts = args[0] as string[];
    lastBlobContent = parts.join('');
    return new OriginalBlob(...(args as ConstructorParameters<typeof Blob>));
  });

  mockAnchor = { href: '', download: '', click: mockClick };
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') return mockAnchor as unknown as HTMLAnchorElement;
    return document.createElement(tag);
  });

  vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
  vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

  vi.stubGlobal('URL', {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

type Row = { name: string; amount: number; note: string };

const columns = [
  { key: 'name' as keyof Row & string, header: 'Nombre' },
  { key: 'amount' as keyof Row & string, header: 'Monto' },
  { key: 'note' as keyof Row & string, header: 'Nota' },
];

const data: Row[] = [
  { name: 'Juan', amount: 500, note: 'Pago normal' },
  { name: 'Ana', amount: 750, note: 'Con descuento' },
];

describe('exportToCSV', () => {
  it('should not do anything when data is empty', () => {
    exportToCSV([], columns, 'test');

    expect(mockCreateObjectURL).not.toHaveBeenCalled();
    expect(mockClick).not.toHaveBeenCalled();
  });

  it('should create a blob and trigger download', () => {
    exportToCSV(data, columns, 'reporte');

    expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(OriginalBlob));
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should set download filename with date suffix', () => {
    exportToCSV(data, columns, 'cuotas');

    expect(mockAnchor.download).toMatch(/^cuotas_\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('should include UTF-8 BOM at the start', () => {
    exportToCSV(data, columns, 'test');

    expect(lastBlobContent.charCodeAt(0)).toBe(0xfeff);
  });

  it('should generate correct headers', () => {
    exportToCSV(data, columns, 'test');

    expect(lastBlobContent).toContain('Nombre,Monto,Nota');
  });

  it('should generate correct data rows', () => {
    exportToCSV(data, columns, 'test');

    expect(lastBlobContent).toContain('Juan,500,Pago normal');
    expect(lastBlobContent).toContain('Ana,750,Con descuento');
  });

  it('should escape values containing commas', () => {
    const commaData: Row[] = [{ name: 'García, Juan', amount: 100, note: 'ok' }];
    exportToCSV(commaData, columns, 'test');

    expect(lastBlobContent).toContain('"García, Juan"');
  });

  it('should escape values containing double quotes', () => {
    const quoteData: Row[] = [{ name: 'El "Parque"', amount: 100, note: 'ok' }];
    exportToCSV(quoteData, columns, 'test');

    expect(lastBlobContent).toContain('"El ""Parque"""');
  });
});
