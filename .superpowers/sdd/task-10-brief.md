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

