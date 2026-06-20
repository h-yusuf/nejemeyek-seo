import type { APIRoute } from 'astro';
import { createVariant, deleteVariant } from '../../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime.env.DB;
    const { label, sort_order = 0 } = await request.json() as { label: string; sort_order?: number };

    if (!label?.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'label required' }), { status: 400 });
    }

    await createVariant(db, { label: label.trim(), sort_order: Number(sort_order) });
    fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
    return new Response(JSON.stringify({ success: true }), { status: 201 });
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

    await deleteVariant(db, id);
    fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return Response.json({ success: false, error: String(e) }, { status: 500 });
  }
};
