# Task 3 Report

**Status:** DONE
**Commit:** `858ad40`
**Test results:** PASS (5) FAIL (0)

## Files created
- `src/lib/wa.ts` — buildWaOrderUrl, formatRupiah, slugify
- `src/lib/wa.test.ts` — 5 tests, all green
- `src/lib/storage.ts` — getPresignedUploadUrl, getPublicUrl, deleteObject, keyFromUrl
- `docs/minio-cors-setup.md` — mc commands for VPS CORS setup

## Notes
- `formatRupiah` uses `toLocaleString('id-ID')` instead of `Intl.NumberFormat` with currency style, to guarantee the exact `"Rp 25.000"` format (no non-breaking space, no symbol variation between Node versions).
- `storage.ts` has `forcePathStyle: true` as required for MinIO.
- No tests for storage.ts — requires live MinIO per task spec.
