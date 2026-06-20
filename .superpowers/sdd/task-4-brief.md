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

