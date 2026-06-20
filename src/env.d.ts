/// <reference path="../.astro/types.d.ts" />
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
  ADMIN_PASSWORD: string;
}

declare namespace App {
  interface Locals extends Runtime {}
}
