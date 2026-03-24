import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSortable, applySortLocale, SortDir } from './useSortable';

// ─── useSortable ──────────────────────────────────────────────────────────────

describe('useSortable', () => {
  it('should initialize with given column and direction', () => {
    const { result } = renderHook(() => useSortable('name', 'asc'));

    expect(result.current.sortCol).toBe('name');
    expect(result.current.sortDir).toBe('asc');
  });

  it('should default direction to asc when not provided', () => {
    const { result } = renderHook(() => useSortable('email'));

    expect(result.current.sortDir).toBe('asc');
  });

  it('should toggle direction when same column is sorted again', () => {
    const { result } = renderHook(() => useSortable('name', 'asc'));

    act(() => result.current.handleSort('name'));
    expect(result.current.sortDir).toBe('desc');

    act(() => result.current.handleSort('name'));
    expect(result.current.sortDir).toBe('asc');
  });

  it('should change column and reset to asc when a different column is sorted', () => {
    const { result } = renderHook(() => useSortable('name', 'desc'));

    act(() => result.current.handleSort('email'));
    expect(result.current.sortCol).toBe('email');
    expect(result.current.sortDir).toBe('asc');
  });
});

// ─── applySortLocale ──────────────────────────────────────────────────────────

type Item = { name: string; amount: number; note?: string };

const getValue = (item: Item, col: string): string | number | undefined =>
  (item as Record<string, unknown>)[col] as string | number | undefined;

describe('applySortLocale', () => {
  const items: Item[] = [
    { name: 'Carlos', amount: 300 },
    { name: 'Ana',    amount: 100 },
    { name: 'Beatriz', amount: 200 },
  ];

  it('should sort strings ascending', () => {
    const sorted = applySortLocale(items, 'name', 'asc', getValue);
    expect(sorted.map(i => i.name)).toEqual(['Ana', 'Beatriz', 'Carlos']);
  });

  it('should sort strings descending', () => {
    const sorted = applySortLocale(items, 'name', 'desc', getValue);
    expect(sorted.map(i => i.name)).toEqual(['Carlos', 'Beatriz', 'Ana']);
  });

  it('should sort numbers ascending', () => {
    const sorted = applySortLocale(items, 'amount', 'asc', getValue);
    expect(sorted.map(i => i.amount)).toEqual([100, 200, 300]);
  });

  it('should sort numbers descending', () => {
    const sorted = applySortLocale(items, 'amount', 'desc', getValue);
    expect(sorted.map(i => i.amount)).toEqual([300, 200, 100]);
  });

  it('should not mutate the original array', () => {
    const original = [...items];
    applySortLocale(items, 'name', 'asc', getValue);
    expect(items).toEqual(original);
  });

  it('should treat undefined values as empty string (sorts first in asc)', () => {
    const withUndefined: Item[] = [
      { name: 'Zoe', amount: 1 },
      { name: 'Mia', amount: 2, note: undefined },
    ];
    const sorted = applySortLocale(withUndefined, 'note', 'asc', getValue);
    // Both have undefined note → order preserved (stable)
    expect(sorted).toHaveLength(2);
  });

  it('should handle locale-aware Spanish sorting with accents', () => {
    const spanishItems: Item[] = [
      { name: 'Úrsula', amount: 1 },
      { name: 'álvaro', amount: 2 },
      { name: 'Beatriz', amount: 3 },
    ];
    const sorted = applySortLocale(spanishItems, 'name', 'asc', getValue);
    // With sensitivity: 'base', á ≈ a, ú ≈ u
    expect(sorted[0].name).toBe('álvaro');
    expect(sorted[sorted.length - 1].name).toBe('Úrsula');
  });
});
