import { describe, it, expect, vi } from 'vitest';
import { getActiveProducts, getCategoryById } from './db';

function makeDb(firstResult: unknown = null, allResults: unknown[] = []) {
  return {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(firstResult),
    all: vi.fn().mockResolvedValue({ results: allResults }),
    run: vi.fn().mockResolvedValue({}),
    batch: vi.fn().mockResolvedValue([
      { results: allResults },
      { results: [] },
    ]),
  } as unknown as D1Database;
}

describe('getCategoryById', () => {
  it('returns category when found', async () => {
    const cat = { id: 'peyek-rebon', name: 'Peyek Rebon', sort_order: 0, created_at: '' };
    const db = makeDb(cat);
    const result = await getCategoryById(db, 'peyek-rebon');
    expect(result).toEqual(cat);
  });

  it('returns null when not found', async () => {
    const db = makeDb(null);
    const result = await getCategoryById(db, 'not-exist');
    expect(result).toBeNull();
  });
});
