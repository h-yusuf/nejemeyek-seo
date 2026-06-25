import type { APIRoute } from 'astro';
import { AwsClient } from 'aws4fetch';
import { updateProduct } from '../../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const productId = formData.get('productId') as string | null;

    if (!file || !productId) {
      return Response.json({ success: false, error: 'file and productId required' }, { status: 400 });
    }

    const env = locals.runtime.env;
    const key = `products/${productId}/${crypto.randomUUID()}-${file.name}`;
    const url = `${env.MINIO_ENDPOINT}/${env.MINIO_BUCKET}/${key}`;

    const aws = new AwsClient({
      accessKeyId: env.MINIO_ACCESS_KEY,
      secretAccessKey: env.MINIO_SECRET_KEY,
      region: 'us-east-1',
      service: 's3',
    });

    const uploadRes = await aws.fetch(url, {
      method: 'PUT',
      body: await file.arrayBuffer(),
      headers: { 'Content-Type': file.type },
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      throw new Error(`MinIO ${uploadRes.status}: ${text}`);
    }

    const publicUrl = `${env.MINIO_ENDPOINT}/${env.MINIO_BUCKET}/${key}`;
    await updateProduct(env.DB, productId, { image_url: publicUrl });

    fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
    return Response.json({ success: true, publicUrl });
  } catch (e) {
    return Response.json({ success: false, error: String(e) }, { status: 500 });
  }
};
