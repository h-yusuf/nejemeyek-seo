export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete('admin_session', { path: '/admin' });
  return redirect('/admin/login');
};
