# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # local dev (wrangler platform proxy active)
npm run build      # production build → dist/
```

Deploy to Cloudflare Pages:
```bash
npx wrangler pages deploy dist
```

Apply DB migration to local D1:
```bash
npx wrangler d1 execute nejemeyek-db --local --file src/migrations/001_initial.sql
```

Apply to remote D1:
```bash
npx wrangler d1 execute nejemeyek-db --remote --file src/migrations/001_initial.sql
```

## Architecture

**Stack**: Astro 4 (hybrid SSR) → Cloudflare Pages + D1 (SQLite) + MinIO (S3-compatible image storage). No auth framework — admin is unprotected.

**Runtime env access**: All Cloudflare bindings (`DB`, `MINIO_*`, `WA_NUMBER`, `CF_PAGES_WEBHOOK`) come from `locals.runtime.env` in API routes and `Astro.locals.runtime.env` in `.astro` pages. Never import env directly.

**All DB queries** live in `src/lib/db.ts`. Every function takes `D1Database` as first arg — no global connection object. `attachDetails()` is an internal helper that joins products → categories + variants in a single `db.batch()` call. `ProductWithDetails.displayName` = `"${category.name} ${variant.label}"`.

**Image flow**: Admin calls `GET /admin/api/images?filename&contentType&productId` → gets presigned MinIO URL + final public URL → browser uploads directly to MinIO → then `POST /admin/api/images` saves the public URL to the product row.

**Cache invalidation**: After every write, API routes fire-and-forget `POST /admin/api/revalidate`, which pings `CF_PAGES_WEBHOOK` to trigger a Cloudflare Pages rebuild.

**WA order flow**: No cart, no payments. `buildWaOrderUrl()` in `src/lib/wa.ts` builds a `wa.me` deep-link with pre-filled order message. `WA_NUMBER` env var must be set without `+` prefix.

**Data model**:
- `categories` (id TEXT, name, sort_order)
- `product_variants` (id TEXT, label, sort_order) — e.g. "250g", "500g"
- `products` (id TEXT, category_id → categories, variant_id → product_variants, price INTEGER IDR, original_price nullable, image_url nullable, is_active, sort_order)

**Routing**:
- `/` — public storefront (SSR, `prerender=false`)
- `/produk/[id]` — product detail page
- `/admin/` — dashboard, product list, product form
- `/admin/api/products|categories|variants|images|revalidate` — JSON API endpoints

**Type safety**: `src/env.d.ts` declares the `Env` interface and `App.Locals`. `src/types.ts` has `Category`, `ProductVariant`, `Product`, `ProductWithDetails`.

**Env vars required** (set in `.env` locally, Cloudflare Pages dashboard for prod):
```
DB=                  # bound automatically via wrangler.toml
MINIO_ENDPOINT=      # e.g. https://minio.example.com
MINIO_BUCKET=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
WA_NUMBER=           # e.g. 628123456789 (no +)
CF_PAGES_WEBHOOK=    # Cloudflare Pages deploy hook URL
```
