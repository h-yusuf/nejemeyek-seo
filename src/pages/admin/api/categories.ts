import type { APIRoute } from 'astro';
import { createCategory, deleteCategory, getCategoryById } from '../../../lib/db';
import { slugify } from '../../../lib/wa';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime.env.DB;
    const { name, sort_order = 0 } = await request.json() as { name: string; sort_order?: number };

    if (!name?.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'name required' }), { status: 400 });
    }

    const id = slugify(name);
    const existing = await getCategoryById(db, id);
    if (existing) {
      return new Response(JSON.stringify({ success: false, error: 'category already exists' }), { status: 409 });
    }

    await createCategory(db, { id, name: name.trim(), sort_order: Number(sort_order) });
    fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
    return new Response(JSON.stringify({ success: true, id }), { status: 201 });
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

    await deleteCategory(db, id);
    fetch(new URL('/admin/api/revalidate', request.url), { method: 'POST' }).catch(() => {});
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return Response.json({ success: false, error: String(e) }, { status: 500 });
  }
};
