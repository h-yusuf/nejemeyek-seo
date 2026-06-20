import type { APIRoute } from 'astro';
import { updateProduct } from '../../../lib/db';
import { getPresignedUploadUrl, getPublicUrl, deleteObject, keyFromUrl } from '../../../lib/storage';

export const prerender = false;

// GET ?filename=foo.jpg&contentType=image/jpeg&productId=uuid
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const filename = url.searchParams.get('filename');
    const contentType = url.searchParams.get('contentType') ?? 'image/jpeg';
    const productId = url.searchParams.get('productId');

    if (!filename || !productId) {
      return new Response(
        JSON.stringify({ success: false, error: 'filename and productId required' }),
        { status: 400 },
      );
    }

    const env = locals.runtime.env;
    const key = `products/${productId}/${crypto.randomUUID()}-${filename}`;
    const config = {
      endpoint: env.MINIO_ENDPOINT,
      bucket: env.MINIO_BUCKET,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    };

    const presignedUrl = await getPresignedUploadUrl(config, key, contentType);
    const publicUrl = getPublicUrl(config, key);

    return new Response(JSON.stringify({ success: true, presignedUrl, publicUrl }), { status: 200 });
  } catch (e) {
    return Response.json({ success: false, error: String(e) }, { status: 500 });
  }
};

// POST — save image_url to product row after upload completes
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime.env.DB;
    const { productId, imageUrl } = await request.json() as { productId: string; imageUrl: string };

    if (!productId || !imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'productId and imageUrl required' }),
        { status: 400 },
      );
    }

    await updateProduct(db, productId, { image_url: imageUrl });
    fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return Response.json({ success: false, error: String(e) }, { status: 500 });
  }
};

// DELETE — remove object from MinIO and clear image_url on product
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime.env.DB;
    const env = locals.runtime.env;
    const { productId, imageUrl } = await request.json() as { productId: string; imageUrl: string };

    if (!productId || !imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'productId and imageUrl required' }),
        { status: 400 },
      );
    }

    const config = {
      endpoint: env.MINIO_ENDPOINT,
      bucket: env.MINIO_BUCKET,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    };
    const key = keyFromUrl(imageUrl, env.MINIO_ENDPOINT, env.MINIO_BUCKET);

    await Promise.all([
      deleteObject(config, key),
      updateProduct(db, productId, { image_url: null }),
    ]);

    fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return Response.json({ success: false, error: String(e) }, { status: 500 });
  }
};
