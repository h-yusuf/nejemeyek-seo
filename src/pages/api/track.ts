export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = (locals as App.Locals).runtime.env.DB;
    const text = await request.text();
    const params = new URLSearchParams(text);
    const page = params.get('page') ?? '/';

    // Never track admin pages
    if (page.startsWith('/admin')) return new Response(null, { status: 204 });

    const date = new Date().toISOString().split('T')[0];
    await db
      .prepare(
        'INSERT INTO page_views (page, date, count) VALUES (?, ?, 1) ON CONFLICT (page, date) DO UPDATE SET count = count + 1',
      )
      .bind(page, date)
      .run();
  } catch {
    // silently fail — tracking must never break the page
  }
  return new Response(null, { status: 204 });
};
