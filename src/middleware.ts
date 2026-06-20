import { defineMiddleware } from 'astro:middleware';
import { hashPassword } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;

  if (!path.startsWith('/admin')) return next();
  if (path === '/admin/login' || path.startsWith('/admin/api/logout')) return next();

  const env = (context.locals as App.Locals).runtime?.env;
  const adminPassword = env?.ADMIN_PASSWORD;

  // No password configured — allow through (misconfigured env)
  if (!adminPassword) return next();

  const sessionCookie = context.cookies.get('admin_session');
  const expectedHash = await hashPassword(adminPassword);

  if (sessionCookie?.value !== expectedHash) {
    const loginUrl = new URL('/admin/login', context.url);
    loginUrl.searchParams.set('next', path);
    return context.redirect(loginUrl.toString());
  }

  return next();
});
