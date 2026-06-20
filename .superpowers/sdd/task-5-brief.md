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

