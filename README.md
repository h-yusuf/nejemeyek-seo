# Nejemeyek

Storefront online untuk Nejemeyek — produsen peyek khas Jogja. Dibangun di atas Astro 4 (hybrid SSR), di-host di Cloudflare Pages dengan database D1 (SQLite) dan penyimpanan gambar MinIO (S3-compatible).

---

## Stack

| Layer | Teknologi |
|---|---|
| Framework | Astro 4 (hybrid SSR, `output: hybrid`) |
| Hosting | Cloudflare Pages |
| Database | Cloudflare D1 (SQLite) |
| Image storage | MinIO (S3-compatible, self-hosted) |
| Styling | Tailwind CSS |
| Order flow | WhatsApp deep-link (`wa.me`) |

---

## Struktur Proyek

```
src/
├── components/
│   ├── admin/
│   │   └── ImageUploader.astro   # Upload gambar ke MinIO via presigned URL
│   ├── CategoryTabs.astro        # Tab filter kategori produk
│   └── ProductCard.astro         # Card produk di storefront
├── layouts/
│   ├── BaseLayout.astro          # Layout publik (SEO, OG, schema LD+JSON)
│   └── AdminLayout.astro         # Layout admin (noindex)
├── lib/
│   ├── db.ts                     # Semua query D1 — fungsi ambil param DB eksplisit
│   └── wa.ts                     # buildWaOrderUrl(), formatRupiah()
├── migrations/
│   └── 001_initial.sql           # Skema database awal
├── pages/
│   ├── index.astro               # Storefront utama (SSR)
│   ├── produk/[id].astro         # Detail produk (SSR)
│   ├── sitemap.xml.ts            # Sitemap dinamis — query produk aktif dari D1
│   ├── robots.txt.ts             # robots.txt — Allow: /, Disallow: /admin/
│   ├── api/
│   │   └── track.ts              # Page view tracking (sendBeacon)
│   └── admin/
│       ├── index.astro           # Dashboard statistik
│       ├── login.astro           # Login admin (password sederhana)
│       ├── master.astro          # Kelola kategori & varian
│       ├── produk/               # CRUD produk
│       └── api/                  # REST API admin (products, categories, variants, images, revalidate, logout)
├── types.ts                      # Category, ProductVariant, Product, ProductWithDetails
└── env.d.ts                      # Deklarasi Env interface dan App.Locals
public/
├── favicon.png                   # Logo NEJE (juga dipakai sebagai OG image default)
└── favicon.ico
```

---

## Data Model

```sql
categories       (id TEXT, name TEXT, sort_order INTEGER)
product_variants (id TEXT, label TEXT, sort_order INTEGER)  -- e.g. "250g", "500g"
products         (id TEXT, category_id, variant_id, price INTEGER,
                  original_price INTEGER?, image_url TEXT?,
                  is_active INTEGER, sort_order INTEGER, description TEXT?)
```

`ProductWithDetails.displayName` = `"${category.name} ${variant.label}"`

---

## Environment Variables

Set di `.env` untuk lokal, di Cloudflare Pages dashboard untuk produksi.

```env
# Otomatis di-bind via wrangler.toml
DB=

# MinIO / S3-compatible storage
MINIO_ENDPOINT=https://minio.example.com
MINIO_BUCKET=nejemeyek
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=

# WhatsApp — tanpa tanda +
WA_NUMBER=628123456789

# Cloudflare Pages deploy hook (untuk cache revalidation)
CF_PAGES_WEBHOOK=https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...

# Password admin
ADMIN_PASSWORD=
```

---

## Setup Lokal

### 1. Install dependensi

```bash
npm install
```

### 2. Buat database D1 lokal

```bash
npx wrangler d1 execute nejemeyek-db --local --file src/migrations/001_initial.sql
```

### 3. Jalankan dev server

```bash
npm run dev
```

Dev server berjalan di `http://localhost:4321` dengan Wrangler platform proxy aktif (binding D1, env vars terbaca dari `.env`).

---

## Deployment ke Cloudflare Pages

### 1. Build

```bash
npm run build
```

Output ke `dist/`.

### 2. Deploy

```bash
./node_modules/.bin/wrangler pages deploy dist
```

Atau kalau wrangler sudah terinstall global:

```bash
wrangler pages deploy dist
```

### 3. Migrasi database remote (pertama kali atau setelah perubahan skema)

```bash
npx wrangler d1 execute nejemeyek-db --remote --file src/migrations/001_initial.sql
```

### 4. Set environment variables di Cloudflare

Cloudflare Pages Dashboard → project `nejemeyek` → **Settings → Environment variables** → tambahkan semua variabel dari bagian [Environment Variables](#environment-variables) di atas.

---

## Alur Gambar Produk

1. Admin request `GET /admin/api/images?filename=&contentType=&productId=`
2. Server return presigned MinIO URL + URL publik final
3. Browser upload langsung ke MinIO via presigned URL (tidak lewat server)
4. Admin `POST /admin/api/images` → simpan URL publik ke kolom `image_url` produk

---

## Cache Revalidation

Setiap write (create/update/delete produk, kategori, varian) memicu fire-and-forget `POST /admin/api/revalidate`, yang ping `CF_PAGES_WEBHOOK` untuk trigger rebuild Cloudflare Pages.

---

## SEO

### Yang sudah dikonfigurasi

| Item | Lokasi | Keterangan |
|---|---|---|
| `<title>` & `<meta description>` | `BaseLayout.astro` | Per halaman |
| Canonical URL | `BaseLayout.astro` | `Astro.url.href` |
| OG tags (WA, Instagram) | `BaseLayout.astro` | `og:image` pakai absolute URL `https://nejemeyek.my.id/favicon.png` sebagai default |
| Twitter card | `BaseLayout.astro` | `summary` (gambar square) |
| Schema `FoodEstablishment` | `BaseLayout.astro` prop `localBusiness={true}` | Area served, keywords, servesCuisine |
| Schema `Product` | `produk/[id].astro` | Harga, ketersediaan, brand |
| `sitemap.xml` | `src/pages/sitemap.xml.ts` | Dinamis — homepage + semua produk aktif |
| `robots.txt` | `src/pages/robots.txt.ts` | `Allow: /`, `Disallow: /admin/`, pointer ke sitemap |
| `noindex` admin | `AdminLayout.astro` | Semua halaman `/admin/*` tidak diindex |

### Submit ke Google Search Console

1. Buka [Google Search Console](https://search.google.com/search-console)
2. Tambah property → **URL prefix** → `https://nejemeyek.my.id`
3. Verifikasi via DNS TXT record di Cloudflare
4. Setelah terverifikasi → **Sitemaps** → submit `https://nejemeyek.my.id/sitemap.xml`
5. Di halaman **URL Inspection** → paste `https://nejemeyek.my.id/` → **Request Indexing**

### Debug OG image (WA / Instagram)

Gunakan [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) untuk force-refresh cache OG image setelah deploy.

### Target keywords

Peyek Jogja · Peyek Rebon · Peyek Rebon Jogja · Peyek Kacang · Peyek untuk pecel Madiun · Supplier Peyek · Supplier Peyek Jogja · Produsen peyek Jogja · Peyek toples · Peyek tipis · Pusat Produksi Peyek · Peyek khas Jogja · Oleh-oleh kekinian Jogja · Oleh-oleh khas Jogja · Cemilan Jogja

---

## Commands

```bash
npm run dev     # Dev server lokal
npm run build   # Build produksi → dist/
```
