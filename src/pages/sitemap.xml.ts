import type { APIRoute } from 'astro';
import { getActiveProducts } from '../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ locals, site }) => {
  const db = locals.runtime.env.DB;
  const products = await getActiveProducts(db);
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
