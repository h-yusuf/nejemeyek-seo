import { describe, it, expect } from 'vitest';
import { buildWaOrderUrl, formatRupiah, slugify } from './wa';

describe('buildWaOrderUrl', () => {
  it('builds WA URL with pre-filled message', () => {
    const url = buildWaOrderUrl({
      displayName: 'Peyek Rebon 250gr',
      qty: 2,
      waNumber: '6281234567890',
    });
    expect(url).toContain('https://wa.me/6281234567890');
    expect(url).toContain(encodeURIComponent('Peyek Rebon 250gr'));
    expect(url).toContain(encodeURIComponent('x2'));
  });
});

describe('formatRupiah', () => {
  it('formats to Indonesian Rupiah', () => {
    expect(formatRupiah(25000)).toBe('Rp 25.000');
  });
});

describe('slugify', () => {
  it('converts to URL-safe slug', () => {
    expect(slugify('Peyek Rebon')).toBe('peyek-rebon');
  });
  it('strips special characters', () => {
    expect(slugify('Peyek & Teri!')).toBe('peyek-teri');
  });
  it('collapses hyphens', () => {
    expect(slugify('peyek--kacang')).toBe('peyek-kacang');
  });
});
