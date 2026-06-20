# Task 5 Report: Mobile-First Landing Page

**Status:** COMPLETE  
**Commit:** `9d93779`  
**Branch:** main

## Files Created

- `src/components/CategoryTabs.astro` — Sticky horizontal pill tabs with client-side JS filter
- `src/components/ProductCard.astro` — 2-col grid card with Habis overlay, strikethrough price, WA button
- `src/pages/index.astro` — Main landing page composing all components

## Deviation from Brief

The brief's Step 3 template uses `getActiveProducts(db)` but the verification requirement explicitly says "Habis badge on prod-2 (is_active=0)". Since `getActiveProducts` only returns `is_active = 1` rows, prod-2 would be invisible. The index page was implemented using `getAllProducts(db)` so all products appear, with inactive ones receiving the Habis overlay — this matches the stated UX intent and verification criteria.

## Browser Verification (localhost:4321)

- **Page title:** "Nejemeyek — Peyek Khas Jogja | Peyek Rebon, Kacang, Teri Jogja" — SEO keywords present
- **H1:** "Nejemeyek" with "Peyek Khas Jogja" label above — satisfies SEO h1 requirement
- **Category tabs:** "Semua", "Peyek Rebon", "Peyek Kacang Tanah" all rendered correctly
- **2-column grid:** All 3 seeded products visible
- **prod-1 (Peyek Rebon 250g):** Strikethrough Rp 30.000, price Rp 25.000, active "+ Pesan" WA link — PASS
- **prod-2 (Peyek Rebon 500g, is_active=0):** "Habis" overlay badge visible, disabled "+ Pesan" div — PASS
- **prod-3 (Peyek Kacang Tanah 250g):** Rp 25.000, active "+ Pesan" WA link — PASS
- **Tab filter:** Clicking "Peyek Rebon" hid prod-3 immediately without page reload — PASS
- **Clicking "Semua":** All 3 cards restored — PASS
- **JS console errors:** 0 errors — PASS
- **localBusiness schema:** JSON-LD injected in head via BaseLayout — PASS

## Known Concern

`WA_NUMBER` is `undefined` in local dev because no `[vars]` block exists in `wrangler.toml` and there is no `.dev.vars` file. WA links render as `https://wa.me/undefined?text=...`. This is a pre-existing environment configuration gap from prior tasks, not introduced by this task. In production/staging with WA_NUMBER bound, the links will work correctly. To fix locally: create `.dev.vars` with `WA_NUMBER=628xxxxxxxxx`.
