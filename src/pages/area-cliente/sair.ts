import type { APIRoute } from 'astro';
import { auth } from '../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const res = new Response(null, { status: 303, headers: { Location: '/area-cliente' } });
  try {
    const { headers } = await auth.api.signOut({ headers: request.headers, returnHeaders: true });
    for (const cookie of headers.getSetCookie()) res.headers.append('Set-Cookie', cookie);
  } catch {
    // Sessão já inexistente/expirada: basta voltar para a tela de login.
  }
  return res;
};
