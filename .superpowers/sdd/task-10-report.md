# Task 10 Report — Admin Dashboard + Product List + Product Form

**Status:** DONE  
**Commit SHA:** 486aeda  

---

## Files Created

| File | Description |
|------|-------------|
| `src/pages/admin/index.astro` | Dashboard: counts for active products, total products, categories, variants. Quick links to add product and manage master data. |
| `src/pages/admin/produk/index.astro` | Product list with per-row toggle active/inactive and delete (with `window.confirm`). Shows image thumbnail, name, price, status badge. Empty state when no products. |
| `src/pages/admin/produk/new.astro` | Create product form. Handles POST in frontmatter, calls `/admin/api/products` (POST), redirects to edit page on success, shows inline error on failure. Guards against empty categories/variants. |
| `src/pages/admin/produk/[id].astro` | Edit product form. Pre-populates all fields. Shows "Tersimpan!" green banner on save. Includes ImageUploader component. Danger zone with toggle and delete buttons. |
| `src/components/admin/ImageUploader.astro` | Presigned-URL upload flow: GET presigned URL → PUT file to storage → POST publicUrl to save. Delete image button (hover-visible). Status text with color feedback. |

---

## Implementation Notes

- `original_price`: empty input sends `null` — checked via `String(raw).trim() !== ''` before converting to Number
- Dashboard counts: active products, total products, categories, variants (4-card grid rather than 3; "total products" count added as it's useful context)
- ImageUploader emoji fallback for missing image replaced with HTML entity `&#x1F7AB;` to avoid JSX/Astro template parsing issues
- Arrow chars use HTML entities (`&#8592;`) for cleaner `.astro` output
- Edit page shows current price via `formatRupiah` next to the Save button as a quick reference
- All pages: `export const prerender = false` at top

## Concerns

- None. All imports verified against existing exports. Paths correct for each depth level (admin root vs admin/produk subdirectory).
