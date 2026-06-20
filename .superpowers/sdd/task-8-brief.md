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

