import type { APIRoute } from 'astro';
import { createProduct, updateProduct, deleteProduct } from '../../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime.env.DB;
    const body = await request.json() as {
      category_id: string;
      variant_id: string;
      price: number;
      original_price?: number | null;
      image_url?: string | null;
      sort_order?: number;
    };

    if (!body.category_id || !body.variant_id || body.price == null) {
      return new Response(
        JSON.stringify({ success: false, error: 'category_id, variant_id, price required' }),
        { status: 400 },
      );
    }

    const id = await createProduct(db, {
      category_id: body.category_id,
      variant_id: body.variant_id,
      price: Number(body.price),
      original_price: body.original_price ?? null,
      image_url: body.image_url ?? null,
      sort_order: Number(body.sort_order ?? 0),
    });

    fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
    return new Response(JSON.stringify({ success: true, id }), { status: 201 });
  } catch (e) {
    return Response.json({ success: false, error: String(e) }, { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime.env.DB;
    const body = await request.json() as {
      id: string;
      price?: number;
      original_price?: number | null;
      image_url?: string | null;
      is_active?: number;
      sort_order?: number;
      category_id?: string;
      variant_id?: string;
    };

    if (!body.id) {
      return new Response(JSON.stringify({ success: false, error: 'id required' }), { status: 400 });
    }

    const { id, ...updates } = body;
    await updateProduct(db, id, updates as Parameters<typeof updateProduct>[2]);
    fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return Response.json({ success: false, error: String(e) }, { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime.env.DB;
    const { id } = await request.json() as { id: string };

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'id required' }), { status: 400 });
    }

    await deleteProduct(db, id);
    fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return Response.json({ success: false, error: String(e) }, { status: 500 });
  }
};
