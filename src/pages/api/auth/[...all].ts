import type { APIRoute } from 'astro';
import { auth } from '../../../lib/auth';

export const prerender = false;

// Endpoints do Better Auth (callback do Google, sessão, logout...).
export const ALL: APIRoute = async ({ request }) => {
  const response = await auth.handler(request);
  const r = new Response(response.body, response);
  r.headers.set('Cache-Control', 'private, no-store');
  return r;
};
