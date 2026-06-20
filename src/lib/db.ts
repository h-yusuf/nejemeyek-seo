import type { Category, ProductVariant, Product, ProductWithDetails } from '../types';

// ─── Categories ────────────────────────────────────────────────────────────

export async function getCategories(db: D1Database): Promise<Category[]> {
  const r = await db
    .prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC')
    .all<Category>();
  return r.results;
}

export async function getCategoryById(db: D1Database, id: string): Promise<Category | null> {
  return db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first<Category>() ?? null;
}

export async function createCategory(
  db: D1Database,
  data: { id: string; name: string; sort_order: number },
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare('INSERT INTO categories (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)')
    .bind(data.id, data.name, data.sort_order, now)
    .run();
}

export async function deleteCategory(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
}

// ─── Product Variants ───────────────────────────────────────────────────────

export async function getVariants(db: D1Database): Promise<ProductVariant[]> {
  const r = await db
    .prepare('SELECT * FROM product_variants ORDER BY sort_order ASC, label ASC')
    .all<ProductVariant>();
  return r.results;
}

export async function createVariant(
  db: D1Database,
  data: { label: string; sort_order: number },
): Promise<void> {
  const id = crypto.randomUUID();
  await db
    .prepare('INSERT INTO product_variants (id, label, sort_order) VALUES (?, ?, ?)')
    .bind(id, data.label, data.sort_order)
    .run();
}

export async function deleteVariant(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM product_variants WHERE id = ?').bind(id).run();
}

// ─── Products ───────────────────────────────────────────────────────────────

async function attachDetails(db: D1Database, products: Product[]): Promise<ProductWithDetails[]> {
  if (products.length === 0) return [];

  const [catsResult, varsResult] = await db.batch([
    db.prepare('SELECT * FROM categories'),
    db.prepare('SELECT * FROM product_variants'),
  ]);

  const cats = new Map((catsResult as D1Result<Category>).results.map(c => [c.id, c]));
  const vars = new Map((varsResult as D1Result<ProductVariant>).results.map(v => [v.id, v]));

  const results: ProductWithDetails[] = [];
  for (const p of products) {
    const category = cats.get(p.category_id);
    const variant = vars.get(p.variant_id);
    if (!category || !variant) continue; // skip orphaned rows
    results.push({
      ...p,
      category,
      variant,
      displayName: `${category.name} ${variant.label}`,
    });
  }
  return results;
}

export async function getActiveProducts(db: D1Database): Promise<ProductWithDetails[]> {
  const r = await db
    .prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC')
    .all<Product>();
  return attachDetails(db, r.results);
}

export async function getAllProducts(db: D1Database): Promise<ProductWithDetails[]> {
  const r = await db
    .prepare('SELECT * FROM products ORDER BY sort_order ASC, created_at DESC')
    .all<Product>();
  return attachDetails(db, r.results);
}

export async function getProductById(db: D1Database, id: string): Promise<ProductWithDetails | null> {
  const p = await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<Product>();
  if (!p) return null;
  const [details] = await attachDetails(db, [p]);
  return details ?? null;
}

export async function createProduct(
  db: D1Database,
  data: {
    category_id: string;
    variant_id: string;
    price: number;
    original_price: number | null;
    image_url: string | null;
    description: string | null;
    sort_order: number;
  },
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      'INSERT INTO products (id, category_id, variant_id, price, original_price, image_url, description, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)',
    )
    .bind(id, data.category_id, data.variant_id, data.price, data.original_price, data.image_url, data.description, data.sort_order, now, now)
    .run();
  return id;
}

export async function updateProduct(
  db: D1Database,
  id: string,
  updates: Partial<Pick<Product, 'price' | 'original_price' | 'image_url' | 'description' | 'is_active' | 'sort_order' | 'category_id' | 'variant_id'>>,
): Promise<void> {
  const now = new Date().toISOString();
  const ALLOWED_UPDATE_COLUMNS = new Set(['price', 'original_price', 'image_url', 'description', 'is_active', 'sort_order', 'category_id', 'variant_id']);
  const entries = Object.entries(updates).filter(([k]) => ALLOWED_UPDATE_COLUMNS.has(k));
  if (entries.length === 0) return;
  const setClause = entries.map(([k]) => `${k} = ?`).join(', ');
  const values = [...entries.map(([, v]) => v), now, id];
  await db
    .prepare(`UPDATE products SET ${setClause}, updated_at = ? WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function deleteProduct(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
}
