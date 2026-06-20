# Nejemeyek Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Nejemeyek — SEO-first, mobile-first product website for peyek khas Jogja with admin CMS, deployed on Cloudflare Pages + D1, images on MinIO.

**Architecture:** Astro 4 hybrid mode. Public pages SSG (build-time) for SEO. Admin routes SSR for live CRUD. Cloudflare Access protects all `/admin/*` — zero auth code in app. Every write triggers Cloudflare Pages deploy webhook to rebuild public pages.

**Tech Stack:** Astro 4, Tailwind CSS 3, `@astrojs/cloudflare`, Cloudflare D1, MinIO (S3-compatible), `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, Vitest

## Global Constraints

- Astro `output: 'hybrid'` — SSG default; add `export const prerender = false` for SSR pages
- All `/admin/*` pages and API routes must have `export const prerender = false`
- D1 accessed only via `locals.runtime.env.DB`
- Single image per product stored as `image_url` in products table (not a separate table)
- Product name = auto-generated `${category.name} ${variant.label}` — never stored separately
- `WA_NUMBER` format: `628xxxxxxxxx` (no `+`, no spaces)
- All prices in Rupiah as integers
- Product `id` = UUID (not slug — slug is category.id)
- Every successful write must POST to `CF_PAGES_WEBHOOK` (fire-and-forget)
- MinIO requires `forcePathStyle: true` in S3Client config
- Mobile-first: all public pages designed for 375px width first

---

## File Map

```
/
├── astro.config.mjs
├── tailwind.config.mjs
├── wrangler.toml
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
├── .gitignore
└── src/
    ├── env.d.ts
    ├── types.ts
    ├── lib/
    │   ├── db.ts          # All D1 query functions
    │   ├── storage.ts     # MinIO presigned URL + delete
    │   └── wa.ts          # WA message builder, formatRupiah, slugify
    ├── layouts/
    │   ├── BaseLayout.astro
    │   └── AdminLayout.astro
    ├── components/
    │   ├── ProductCard.astro        # Card in 2-col grid
    │   ├── CategoryTabs.astro       # Horizontal scrollable filter tabs
    │   └── admin/
    │       ├── ImageUploader.astro  # Presigned URL upload
    │       └── MasterTabs.astro     # Kategori + Variant tabs UI
    ├── pages/
    │   ├── index.astro              # Landing page (SSG)
    │   ├── produk/
    │   │   └── [id].astro           # Product detail (SSG)
    │   ├── sitemap.xml.ts
    │   ├── robots.txt.ts
    │   └── admin/
    │       ├── index.astro          # Dashboard (SSR)
    │       ├── master.astro         # Kategori + Variant tabs (SSR)
    │       ├── produk/
    │       │   ├── index.astro      # Product list (SSR)
    │       │   ├── new.astro        # New product form (SSR)
    │       │   └── [id].astro       # Edit product form (SSR)
    │       └── api/
    │           ├── products.ts      # POST create, PUT update, DELETE
    │           ├── categories.ts    # POST create, DELETE
    │           ├── variants.ts      # POST create, DELETE
    │           ├── images.ts        # GET presigned URL, DELETE from MinIO
    │           └── revalidate.ts    # POST → trigger CF Pages rebuild
    └── migrations/
        └── 001_initial.sql
```

---

### Task 1: Project Scaffold + Config

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tailwind.config.mjs`, `wrangler.toml`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `.gitignore`, `src/env.d.ts`

**Interfaces:**
- Produces: Runnable `astro dev` with Cloudflare D1 bindings via `platformProxy`

- [ ] **Step 1: Init git and Astro project**

```bash
git init
npm create astro@latest . -- --template minimal --no-install --no-git
```

When prompted: TypeScript → Yes, strict.

- [ ] **Step 2: Install dependencies**

```bash
npm install @astrojs/cloudflare @astrojs/tailwind tailwindcss
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install -D vitest @cloudflare/workers-types
```

- [ ] **Step 3: Write `astro.config.mjs`**

```javascript
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://nejemeyekjogja.com',
  output: 'hybrid',
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  integrations: [tailwind()],
});
```

- [ ] **Step 4: Write `tailwind.config.mjs`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fef9ee',
          100: '#fdf0d5',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          900: '#78350f',
        },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 5: Write `wrangler.toml`**

```toml
name = "nejemeyek"
compatibility_date = "2024-09-23"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "nejemeyek-db"
database_id = "REPLACE_AFTER_D1_CREATE"
```

- [ ] **Step 6: Write `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 7: Write `src/env.d.ts`**

```typescript
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

interface Env {
  DB: D1Database;
  MINIO_ENDPOINT: string;
  MINIO_BUCKET: string;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  WA_NUMBER: string;
  CF_PAGES_WEBHOOK: string;
}

declare namespace App {
  interface Locals extends Runtime {}
}
```

- [ ] **Step 8: Write `.env.example`**

```
MINIO_ENDPOINT=https://minio.yourserver.com
MINIO_BUCKET=nejemeyek
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
WA_NUMBER=6281234567890
CF_PAGES_WEBHOOK=https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/YOUR_HOOK_ID
```

- [ ] **Step 9: Write `.gitignore`**

```
node_modules/
dist/
.wrangler/
.env
.env.local
*.local
```

- [ ] **Step 10: Verify dev server starts**

```bash
npx astro dev
```

Expected: Server at `http://localhost:4321`

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "feat: scaffold Astro + Cloudflare + Tailwind project"
```

---

### Task 2: D1 Schema + Types + DB Library

**Files:**
- Create: `src/migrations/001_initial.sql`
- Create: `src/types.ts`
- Create: `src/lib/db.ts`
- Create: `src/lib/db.test.ts`

**Interfaces:**
- Produces (all accept `D1Database` as first param):
  - `getCategories(db)` → `Category[]`
  - `getCategoryById(db, id)` → `Category | null`
  - `createCategory(db, data)` → `void`
  - `deleteCategory(db, id)` → `void`
  - `getVariants(db)` → `ProductVariant[]`
  - `createVariant(db, data)` → `void`
  - `deleteVariant(db, id)` → `void`
  - `getActiveProducts(db)` → `ProductWithDetails[]`
  - `getProductById(db, id)` → `ProductWithDetails | null`
  - `getAllProducts(db)` → `ProductWithDetails[]`
  - `createProduct(db, data)` → `void`
  - `updateProduct(db, id, updates)` → `void`
  - `deleteProduct(db, id)` → `void`

- [ ] **Step 1: Write migration**

```sql
-- src/migrations/001_initial.sql
CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_variants (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id             TEXT PRIMARY KEY,
  category_id    TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  variant_id     TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  price          INTEGER NOT NULL,
  original_price INTEGER,
  image_url      TEXT,
  is_active      INTEGER NOT NULL DEFAULT 1,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
```

- [ ] **Step 2: Write `src/types.ts`**

```typescript
export interface Category {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  label: string;
  sort_order: number;
}

export interface Product {
  id: string;
  category_id: string;
  variant_id: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  is_active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductWithDetails extends Product {
  category: Category;
  variant: ProductVariant;
  displayName: string; // "${category.name} ${variant.label}"
}
```

- [ ] **Step 3: Write failing tests**

```typescript
// src/lib/db.test.ts
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
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
npx vitest run src/lib/db.test.ts
```

Expected: FAIL — `Cannot find module './db'`

- [ ] **Step 5: Write `src/lib/db.ts`**

```typescript
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

  return products.map(p => {
    const category = cats.get(p.category_id)!;
    const variant = vars.get(p.variant_id)!;
    return {
      ...p,
      category,
      variant,
      displayName: `${category.name} ${variant.label}`,
    };
  });
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
    sort_order: number;
  },
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare('INSERT INTO products (id, category_id, variant_id, price, original_price, image_url, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)')
    .bind(id, data.category_id, data.variant_id, data.price, data.original_price, data.image_url, data.sort_order, now, now)
    .run();
  return id;
}

export async function updateProduct(
  db: D1Database,
  id: string,
  updates: Partial<Pick<Product, 'price' | 'original_price' | 'image_url' | 'is_active' | 'sort_order' | 'category_id' | 'variant_id'>>,
): Promise<void> {
  const now = new Date().toISOString();
  const entries = Object.entries(updates);
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
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run src/lib/db.test.ts
```

Expected: PASS

- [ ] **Step 7: Create D1 and apply migration**

```bash
npx wrangler d1 create nejemeyek-db
# Copy database_id into wrangler.toml

npx wrangler d1 execute nejemeyek-db --local --file=src/migrations/001_initial.sql
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: D1 schema + types + db query library"
```

---

### Task 3: Storage + WA Utilities

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/lib/wa.ts`
- Create: `src/lib/wa.test.ts`

**Interfaces:**
- Produces:
  - `getPresignedUploadUrl(config, key, contentType)` → `Promise<string>`
  - `getPublicUrl(config, key)` → `string`
  - `deleteObject(config, key)` → `Promise<void>`
  - `keyFromUrl(url, endpoint, bucket)` → `string`
  - `buildWaOrderUrl(params)` → `string`
  - `formatRupiah(price)` → `string` (e.g. "Rp 25.000")
  - `slugify(text)` → `string` (e.g. "Peyek Rebon" → "peyek-rebon")

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/wa.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/wa.test.ts
```

Expected: FAIL — `Cannot find module './wa'`

- [ ] **Step 3: Write `src/lib/wa.ts`**

```typescript
export interface WaOrderParams {
  displayName: string;
  qty: number;
  waNumber: string;
}

export function buildWaOrderUrl(params: WaOrderParams): string {
  const message = `Halo, saya mau pesan:\n- ${params.displayName} x${params.qty}\nApakah stok tersedia?`;
  return `https://wa.me/${params.waNumber}?text=${encodeURIComponent(message)}`;
}

export function formatRupiah(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/wa.test.ts
```

Expected: PASS

- [ ] **Step 5: Write `src/lib/storage.ts`**

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageConfig {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
}

function createClient(config: StorageConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
  });
}

export async function getPresignedUploadUrl(
  config: StorageConfig,
  key: string,
  contentType: string,
): Promise<string> {
  const client = createClient(config);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

export function getPublicUrl(config: StorageConfig, key: string): string {
  return `${config.endpoint}/${config.bucket}/${key}`;
}

export async function deleteObject(config: StorageConfig, key: string): Promise<void> {
  const client = createClient(config);
  await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}

export function keyFromUrl(url: string, endpoint: string, bucket: string): string {
  return url.replace(`${endpoint}/${bucket}/`, '');
}
```

- [ ] **Step 6: Configure MinIO CORS (on VPS)**

```bash
mc alias set myminio https://minio.yourserver.com ACCESSKEY SECRETKEY
mc anonymous set download myminio/nejemeyek
```

Create `cors.json`:
```json
[{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["GET", "PUT"],
  "AllowedOrigins": ["https://nejemeyekjogja.com", "http://localhost:4321"],
  "ExposeHeaders": ["ETag"]
}]
```
```bash
mc cors set myminio/nejemeyek cors.json
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/
git commit -m "feat: storage + WA utilities with tests"
```

---

### Task 4: Layouts

**Files:**
- Create: `src/styles/global.css`
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/layouts/AdminLayout.astro`

**Interfaces:**
- Produces: HTML shell with SEO meta, schema.org, OG tags; admin nav shell

- [ ] **Step 1: Create `src/styles/global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: Write `src/layouts/BaseLayout.astro`**

```astro
---
import '../styles/global.css';

interface Props {
  title: string;
  description: string;
  ogImage?: string;
  canonicalUrl?: string;
  isProductPage?: boolean;
  productSchema?: Record<string, unknown>;
  localBusiness?: boolean;
}

const {
  title,
  description,
  ogImage = '/og-default.jpg',
  canonicalUrl = Astro.url.href,
  localBusiness = false,
  productSchema,
} = Astro.props;

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Nejemeyek',
  description: 'Peyek khas Jogja, dibuat dengan resep tradisional.',
  url: Astro.site?.toString() ?? '',
  telephone: '+62' + (import.meta.env.WA_NUMBER ?? '').slice(2),
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Yogyakarta',
    addressRegion: 'DIY',
    addressCountry: 'ID',
  },
  areaServed: 'Yogyakarta',
};
---

<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonicalUrl} />

    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={ogImage} />
    <meta property="og:url" content={canonicalUrl} />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="id_ID" />
    <meta name="twitter:card" content="summary_large_image" />

    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

    {localBusiness && (
      <script type="application/ld+json" set:html={JSON.stringify(localBusinessSchema)} />
    )}
    {productSchema && (
      <script type="application/ld+json" set:html={JSON.stringify(productSchema)} />
    )}
  </head>
  <body class="bg-stone-50 text-stone-900 font-sans">
    <slot />
  </body>
</html>
```

- [ ] **Step 3: Write `src/layouts/AdminLayout.astro`**

```astro
---
import '../styles/global.css';

interface Props {
  title: string;
}
const { title } = Astro.props;
const path = Astro.url.pathname;
---

<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title} — Nejemeyek Admin</title>
  </head>
  <body class="bg-stone-100 text-stone-900 font-sans min-h-screen">
    <nav class="bg-brand-700 text-white px-4 py-3 flex items-center gap-6">
      <a href="/admin" class="font-bold">Nejemeyek</a>
      <a href="/admin/produk" class={`text-sm ${path.startsWith('/admin/produk') ? 'text-white font-medium' : 'text-brand-200 hover:text-white'}`}>Produk</a>
      <a href="/admin/master" class={`text-sm ${path === '/admin/master' ? 'text-white font-medium' : 'text-brand-200 hover:text-white'}`}>Master</a>
    </nav>
    <main class="max-w-3xl mx-auto px-4 py-8">
      <slot />
    </main>
  </body>
</html>
```

- [ ] **Step 4: Create minimal favicon**

```bash
mkdir -p public
```

Create `public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <text y=".9em" font-size="90">🫘</text>
</svg>
```

- [ ] **Step 5: Commit**

```bash
git add src/layouts/ src/styles/ public/
git commit -m "feat: BaseLayout with SEO + schema.org, AdminLayout"
```

---

### Task 5: Landing Page (Mobile-First)

**Files:**
- Create: `src/components/CategoryTabs.astro`
- Create: `src/components/ProductCard.astro`
- Create: `src/pages/index.astro`

**Interfaces:**
- Consumes: `getActiveProducts(db)`, `getCategories(db)`, `formatRupiah`, `buildWaOrderUrl`, `WA_NUMBER`
- Produces: Static `/` — category tabs + 2-col product grid, mobile-first

- [ ] **Step 1: Write `src/components/CategoryTabs.astro`**

```astro
---
import type { Category } from '../types';

interface Props {
  categories: Category[];
}
const { categories } = Astro.props;
---

<div class="sticky top-0 z-10 bg-stone-50 border-b border-stone-200 px-4 py-3">
  <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none" id="cat-tabs">
    <button
      type="button"
      data-cat="semua"
      class="cat-tab flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium bg-stone-900 text-white"
    >
      Semua
    </button>
    {categories.map(cat => (
      <button
        type="button"
        data-cat={cat.id}
        class="cat-tab flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium bg-stone-100 text-stone-600 hover:bg-stone-200"
      >
        {cat.name}
      </button>
    ))}
  </div>
</div>

<script>
  const tabs = document.querySelectorAll<HTMLButtonElement>('.cat-tab');
  const cards = document.querySelectorAll<HTMLElement>('[data-product-cat]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const cat = tab.dataset.cat!;

      tabs.forEach(t => {
        t.className = 'cat-tab flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium bg-stone-100 text-stone-600 hover:bg-stone-200';
      });
      tab.className = 'cat-tab flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium bg-stone-900 text-white';

      cards.forEach(card => {
        const show = cat === 'semua' || card.dataset.productCat === cat;
        card.style.display = show ? '' : 'none';
      });
    });
  });
</script>

<style>
  .scrollbar-none { scrollbar-width: none; }
  .scrollbar-none::-webkit-scrollbar { display: none; }
</style>
```

- [ ] **Step 2: Write `src/components/ProductCard.astro`**

```astro
---
import { formatRupiah, buildWaOrderUrl } from '../lib/wa';
import type { ProductWithDetails } from '../types';

interface Props {
  product: ProductWithDetails;
  waNumber: string;
}

const { product, waNumber } = Astro.props;
const waUrl = buildWaOrderUrl({ displayName: product.displayName, qty: 1, waNumber });
---

<div
  data-product-cat={product.category_id}
  class="bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col"
>
  <!-- Photo -->
  <div class="relative aspect-square bg-stone-100">
    {product.image_url ? (
      <img
        src={product.image_url}
        alt={product.displayName}
        class="w-full h-full object-cover"
        loading="lazy"
      />
    ) : (
      <div class="w-full h-full flex items-center justify-center text-stone-300 text-4xl">🫘</div>
    )}
    {product.is_active === 0 && (
      <div class="absolute inset-0 bg-black/40 flex items-center justify-center">
        <span class="bg-white/90 text-stone-700 text-xs font-semibold px-3 py-1 rounded-full">Habis</span>
      </div>
    )}
  </div>

  <!-- Info -->
  <div class="p-3 flex flex-col gap-1 flex-1">
    <p class="font-semibold text-stone-900 text-sm leading-snug">{product.category.name}</p>
    <p class="text-stone-400 text-xs">{product.variant.label}</p>

    <!-- Price -->
    <div class="mt-auto pt-2">
      {product.original_price && (
        <p class="text-stone-400 text-xs line-through">{formatRupiah(product.original_price)}</p>
      )}
      <p class="text-brand-700 font-bold text-base">{formatRupiah(product.price)}</p>
    </div>

    <!-- WA button -->
    {product.is_active === 1 ? (
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="mt-2 block text-center border border-stone-200 text-stone-600 text-xs font-medium py-2 rounded-xl hover:bg-stone-50 transition-colors"
      >
        + Pesan
      </a>
    ) : (
      <div class="mt-2 block text-center border border-stone-100 text-stone-300 text-xs font-medium py-2 rounded-xl cursor-not-allowed">
        + Pesan
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 3: Write `src/pages/index.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import CategoryTabs from '../components/CategoryTabs.astro';
import ProductCard from '../components/ProductCard.astro';
import { getActiveProducts, getCategories } from '../lib/db';

const db = Astro.locals.runtime.env.DB;
const waNumber = Astro.locals.runtime.env.WA_NUMBER;

const [products, categories] = await Promise.all([
  getActiveProducts(db),
  getCategories(db),
]);
---

<BaseLayout
  title="Nejemeyek — Peyek Khas Jogja | Peyek Rebon, Kacang, Teri Jogja"
  description="Peyek khas Jogja — Peyek Rebon, Peyek Kacang, Peyek Teri. Dibuat dengan resep tradisional. Pesan via WhatsApp, kirim GoSend atau COD area Yogyakarta."
  localBusiness={true}
>
  <!-- Header -->
  <header class="bg-brand-700 text-white px-4 py-4 flex items-center justify-between">
    <div>
      <p class="text-brand-200 text-xs tracking-widest uppercase">Peyek Khas Jogja</p>
      <h1 class="text-xl font-extrabold">Nejemeyek</h1>
    </div>
    <a
      href={`https://wa.me/${waNumber}?text=${encodeURIComponent('Halo Nejemeyek, saya mau tanya produk dan stok yang tersedia')}`}
      target="_blank"
      rel="noopener noreferrer"
      class="text-xs bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors"
    >
      Chat WA
    </a>
  </header>

  <!-- Category tabs -->
  <CategoryTabs categories={categories} />

  <!-- Product grid -->
  <section class="px-4 py-4">
    {products.length === 0 ? (
      <div class="text-center py-16 text-stone-400">
        <p class="text-4xl mb-3">🫘</p>
        <p>Produk segera hadir...</p>
      </div>
    ) : (
      <div class="grid grid-cols-2 gap-3">
        {products.map(product => (
          <ProductCard product={product} waNumber={waNumber} />
        ))}
      </div>
    )}
  </section>

  <!-- How to order -->
  <section class="mx-4 my-6 bg-brand-50 rounded-2xl p-4">
    <p class="font-semibold text-brand-900 mb-3 text-sm">Cara Pesan</p>
    <div class="space-y-2 text-sm text-stone-600">
      <div class="flex items-center gap-3">
        <span class="text-xl">🛒</span>
        <span>Pilih produk, klik Pesan</span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xl">💬</span>
        <span>Chat konfirmasi via WhatsApp</span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xl">🛵</span>
        <span>Kirim GoSend / COD Yogyakarta</span>
      </div>
    </div>
  </section>

  <footer class="text-center text-stone-400 text-xs py-6 border-t border-stone-100">
    &copy; {new Date().getFullYear()} Nejemeyek — Peyek Khas Jogja
  </footer>
</BaseLayout>
```

- [ ] **Step 4: Seed test data in local D1**

```bash
npx wrangler d1 execute nejemeyek-db --local --command="
INSERT INTO categories (id, name, sort_order, created_at) VALUES
  ('peyek-rebon', 'Peyek Rebon', 1, datetime('now')),
  ('peyek-kacang', 'Peyek Kacang Tanah', 2, datetime('now'));

INSERT INTO product_variants (id, label, sort_order) VALUES
  ('var-250', '250 gram', 1),
  ('var-500', '500 gram', 2),
  ('var-premium', 'Premium Pack', 3);

INSERT INTO products (id, category_id, variant_id, price, original_price, image_url, is_active, sort_order, created_at, updated_at) VALUES
  ('prod-1', 'peyek-rebon', 'var-250', 25000, 30000, NULL, 1, 1, datetime('now'), datetime('now')),
  ('prod-2', 'peyek-rebon', 'var-500', 35000, 45000, NULL, 1, 2, datetime('now'), datetime('now')),
  ('prod-3', 'peyek-kacang', 'var-250', 25000, NULL, NULL, 1, 3, datetime('now'), datetime('now'));
"
```

- [ ] **Step 5: Verify landing page in browser**

```bash
npx astro dev
```

Open `http://localhost:4321`. Verify:
- Header shows "Nejemeyek" on brand background
- Category tabs: "Semua", "Peyek Rebon", "Peyek Kacang Tanah"
- 2-column product grid shows cards
- Each card: category name, variant label, price with strikethrough if `original_price` set
- Click category tab → only that category's cards visible
- Click "Pesan" → opens WA with pre-filled message
- On mobile-width (375px): layout still looks correct

- [ ] **Step 6: Commit**

```bash
git add src/components/CategoryTabs.astro src/components/ProductCard.astro src/pages/index.astro
git commit -m "feat: mobile-first landing page with category tabs and product grid"
```

---

### Task 6: Product Detail Page

**Files:**
- Create: `src/pages/produk/[id].astro`

**Interfaces:**
- Consumes: `getAllProducts(db)` (for `getStaticPaths`), `getProductById(db, id)`, `buildWaOrderUrl`, `formatRupiah`, `WA_NUMBER`
- Produces: Static `/produk/[id]` with photo, name, price, WA button, Product schema

- [ ] **Step 1: Write `src/pages/produk/[id].astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getAllProducts, getProductById } from '../../lib/db';
import { formatRupiah, buildWaOrderUrl } from '../../lib/wa';

export async function getStaticPaths() {
  const db = Astro.locals.runtime.env.DB;
  const products = await getAllProducts(db);
  return products.map(p => ({ params: { id: p.id } }));
}

const { id } = Astro.params;
const db = Astro.locals.runtime.env.DB;
const waNumber = Astro.locals.runtime.env.WA_NUMBER;

const product = await getProductById(db, id);
if (!product) return Astro.redirect('/');

const waUrl = buildWaOrderUrl({ displayName: product.displayName, qty: 1, waNumber });

const productSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.displayName,
  image: product.image_url ?? '',
  brand: { '@type': 'Brand', name: 'Nejemeyek' },
  offers: {
    '@type': 'Offer',
    priceCurrency: 'IDR',
    price: product.price,
    availability: product.is_active === 1
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    seller: { '@type': 'Organization', name: 'Nejemeyek' },
  },
};
---

<BaseLayout
  title={`${product.displayName} — Peyek Khas Jogja | Nejemeyek`}
  description={`${product.displayName} peyek khas Jogja. Harga ${formatRupiah(product.price)}. Pesan via WhatsApp, kirim GoSend atau COD wilayah Yogyakarta.`}
  ogImage={product.image_url ?? undefined}
  productSchema={productSchema}
>
  <div class="max-w-lg mx-auto">
    <!-- Back button -->
    <div class="px-4 pt-4">
      <a href="/" class="text-sm text-stone-500 hover:text-stone-700">← Kembali</a>
    </div>

    <!-- Photo -->
    <div class="aspect-square bg-stone-100 mt-3">
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.displayName}
          class="w-full h-full object-cover"
        />
      ) : (
        <div class="w-full h-full flex items-center justify-center text-stone-300 text-6xl">🫘</div>
      )}
    </div>

    <!-- Info -->
    <div class="px-4 py-4 space-y-4">
      <div>
        <h1 class="text-2xl font-extrabold text-stone-900">{product.category.name}</h1>
        <p class="text-stone-400 text-sm mt-0.5">{product.variant.label}</p>
        <div class="mt-2">
          {product.original_price && (
            <p class="text-stone-400 text-sm line-through">{formatRupiah(product.original_price)}</p>
          )}
          <p class="text-brand-700 font-bold text-3xl">{formatRupiah(product.price)}</p>
        </div>
      </div>

      {product.is_active === 0 && (
        <div class="bg-stone-100 text-stone-500 text-sm text-center py-3 rounded-xl">
          Stok habis — hubungi kami untuk info ketersediaan
        </div>
      )}

      <!-- WA Button -->
      {product.is_active === 1 && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl text-base transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.118.55 4.107 1.512 5.832L.057 23.999l6.304-1.654A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.371l-.36-.213-3.736.979.999-3.648-.233-.374A9.818 9.818 0 1 1 12 21.818z"/>
          </svg>
          Pesan via WhatsApp
        </a>
      )}

      <!-- Delivery info -->
      <div class="bg-stone-50 rounded-xl p-4 text-sm text-stone-500 space-y-2">
        <p>🛵 GoSend / COD wilayah Yogyakarta</p>
        <p>📦 Dikemas rapi agar tetap renyah</p>
      </div>
    </div>

    <footer class="text-center text-stone-400 text-xs py-6 border-t border-stone-100 mt-4">
      &copy; {new Date().getFullYear()} Nejemeyek — Peyek Khas Jogja
    </footer>
  </div>
</BaseLayout>
```

- [ ] **Step 2: Verify product detail page**

```bash
npx astro dev
```

Open `http://localhost:4321/produk/prod-1`. Verify:
- Product name, variant label, price display correct
- Strikethrough price shows if `original_price` set
- WA button opens correct message
- "Habis" state shows for inactive product
- `<script type="application/ld+json">` has `Product` schema
- Responsive at 375px width

- [ ] **Step 3: Commit**

```bash
git add src/pages/produk/
git commit -m "feat: product detail page with WA button and Product schema"
```

---

### Task 7: SEO Static Files

**Files:**
- Create: `src/pages/sitemap.xml.ts`
- Create: `src/pages/robots.txt.ts`

**Interfaces:**
- Consumes: `getAllProducts(db)`, `Astro.site`
- Produces: `/sitemap.xml`, `/robots.txt`

- [ ] **Step 1: Write `src/pages/sitemap.xml.ts`**

```typescript
import type { APIRoute } from 'astro';
import { getAllProducts } from '../lib/db';

export const GET: APIRoute = async ({ locals, site }) => {
  const db = locals.runtime.env.DB;
  const products = await getAllProducts(db);
  const base = site?.toString().replace(/\/$/, '') ?? '';

  const urls = [
    { loc: base + '/', priority: '1.0', changefreq: 'weekly' },
    ...products.map(p => ({
      loc: `${base}/produk/${p.id}`,
      priority: '0.8',
      changefreq: 'weekly',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
```

- [ ] **Step 2: Write `src/pages/robots.txt.ts`**

```typescript
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = site?.toString().replace(/\/$/, '') ?? '';
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${base}/sitemap.xml`,
    { headers: { 'Content-Type': 'text/plain' } },
  );
};
```

- [ ] **Step 3: Verify**

```bash
npx astro dev
```

- `http://localhost:4321/sitemap.xml` → XML with product URLs
- `http://localhost:4321/robots.txt` → `Disallow: /admin/` + sitemap URL

- [ ] **Step 4: Commit**

```bash
git add src/pages/sitemap.xml.ts src/pages/robots.txt.ts
git commit -m "feat: sitemap.xml and robots.txt"
```

---

### Task 8: Admin API Routes

**Files:**
- Create: `src/pages/admin/api/revalidate.ts`
- Create: `src/pages/admin/api/products.ts`
- Create: `src/pages/admin/api/categories.ts`
- Create: `src/pages/admin/api/variants.ts`
- Create: `src/pages/admin/api/images.ts`

All routes require `export const prerender = false`.

**Interfaces:**
- Produces: JSON REST endpoints consumed by admin UI JS

- [ ] **Step 1: Write `src/pages/admin/api/revalidate.ts`**

```typescript
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  const webhook = locals.runtime.env.CF_PAGES_WEBHOOK;
  if (webhook) fetch(webhook, { method: 'POST' }).catch(() => {});
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

- [ ] **Step 2: Write `src/pages/admin/api/categories.ts`**

```typescript
import type { APIRoute } from 'astro';
import { createCategory, deleteCategory, getCategoryById } from '../../../lib/db';
import { slugify } from '../../../lib/wa';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime.env.DB;
  const { name, sort_order = 0 } = await request.json() as { name: string; sort_order?: number };

  if (!name?.trim()) {
    return new Response(JSON.stringify({ error: 'name required' }), { status: 400 });
  }

  const id = slugify(name);
  const existing = await getCategoryById(db, id);
  if (existing) {
    return new Response(JSON.stringify({ error: 'category already exists' }), { status: 409 });
  }

  await createCategory(db, { id, name: name.trim(), sort_order: Number(sort_order) });
  fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
  return new Response(JSON.stringify({ ok: true, id }), { status: 201 });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime.env.DB;
  const { id } = await request.json() as { id: string };
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

  await deleteCategory(db, id);
  fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

- [ ] **Step 3: Write `src/pages/admin/api/variants.ts`**

```typescript
import type { APIRoute } from 'astro';
import { createVariant, deleteVariant } from '../../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime.env.DB;
  const { label, sort_order = 0 } = await request.json() as { label: string; sort_order?: number };

  if (!label?.trim()) {
    return new Response(JSON.stringify({ error: 'label required' }), { status: 400 });
  }

  await createVariant(db, { label: label.trim(), sort_order: Number(sort_order) });
  fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
  return new Response(JSON.stringify({ ok: true }), { status: 201 });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime.env.DB;
  const { id } = await request.json() as { id: string };
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

  await deleteVariant(db, id);
  fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

- [ ] **Step 4: Write `src/pages/admin/api/products.ts`**

```typescript
import type { APIRoute } from 'astro';
import { createProduct, updateProduct, deleteProduct } from '../../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime.env.DB;
  const body = await request.json() as {
    category_id: string; variant_id: string; price: number;
    original_price?: number | null; image_url?: string | null; sort_order?: number;
  };

  if (!body.category_id || !body.variant_id || !body.price) {
    return new Response(JSON.stringify({ error: 'category_id, variant_id, price required' }), { status: 400 });
  }

  const id = await createProduct(db, {
    category_id: body.category_id,
    variant_id: body.variant_id,
    price: Number(body.price),
    original_price: body.original_price ?? null,
    image_url: body.image_url ?? null,
    sort_order: Number(body.sort_order ?? 0),
  });

  fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
  return new Response(JSON.stringify({ ok: true, id }), { status: 201 });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime.env.DB;
  const body = await request.json() as {
    id: string; price?: number; original_price?: number | null;
    image_url?: string | null; is_active?: number; sort_order?: number;
    category_id?: string; variant_id?: string;
  };

  if (!body.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

  const { id, ...updates } = body;
  await updateProduct(db, id, updates as Parameters<typeof updateProduct>[2]);
  fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime.env.DB;
  const { id } = await request.json() as { id: string };
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

  await deleteProduct(db, id);
  fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

- [ ] **Step 5: Write `src/pages/admin/api/images.ts`**

```typescript
import type { APIRoute } from 'astro';
import { updateProduct } from '../../../lib/db';
import { getPresignedUploadUrl, deleteObject, keyFromUrl } from '../../../lib/storage';

export const prerender = false;

// GET ?filename=foo.jpg&contentType=image/jpeg&productId=uuid
export const GET: APIRoute = async ({ url, locals }) => {
  const filename = url.searchParams.get('filename');
  const contentType = url.searchParams.get('contentType') ?? 'image/jpeg';
  const productId = url.searchParams.get('productId');

  if (!filename || !productId) {
    return new Response(JSON.stringify({ error: 'filename and productId required' }), { status: 400 });
  }

  const env = locals.runtime.env;
  const key = `products/${productId}/${Date.now()}-${filename}`;
  const config = {
    endpoint: env.MINIO_ENDPOINT, bucket: env.MINIO_BUCKET,
    accessKey: env.MINIO_ACCESS_KEY, secretKey: env.MINIO_SECRET_KEY,
  };

  const presignedUrl = await getPresignedUploadUrl(config, key, contentType);
  const publicUrl = `${env.MINIO_ENDPOINT}/${env.MINIO_BUCKET}/${key}`;

  return new Response(JSON.stringify({ presignedUrl, publicUrl }), { status: 200 });
};

// POST — save image_url to product row after upload
export const POST: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime.env.DB;
  const { productId, imageUrl } = await request.json() as { productId: string; imageUrl: string };

  if (!productId || !imageUrl) {
    return new Response(JSON.stringify({ error: 'productId and imageUrl required' }), { status: 400 });
  }

  await updateProduct(db, productId, { image_url: imageUrl });
  fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

// DELETE — remove from MinIO and clear image_url on product
export const DELETE: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime.env.DB;
  const env = locals.runtime.env;
  const { productId, imageUrl } = await request.json() as { productId: string; imageUrl: string };

  if (!productId || !imageUrl) {
    return new Response(JSON.stringify({ error: 'productId and imageUrl required' }), { status: 400 });
  }

  const config = {
    endpoint: env.MINIO_ENDPOINT, bucket: env.MINIO_BUCKET,
    accessKey: env.MINIO_ACCESS_KEY, secretKey: env.MINIO_SECRET_KEY,
  };
  const key = keyFromUrl(imageUrl, env.MINIO_ENDPOINT, env.MINIO_BUCKET);

  await Promise.all([
    deleteObject(config, key),
    updateProduct(db, productId, { image_url: null }),
  ]);

  fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

- [ ] **Step 6: Quick smoke test with curl**

```bash
npx astro dev

# Create category
curl -X POST http://localhost:4321/admin/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Peyek Rebon","sort_order":1}'
# Expected: {"ok":true,"id":"peyek-rebon"}

# Create variant
curl -X POST http://localhost:4321/admin/api/variants \
  -H "Content-Type: application/json" \
  -d '{"label":"250 gram","sort_order":1}'
# Expected: {"ok":true}
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/api/
git commit -m "feat: admin API routes — products, categories, variants, images, revalidate"
```

---

### Task 9: Admin Master Page (Kategori + Variant Tabs)

**Files:**
- Create: `src/pages/admin/master.astro`

**Interfaces:**
- Consumes: `getCategories(db)`, `getVariants(db)`
- Produces: SSR page at `/admin/master` with two tabs — Kategori and Variant

- [ ] **Step 1: Write `src/pages/admin/master.astro`**

```astro
---
export const prerender = false;
import AdminLayout from '../../layouts/AdminLayout.astro';
import { getCategories, getVariants } from '../../lib/db';

const db = Astro.locals.runtime.env.DB;
const [categories, variants] = await Promise.all([
  getCategories(db),
  getVariants(db),
]);
---

<AdminLayout title="Master Data">
  <h1 class="text-2xl font-bold mb-6">Master Data</h1>

  <!-- Tabs -->
  <div class="flex border-b border-stone-200 mb-6">
    <button
      type="button"
      id="tab-kategori"
      class="tab-btn px-4 py-2 text-sm font-medium border-b-2 border-brand-600 text-brand-700 -mb-px"
    >
      Kategori
    </button>
    <button
      type="button"
      id="tab-variant"
      class="tab-btn px-4 py-2 text-sm font-medium border-b-2 border-transparent text-stone-500 hover:text-stone-700 -mb-px"
    >
      Variant
    </button>
  </div>

  <!-- Kategori panel -->
  <div id="panel-kategori" class="space-y-4">
    <div class="space-y-2">
      {categories.map(cat => (
        <div class="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
          <div>
            <p class="font-medium text-stone-900">{cat.name}</p>
            <p class="text-xs text-stone-400">/{cat.id}</p>
          </div>
          <button
            type="button"
            class="text-sm text-red-500 hover:text-red-700 delete-cat-btn"
            data-id={cat.id}
            data-name={cat.name}
          >
            Hapus
          </button>
        </div>
      ))}
    </div>

    <!-- Add category form -->
    <div class="bg-white rounded-xl p-4 shadow-sm">
      <p class="font-medium text-stone-700 mb-3 text-sm">Tambah Kategori</p>
      <div class="flex gap-2">
        <input
          type="text"
          id="new-cat-name"
          placeholder="Peyek Rebon"
          class="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
        />
        <input
          type="number"
          id="new-cat-order"
          placeholder="Urutan"
          value="0"
          class="w-24 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
        />
        <button
          type="button"
          id="add-cat-btn"
          class="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700"
        >
          Tambah
        </button>
      </div>
      <p id="cat-error" class="text-red-500 text-xs mt-2 hidden"></p>
    </div>
  </div>

  <!-- Variant panel (hidden by default) -->
  <div id="panel-variant" class="space-y-4 hidden">
    <div class="space-y-2">
      {variants.map(v => (
        <div class="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
          <p class="font-medium text-stone-900">{v.label}</p>
          <button
            type="button"
            class="text-sm text-red-500 hover:text-red-700 delete-var-btn"
            data-id={v.id}
            data-label={v.label}
          >
            Hapus
          </button>
        </div>
      ))}
    </div>

    <!-- Add variant form -->
    <div class="bg-white rounded-xl p-4 shadow-sm">
      <p class="font-medium text-stone-700 mb-3 text-sm">Tambah Variant</p>
      <div class="flex gap-2">
        <input
          type="text"
          id="new-var-label"
          placeholder="250 gram"
          class="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
        />
        <button
          type="button"
          id="add-var-btn"
          class="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700"
        >
          Tambah
        </button>
      </div>
      <p id="var-error" class="text-red-500 text-xs mt-2 hidden"></p>
    </div>
  </div>
</AdminLayout>

<script>
  // Tabs
  const tabKat = document.getElementById('tab-kategori')!;
  const tabVar = document.getElementById('tab-variant')!;
  const panelKat = document.getElementById('panel-kategori')!;
  const panelVar = document.getElementById('panel-variant')!;

  const activeTabClass = 'tab-btn px-4 py-2 text-sm font-medium border-b-2 border-brand-600 text-brand-700 -mb-px';
  const inactiveTabClass = 'tab-btn px-4 py-2 text-sm font-medium border-b-2 border-transparent text-stone-500 hover:text-stone-700 -mb-px';

  tabKat.addEventListener('click', () => {
    tabKat.className = activeTabClass; tabVar.className = inactiveTabClass;
    panelKat.classList.remove('hidden'); panelVar.classList.add('hidden');
  });

  tabVar.addEventListener('click', () => {
    tabVar.className = activeTabClass; tabKat.className = inactiveTabClass;
    panelVar.classList.remove('hidden'); panelKat.classList.add('hidden');
  });

  // Add category
  document.getElementById('add-cat-btn')?.addEventListener('click', async () => {
    const name = (document.getElementById('new-cat-name') as HTMLInputElement).value.trim();
    const sort_order = Number((document.getElementById('new-cat-order') as HTMLInputElement).value);
    const errEl = document.getElementById('cat-error')!;

    if (!name) { errEl.textContent = 'Nama wajib diisi'; errEl.classList.remove('hidden'); return; }

    const res = await fetch('/admin/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sort_order }),
    });

    if (res.ok) {
      window.location.reload();
    } else {
      const { error } = await res.json() as { error: string };
      errEl.textContent = error; errEl.classList.remove('hidden');
    }
  });

  // Delete category
  document.querySelectorAll('.delete-cat-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const el = btn as HTMLButtonElement;
      if (!confirm(`Hapus kategori "${el.dataset.name}"? Semua produk dalam kategori ini juga akan terhapus.`)) return;

      await fetch('/admin/api/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: el.dataset.id }),
      });
      window.location.reload();
    });
  });

  // Add variant
  document.getElementById('add-var-btn')?.addEventListener('click', async () => {
    const label = (document.getElementById('new-var-label') as HTMLInputElement).value.trim();
    const errEl = document.getElementById('var-error')!;

    if (!label) { errEl.textContent = 'Label wajib diisi'; errEl.classList.remove('hidden'); return; }

    const res = await fetch('/admin/api/variants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });

    if (res.ok) {
      window.location.reload();
    } else {
      const { error } = await res.json() as { error: string };
      errEl.textContent = error; errEl.classList.remove('hidden');
    }
  });

  // Delete variant
  document.querySelectorAll('.delete-var-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const el = btn as HTMLButtonElement;
      if (!confirm(`Hapus variant "${el.dataset.label}"?`)) return;

      await fetch('/admin/api/variants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: el.dataset.id }),
      });
      window.location.reload();
    });
  });
</script>
```

- [ ] **Step 2: Verify**

```bash
npx astro dev
```

Open `http://localhost:4321/admin/master`. Verify:
- Two tabs: Kategori and Variant
- Click tab switches panel without page reload
- Add kategori → appears in list on reload
- Delete kategori → confirm dialog, then removed
- Add/delete variant same pattern

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/master.astro
git commit -m "feat: admin master page with kategori + variant tabs"
```

---

### Task 10: Admin Dashboard + Product List + Product Form

**Files:**
- Create: `src/pages/admin/index.astro`
- Create: `src/pages/admin/produk/index.astro`
- Create: `src/pages/admin/produk/new.astro`
- Create: `src/pages/admin/produk/[id].astro`
- Create: `src/components/admin/ImageUploader.astro`

**Interfaces:**
- Consumes: `getAllProducts`, `getCategories`, `getVariants`, `getProductById`, all API routes from Task 8
- Produces: Full admin CRUD for products including image upload

- [ ] **Step 1: Write `src/pages/admin/index.astro`**

```astro
---
export const prerender = false;
import AdminLayout from '../../layouts/AdminLayout.astro';
import { getAllProducts, getCategories, getVariants } from '../../lib/db';

const db = Astro.locals.runtime.env.DB;
const [products, categories, variants] = await Promise.all([
  getAllProducts(db),
  getCategories(db),
  getVariants(db),
]);
const active = products.filter(p => p.is_active === 1).length;
---

<AdminLayout title="Dashboard">
  <h1 class="text-2xl font-bold mb-6">Dashboard</h1>
  <div class="grid grid-cols-3 gap-4 mb-6">
    <div class="bg-white rounded-xl p-4 shadow-sm text-center">
      <p class="text-3xl font-bold text-brand-700">{active}</p>
      <p class="text-xs text-stone-500 mt-1">Produk Aktif</p>
    </div>
    <div class="bg-white rounded-xl p-4 shadow-sm text-center">
      <p class="text-3xl font-bold text-stone-700">{categories.length}</p>
      <p class="text-xs text-stone-500 mt-1">Kategori</p>
    </div>
    <div class="bg-white rounded-xl p-4 shadow-sm text-center">
      <p class="text-3xl font-bold text-stone-700">{variants.length}</p>
      <p class="text-xs text-stone-500 mt-1">Variant</p>
    </div>
  </div>
  <div class="flex gap-3">
    <a href="/admin/produk/new" class="bg-brand-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-brand-700">
      + Tambah Produk
    </a>
    <a href="/admin/master" class="border border-stone-200 text-stone-600 text-sm font-medium py-2 px-4 rounded-lg hover:bg-stone-50">
      Kelola Kategori & Variant
    </a>
  </div>
</AdminLayout>
```

- [ ] **Step 2: Write `src/pages/admin/produk/index.astro`**

```astro
---
export const prerender = false;
import AdminLayout from '../../../layouts/AdminLayout.astro';
import { getAllProducts } from '../../../lib/db';
import { formatRupiah } from '../../../lib/wa';

const db = Astro.locals.runtime.env.DB;
const products = await getAllProducts(db);
---

<AdminLayout title="Produk">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold">Produk</h1>
    <a href="/admin/produk/new" class="bg-brand-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-brand-700">
      + Tambah
    </a>
  </div>

  <div class="space-y-2">
    {products.map(p => (
      <div class="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
        <div class="w-14 h-14 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
          {p.image_url ? (
            <img src={p.image_url} alt={p.displayName} class="w-full h-full object-cover" />
          ) : (
            <div class="w-full h-full flex items-center justify-center text-stone-300 text-xl">🫘</div>
          )}
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-medium text-stone-900 text-sm truncate">{p.displayName}</p>
          <p class="text-xs text-stone-500">{formatRupiah(p.price)}</p>
          <span class={`inline-block text-xs px-2 py-0.5 rounded-full mt-0.5 ${p.is_active === 1 ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
            {p.is_active === 1 ? 'Aktif' : 'Habis'}
          </span>
        </div>
        <div class="flex gap-1.5 flex-shrink-0">
          <button
            type="button"
            class="text-xs px-2.5 py-1.5 border border-stone-200 rounded-lg hover:bg-stone-50 toggle-btn"
            data-id={p.id}
            data-active={p.is_active}
          >
            {p.is_active === 1 ? 'Habiskan' : 'Aktifkan'}
          </button>
          <a href={`/admin/produk/${p.id}`} class="text-xs px-2.5 py-1.5 bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100">
            Edit
          </a>
          <button
            type="button"
            class="text-xs px-2.5 py-1.5 text-red-600 border border-red-100 rounded-lg hover:bg-red-50 delete-btn"
            data-id={p.id}
            data-name={p.displayName}
          >
            ✕
          </button>
        </div>
      </div>
    ))}
  </div>
</AdminLayout>

<script>
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const el = btn as HTMLButtonElement;
      const newActive = Number(el.dataset.active) === 1 ? 0 : 1;
      await fetch('/admin/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: el.dataset.id, is_active: newActive }),
      });
      window.location.reload();
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const el = btn as HTMLButtonElement;
      if (!confirm(`Hapus "${el.dataset.name}"?`)) return;
      await fetch('/admin/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: el.dataset.id }),
      });
      window.location.reload();
    });
  });
</script>
```

- [ ] **Step 3: Write `src/components/admin/ImageUploader.astro`**

```astro
---
interface Props {
  productId: string;
  currentImageUrl: string | null;
}
const { productId, currentImageUrl } = Astro.props;
---

<div class="space-y-3">
  <p class="text-sm font-medium text-stone-700">Foto Produk</p>

  {currentImageUrl && (
    <div class="relative w-32 h-32 rounded-xl overflow-hidden bg-stone-100 group">
      <img src={currentImageUrl} alt="Foto produk" class="w-full h-full object-cover" />
      <button
        type="button"
        id="delete-image-btn"
        data-product-id={productId}
        data-image-url={currentImageUrl}
        class="absolute top-1 right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
      >
        ✕
      </button>
    </div>
  )}

  <div>
    <input
      type="file"
      id="image-input"
      accept="image/jpeg,image/png,image/webp"
      data-product-id={productId}
      class="text-sm text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
    />
    <p id="upload-status" class="text-xs text-stone-400 mt-1"></p>
  </div>
</div>

<script>
  const input = document.getElementById('image-input') as HTMLInputElement;
  const statusEl = document.getElementById('upload-status')!;

  input?.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const productId = input.dataset.productId!;
    statusEl.textContent = 'Mengupload...';

    const params = new URLSearchParams({
      filename: file.name, contentType: file.type, productId,
    });
    const res = await fetch(`/admin/api/images?${params}`);
    if (!res.ok) { statusEl.textContent = 'Gagal mendapatkan URL upload'; return; }

    const { presignedUrl, publicUrl } = await res.json() as { presignedUrl: string; publicUrl: string };

    const uploadRes = await fetch(presignedUrl, {
      method: 'PUT', body: file, headers: { 'Content-Type': file.type },
    });
    if (!uploadRes.ok) { statusEl.textContent = 'Upload gagal'; return; }

    const saveRes = await fetch('/admin/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, imageUrl: publicUrl }),
    });

    if (saveRes.ok) {
      statusEl.textContent = 'Upload berhasil!';
      window.location.reload();
    } else {
      statusEl.textContent = 'Gagal menyimpan foto';
    }
  });

  document.getElementById('delete-image-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    if (!confirm('Hapus foto ini?')) return;

    await fetch('/admin/api/images', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: btn.dataset.productId, imageUrl: btn.dataset.imageUrl }),
    });
    window.location.reload();
  });
</script>
```

- [ ] **Step 4: Write `src/pages/admin/produk/new.astro`**

```astro
---
export const prerender = false;
import AdminLayout from '../../../layouts/AdminLayout.astro';
import { getCategories, getVariants } from '../../../lib/db';

const db = Astro.locals.runtime.env.DB;
const [categories, variants] = await Promise.all([getCategories(db), getVariants(db)]);

let error = '';
if (Astro.request.method === 'POST') {
  const form = await Astro.request.formData();
  const res = await fetch(new URL('/admin/api/products', Astro.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category_id: form.get('category_id'),
      variant_id: form.get('variant_id'),
      price: Number(form.get('price')),
      original_price: form.get('original_price') ? Number(form.get('original_price')) : null,
      sort_order: Number(form.get('sort_order') ?? 0),
    }),
  });

  if (res.ok) {
    const { id } = await res.json() as { id: string };
    return Astro.redirect(`/admin/produk/${id}`);
  } else {
    const { error: e } = await res.json() as { error: string };
    error = e;
  }
}
---

<AdminLayout title="Tambah Produk">
  <div class="flex items-center gap-3 mb-6">
    <a href="/admin/produk" class="text-stone-500 hover:text-stone-700 text-sm">← Kembali</a>
    <h1 class="text-2xl font-bold">Tambah Produk</h1>
  </div>

  {error && <div class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

  {categories.length === 0 || variants.length === 0 ? (
    <div class="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm">
      Tambah <a href="/admin/master" class="underline">kategori dan variant</a> dulu sebelum membuat produk.
    </div>
  ) : (
    <form method="POST" class="bg-white rounded-xl p-6 shadow-sm space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1">Kategori *</label>
          <select name="category_id" required class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400">
            {categories.map(c => <option value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1">Variant *</label>
          <select name="variant_id" required class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400">
            {variants.map(v => <option value={v.id}>{v.label}</option>)}
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1">Harga Jual (Rp) *</label>
          <input type="number" name="price" required min="1"
            class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
            placeholder="25000" />
        </div>
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1">Harga Coret (Rp)</label>
          <input type="number" name="original_price" min="1"
            class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
            placeholder="30000 (opsional)" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-stone-700 mb-1">Urutan Tampil</label>
        <input type="number" name="sort_order" value="0"
          class="w-32 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
      </div>
      <button type="submit" class="bg-brand-600 text-white font-medium py-2 px-6 rounded-lg hover:bg-brand-700">
        Simpan & Upload Foto
      </button>
    </form>
  )}
</AdminLayout>
```

- [ ] **Step 5: Write `src/pages/admin/produk/[id].astro`**

```astro
---
export const prerender = false;
import AdminLayout from '../../../layouts/AdminLayout.astro';
import ImageUploader from '../../../components/admin/ImageUploader.astro';
import { getProductById, getCategories, getVariants } from '../../../lib/db';
import { formatRupiah } from '../../../lib/wa';

const { id } = Astro.params;
const db = Astro.locals.runtime.env.DB;

const [product, categories, variants] = await Promise.all([
  getProductById(db, id),
  getCategories(db),
  getVariants(db),
]);

if (!product) return Astro.redirect('/admin/produk');

let saved = false;
let error = '';

if (Astro.request.method === 'POST') {
  const form = await Astro.request.formData();
  const res = await fetch(new URL('/admin/api/products', Astro.url), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      category_id: form.get('category_id'),
      variant_id: form.get('variant_id'),
      price: Number(form.get('price')),
      original_price: form.get('original_price') ? Number(form.get('original_price')) : null,
      sort_order: Number(form.get('sort_order') ?? 0),
    }),
  });

  if (res.ok) saved = true;
  else { const { error: e } = await res.json() as { error: string }; error = e; }
}
---

<AdminLayout title={`Edit: ${product.displayName}`}>
  <div class="flex items-center gap-3 mb-6">
    <a href="/admin/produk" class="text-stone-500 hover:text-stone-700 text-sm">← Kembali</a>
    <h1 class="text-xl font-bold">{product.displayName}</h1>
  </div>

  {saved && <div class="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">Tersimpan!</div>}
  {error && <div class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

  <div class="space-y-4">
    <!-- Edit form -->
    <form method="POST" class="bg-white rounded-xl p-5 shadow-sm space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1">Kategori</label>
          <select name="category_id" class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400">
            {categories.map(c => <option value={c.id} selected={c.id === product.category_id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1">Variant</label>
          <select name="variant_id" class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400">
            {variants.map(v => <option value={v.id} selected={v.id === product.variant_id}>{v.label}</option>)}
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1">Harga Jual (Rp)</label>
          <input type="number" name="price" value={product.price}
            class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
        </div>
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1">Harga Coret (Rp)</label>
          <input type="number" name="original_price" value={product.original_price ?? ''}
            class="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
            placeholder="Kosongkan jika tidak ada" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-stone-700 mb-1">Urutan Tampil</label>
        <input type="number" name="sort_order" value={product.sort_order}
          class="w-32 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
      </div>
      <button type="submit" class="bg-brand-600 text-white font-medium py-2 px-5 rounded-lg hover:bg-brand-700 text-sm">
        Simpan
      </button>
    </form>

    <!-- Image upload -->
    <div class="bg-white rounded-xl p-5 shadow-sm">
      <ImageUploader productId={product.id} currentImageUrl={product.image_url} />
    </div>
  </div>
</AdminLayout>
```

- [ ] **Step 6: Full admin smoke test**

```bash
npx astro dev
```

1. `http://localhost:4321/admin/master` → add kategori "Peyek Teri" → appears in list
2. Add variant "Premium Pack" → appears in variant list
3. `http://localhost:4321/admin/produk/new` → select kategori + variant, set price → submit
4. Redirect to edit page → upload image file → thumbnail appears
5. `http://localhost:4321/admin/produk` → new product visible, toggle "Habiskan" → badge changes
6. Public `http://localhost:4321` → new product visible in grid
7. Category tab filter works

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/ src/components/admin/
git commit -m "feat: admin dashboard, product list, master data, product form with image upload"
```

---

### Task 11: Deploy + Cloudflare Access + Search Console

No new code. Configuration steps.

- [ ] **Step 1: Build and local preview**

```bash
npx astro build
npx wrangler pages dev dist --d1=DB
```

Open `http://localhost:8788` — verify public and admin pages work.

- [ ] **Step 2: Create Cloudflare Pages project**

Dashboard → Pages → Create project → Connect Git → select repo.
- Build command: `npm run build`
- Build output: `dist`

- [ ] **Step 3: Set environment variables in Cloudflare Pages**

Settings → Environment Variables → Production:

| Var | Value |
|---|---|
| `MINIO_ENDPOINT` | `https://minio.yourserver.com` |
| `MINIO_BUCKET` | `nejemeyek` |
| `MINIO_ACCESS_KEY` | your key |
| `MINIO_SECRET_KEY` | your key (Secret) |
| `WA_NUMBER` | `628xxxxxxxxx` |
| `CF_PAGES_WEBHOOK` | (set in Step 5) |

- [ ] **Step 4: Apply D1 migration to production**

```bash
npx wrangler d1 execute nejemeyek-db --file=src/migrations/001_initial.sql
```

- [ ] **Step 5: Create Pages deploy hook**

Settings → Builds & deployments → Deploy hooks → Create hook "admin-trigger". Copy URL → paste as `CF_PAGES_WEBHOOK` env var → Save → Trigger a new deployment.

- [ ] **Step 6: Setup Cloudflare Access for `/admin/*`**

Zero Trust → Access → Applications → Add application:
- Type: Self-hosted
- Domain: `yourdomain.com`, path: `/admin`
- Policy: Email — enter your email address
- Session: 24 hours

Test: open `https://yourdomain.com/admin` → Cloudflare Access login prompt appears.

- [ ] **Step 7: Add custom domain**

Pages → Custom domains → enter domain → follow DNS instructions.

- [ ] **Step 8: Submit sitemap to Google Search Console**

1. Search Console → Add property → URL prefix → `https://yourdomain.com`
2. Verify ownership: add `<meta name="google-site-verification" content="...">` to `BaseLayout.astro` head
3. Sitemaps → Submit → `https://yourdomain.com/sitemap.xml`

- [ ] **Step 9: Production smoke test**

- [ ] `/` loads with category tabs and product grid on mobile
- [ ] Category tab filters work
- [ ] "Pesan" button opens WA with correct pre-filled message
- [ ] `/produk/[id]` loads with correct price and WA button
- [ ] `/sitemap.xml` lists all product URLs
- [ ] `/robots.txt` has `Disallow: /admin/`
- [ ] `/admin` shows Cloudflare Access login
- [ ] After login: create product → rebuild triggers → appears on public site in ~30s
- [ ] View source on `/` → `LocalBusiness` JSON-LD present

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "chore: production ready"
```

---

## Self-Review — Spec Coverage

| Spec requirement | Task |
|---|---|
| Landing page — mobile-first, 2-col grid | Task 5 |
| Category filter tabs | Task 5 |
| Product card — name, variant, price, coret, Habis badge | Task 5 |
| WA order with pre-filled message | Tasks 3, 5, 6 |
| Product detail page | Task 6 |
| Product schema.org | Task 6 |
| LocalBusiness schema.org | Task 4 |
| SEO title + meta description per page | Tasks 5, 6 |
| Sitemap XML | Task 7 |
| robots.txt blocking /admin | Task 7 |
| Open Graph tags | Task 4 |
| D1 schema: categories, product_variants, products | Task 2 |
| Single image per product (image_url in products) | Tasks 2, 8, 10 |
| original_price (harga coret) | Tasks 2, 5, 10 |
| Admin — CRUD products | Tasks 8, 10 |
| Admin — kategori + variant tabs (single page) | Task 9 |
| Admin — image upload via MinIO presigned URL | Tasks 3, 8, 10 |
| Cloudflare Access auth | Task 11 |
| Rebuild trigger on every write | Task 8 (revalidate.ts) |
| MinIO CORS setup | Task 3 |
| Google Search Console | Task 11 |
