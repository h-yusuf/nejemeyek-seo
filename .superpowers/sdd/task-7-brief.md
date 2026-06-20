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

