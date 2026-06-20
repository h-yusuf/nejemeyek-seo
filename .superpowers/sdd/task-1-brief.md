### Task 1: Project Scaffold + Config

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tailwind.config.mjs`, `wrangler.toml`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `.gitignore`, `src/env.d.ts`

**Interfaces:**
- Produces: Runnable `astro dev` with Cloudflare D1 bindings via `platformProxy`

- [ ] **Step 1: Init git and Astro project**

```bash
git init
npm create astro@latest . -- --template minimal --no-install --no-git
```

When prompted: TypeScript → Yes, strict.

- [ ] **Step 2: Install dependencies**

```bash
npm install @astrojs/cloudflare @astrojs/tailwind tailwindcss
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install -D vitest @cloudflare/workers-types
```

- [ ] **Step 3: Write `astro.config.mjs`**

```javascript
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://nejemeyekjogja.com',
  output: 'hybrid',
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  integrations: [tailwind()],
});
```

- [ ] **Step 4: Write `tailwind.config.mjs`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fef9ee',
          100: '#fdf0d5',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          900: '#78350f',
        },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 5: Write `wrangler.toml`**

```toml
name = "nejemeyek"
compatibility_date = "2024-09-23"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "nejemeyek-db"
database_id = "REPLACE_AFTER_D1_CREATE"
```

- [ ] **Step 6: Write `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 7: Write `src/env.d.ts`**

```typescript
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

interface Env {
  DB: D1Database;
  MINIO_ENDPOINT: string;
  MINIO_BUCKET: string;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  WA_NUMBER: string;
  CF_PAGES_WEBHOOK: string;
}

declare namespace App {
  interface Locals extends Runtime {}
}
```

- [ ] **Step 8: Write `.env.example`**

```
MINIO_ENDPOINT=https://minio.yourserver.com
MINIO_BUCKET=nejemeyek
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
WA_NUMBER=6281234567890
CF_PAGES_WEBHOOK=https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/YOUR_HOOK_ID
```

- [ ] **Step 9: Write `.gitignore`**

```
node_modules/
dist/
.wrangler/
.env
.env.local
*.local
```

- [ ] **Step 10: Verify dev server starts**

```bash
npx astro dev
```

Expected: Server at `http://localhost:4321`

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "feat: scaffold Astro + Cloudflare + Tailwind project"
```

---

