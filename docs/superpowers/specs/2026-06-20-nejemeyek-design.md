# Nejemeyek — Design Spec

**Tanggal:** 2026-06-20  
**Revisi:** 2026-06-20 (v2 — restructured data model, mobile-first layout)  
**Produk:** Nejemeyek Peyek Khas Jogja  
**Status:** Approved

---

## Overview

Website produk untuk Nejemeyek, peyek khas Jogja. Terdiri dari landing page publik yang SEO-optimized dan admin CMS untuk manajemen produk. Target bersaing di Google Search untuk keyword lokal makanan Jogja.

**Target pasar:** Lokal Jogja, pengiriman via GoSend/COD.  
**Order flow:** WhatsApp dengan pre-filled message (produk + qty + cek stok).

---

## Tech Stack

| Komponen | Pilihan |
|---|---|
| Framework | Astro (hybrid mode: SSG + SSR) |
| Styling | Tailwind CSS |
| Deploy | Cloudflare Pages |
| Database | Cloudflare D1 (SQLite) |
| Storage gambar | MinIO (self-hosted VPS, S3-compatible) |
| Auth admin | Cloudflare Access (email OTP / Google) |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Cloudflare Pages (Astro)               │
│                                                     │
│  SSG (build-time)          SSR (runtime)            │
│  ├── /                     ├── /admin               │
│  ├── /produk/[id]          ├── /admin/produk        │
│  └── /sitemap.xml          ├── /admin/produk/new    │
│                            ├── /admin/produk/[id]   │
│                            ├── /admin/master        │
│                            └── /admin/api/*         │
│                                                     │
│  Auth: Cloudflare Access (lindungi /admin/*)        │
└──────────────┬──────────────────────┬───────────────┘
               │                      │
        ┌──────▼──────┐        ┌──────▼──────┐
        │ Cloudflare  │        │  MinIO VPS  │
        │     D1      │        │  (images)   │
        │  (SQLite)   │        │ s3-compat   │
        └─────────────┘        └─────────────┘
```

### SSG Rebuild Flow

Admin save/update/delete → Astro API route trigger Cloudflare Pages deploy hook → site rebuild ~30 detik → perubahan live di public.

---

## Data Model (D1)

```sql
-- Kategori produk (contoh: Peyek Rebon, Peyek Kacang Tanah)
categories
  id          TEXT PRIMARY KEY  -- slug, e.g. "peyek-rebon"
  name        TEXT NOT NULL     -- "Peyek Rebon"
  sort_order  INTEGER DEFAULT 0
  created_at  TEXT NOT NULL

-- Satuan/ukuran yang bisa dipakai di mana saja
product_variants
  id          TEXT PRIMARY KEY
  label       TEXT NOT NULL     -- "250gr", "500gr", "Premium Pack"
  sort_order  INTEGER DEFAULT 0

-- Produk = kombinasi kategori + variant
-- Satu produk = satu SKU dengan foto, harga, dan status sendiri
products
  id            TEXT PRIMARY KEY  -- uuid
  category_id   TEXT NOT NULL REFERENCES categories(id)
  variant_id    TEXT NOT NULL REFERENCES product_variants(id)
  price         INTEGER NOT NULL          -- harga jual (Rupiah)
  original_price INTEGER                  -- harga coret (nullable)
  image_url     TEXT                      -- URL ke MinIO (nullable)
  is_active     INTEGER DEFAULT 1         -- 0 = "Habis"
  sort_order    INTEGER DEFAULT 0
  created_at    TEXT NOT NULL
  updated_at    TEXT NOT NULL
```

**Nama produk** di-generate otomatis: `{category.name} {variant.label}` → "Peyek Rebon 250gr"

**WA order message:**
```
Halo, saya mau pesan:
- Peyek Rebon 250gr x2
Apakah stok tersedia?
```

---

## Halaman Publik (Mobile-First)

### `/` — Landing Page

Layout referensi: mobile-first, 2-column product grid, category filter tabs di atas.

**Struktur:**
1. **Header** — logo + nama brand
2. **Category tabs** — horizontal scrollable pill tabs: "Semua" + tiap kategori
3. **Product grid** — 2 kolom, cards responsive
4. **Info order** — cara pesan (pilih → WA → GoSend/COD)
5. **Footer**

**Product card:**
- Foto (aspect-square, object-cover, bg placeholder jika kosong)
- Badge "Habis" overlay jika `is_active = 0`
- Nama kategori (bold)
- Label variant (muted, small)
- Harga — jika ada `original_price`: tampilkan coret di atas, harga jual di bawah
- Tombol "Pesan via WA" → langsung buka WA dengan pre-filled message

**Category filter:** client-side JS, filter cards tanpa reload halaman.

**Schema.org `LocalBusiness`** JSON-LD di homepage.  
**Keyword SEO** natural di konten: "peyek khas Jogja", "peyek Jogja", "peyek terdekat".

### `/produk/[id]` — Detail Produk

- Foto besar
- Nama produk (kategori + variant)
- Harga (dengan coret jika ada `original_price`)
- Deskripsi kategori
- Tombol "Pesan via WhatsApp"
- Info pengiriman (GoSend/COD Jogja)
- Schema.org `Product` JSON-LD

### `/sitemap.xml`

Auto-generated, include semua produk aktif. Submit ke Google Search Console.

---

## Admin CMS (`/admin/*`)

**Auth:** Cloudflare Access — semua route `/admin/*` diproteksi. Zero kode auth di aplikasi.

| Route | Fungsi |
|---|---|
| `/admin` | Dashboard: jumlah produk aktif, kategori, variant |
| `/admin/produk` | List semua produk (filter by kategori) |
| `/admin/produk/new` | Form tambah produk baru |
| `/admin/produk/[id]` | Edit produk (harga, foto, status) |
| `/admin/master` | Kelola kategori + variant — satu page, dua tabs |

### `/admin/master` — Tabs: Kategori | Variant

**Tab Kategori:**
- List kategori + sort_order
- Form tambah kategori (nama)
- Tombol hapus

**Tab Variant:**
- List variant labels (250gr, 500gr, Premium Pack)
- Form tambah variant
- Tombol hapus

### Upload Foto Flow

1. Admin klik upload di form produk
2. API route request presigned URL dari MinIO
3. Browser upload langsung ke MinIO
4. URL disimpan ke D1

### Rebuild Trigger

Setiap operasi tulis → hit Cloudflare Pages deploy webhook → public site rebuild otomatis.

---

## SEO Strategy

**Target keywords:** peyek jogja, peyek khas jogja, peyek terdekat, beli peyek jogja, peyek kacang jogja

| Taktik | Detail |
|---|---|
| `<title>` & meta description | Unik per halaman, keyword-rich |
| Schema.org `Product` | Di setiap halaman produk |
| Schema.org `LocalBusiness` | Di homepage: nama, alamat, telepon, wilayah Jogja |
| Sitemap XML | Auto-generated, submit ke Google Search Console |
| `robots.txt` | Allow all kecuali `/admin` |
| Open Graph | Preview bagus saat share WA/sosmed |
| Core Web Vitals | SSG + Cloudflare CDN → LCP excellent |
| Domain | Idealnya mengandung "peyek" + "jogja" |

**Requirement:** Butuh alamat fisik toko + nomor telepon untuk `LocalBusiness` schema.

---

## Out of Scope (MVP)

- Manajemen order / tracking pengiriman
- Notifikasi stok
- User roles / multi-admin
- Analytics dashboard
- Blog / artikel konten
- Payment gateway
- Shipping nasional

---

## Deployment Checklist

- [ ] Buat Cloudflare Pages project
- [ ] Buat D1 database, run migrations
- [ ] Setup Cloudflare Access untuk `/admin/*`
- [ ] Setup MinIO bucket + CORS policy untuk presigned URL upload
- [ ] Set env vars: `MINIO_ENDPOINT`, `MINIO_BUCKET`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `CF_PAGES_WEBHOOK`, `WA_NUMBER`
- [ ] Daftarkan domain
- [ ] Submit sitemap ke Google Search Console
