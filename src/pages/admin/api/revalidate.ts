import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  try {
    const webhook = locals.runtime.env.CF_PAGES_WEBHOOK;
    if (webhook) fetch(webhook, { method: 'POST' }).catch(() => {});
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return Response.json({ success: false, error: String(e) }, { status: 500 });
  }
};
