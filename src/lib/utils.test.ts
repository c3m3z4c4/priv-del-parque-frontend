import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('should merge simple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should ignore falsy values', () => {
    expect(cn('foo', false && 'bar', null, undefined, '')).toBe('foo');
  });

  it('should handle conditional object syntax', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('should resolve tailwind conflicts (last one wins)', () => {
    // tailwind-merge picks the last conflicting class
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('should work with mixed inputs', () => {
    const result = cn('base', { active: true, hidden: false }, 'extra');
    expect(result).toBe('base active extra');
  });

  it('should return empty string with no arguments', () => {
    expect(cn()).toBe('');
  });
});
