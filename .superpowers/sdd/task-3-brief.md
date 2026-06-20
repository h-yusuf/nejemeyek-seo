### Task 3: Storage + WA Utilities

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/lib/wa.ts`
- Create: `src/lib/wa.test.ts`

**Interfaces:**
- Produces:
  - `getPresignedUploadUrl(config, key, contentType)` → `Promise<string>`
  - `getPublicUrl(config, key)` → `string`
  - `deleteObject(config, key)` → `Promise<void>`
  - `keyFromUrl(url, endpoint, bucket)` → `string`
  - `buildWaOrderUrl(params)` → `string`
  - `formatRupiah(price)` → `string` (e.g. "Rp 25.000")
  - `slugify(text)` → `string` (e.g. "Peyek Rebon" → "peyek-rebon")

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/wa.test.ts
import { describe, it, expect } from 'vitest';
import { buildWaOrderUrl, formatRupiah, slugify } from './wa';

describe('buildWaOrderUrl', () => {
  it('builds WA URL with pre-filled message', () => {
    const url = buildWaOrderUrl({
      displayName: 'Peyek Rebon 250gr',
      qty: 2,
      waNumber: '6281234567890',
    });
    expect(url).toContain('https://wa.me/6281234567890');
    expect(url).toContain(encodeURIComponent('Peyek Rebon 250gr'));
    expect(url).toContain(encodeURIComponent('x2'));
  });
});

describe('formatRupiah', () => {
  it('formats to Indonesian Rupiah', () => {
    expect(formatRupiah(25000)).toBe('Rp 25.000');
  });
});

describe('slugify', () => {
  it('converts to URL-safe slug', () => {
    expect(slugify('Peyek Rebon')).toBe('peyek-rebon');
  });
  it('strips special characters', () => {
    expect(slugify('Peyek & Teri!')).toBe('peyek-teri');
  });
  it('collapses hyphens', () => {
    expect(slugify('peyek--kacang')).toBe('peyek-kacang');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/wa.test.ts
```

Expected: FAIL — `Cannot find module './wa'`

- [ ] **Step 3: Write `src/lib/wa.ts`**

```typescript
export interface WaOrderParams {
  displayName: string;
  qty: number;
  waNumber: string;
}

export function buildWaOrderUrl(params: WaOrderParams): string {
  const message = `Halo, saya mau pesan:\n- ${params.displayName} x${params.qty}\nApakah stok tersedia?`;
  return `https://wa.me/${params.waNumber}?text=${encodeURIComponent(message)}`;
}

export function formatRupiah(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/wa.test.ts
```

Expected: PASS

- [ ] **Step 5: Write `src/lib/storage.ts`**

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageConfig {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
}

function createClient(config: StorageConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
  });
}

export async function getPresignedUploadUrl(
  config: StorageConfig,
  key: string,
  contentType: string,
): Promise<string> {
  const client = createClient(config);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

export function getPublicUrl(config: StorageConfig, key: string): string {
  return `${config.endpoint}/${config.bucket}/${key}`;
}

export async function deleteObject(config: StorageConfig, key: string): Promise<void> {
  const client = createClient(config);
  await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}

export function keyFromUrl(url: string, endpoint: string, bucket: string): string {
  return url.replace(`${endpoint}/${bucket}/`, '');
}
```

- [ ] **Step 6: Configure MinIO CORS (on VPS)**

```bash
mc alias set myminio https://minio.yourserver.com ACCESSKEY SECRETKEY
mc anonymous set download myminio/nejemeyek
```

Create `cors.json`:
```json
[{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["GET", "PUT"],
  "AllowedOrigins": ["https://nejemeyekjogja.com", "http://localhost:4321"],
  "ExposeHeaders": ["ETag"]
}]
```
```bash
mc cors set myminio/nejemeyek cors.json
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/
git commit -m "feat: storage + WA utilities with tests"
```

---

