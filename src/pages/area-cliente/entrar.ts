import type { APIRoute } from 'astro';
import { auth, googleConfigurado } from '../../lib/auth';

export const prerender = false;

// Inicia o login com Google (POST para não ser disparado por links/prefetch).
// O Better Auth cria o `state` + PKCE e grava o cookie de verificação.
export const POST: APIRoute = async ({ request, redirect }) => {
  if (!googleConfigurado) return redirect('/area-cliente?erro=config', 303);

  try {
    const { headers, response } = await auth.api.signInSocial({
      body: {
        provider: 'google',
        callbackURL: '/area-cliente',
        errorCallbackURL: '/area-cliente?erro=login',
      },
      headers: request.headers,
      returnHeaders: true,
    });
    if (!response.url) return redirect('/area-cliente?erro=login', 303);

    const res = new Response(null, { status: 303, headers: { Location: response.url } });
    for (const cookie of headers.getSetCookie()) res.headers.append('Set-Cookie', cookie);
    return res;
  } catch (e) {
    console.error('Falha ao iniciar login Google', e);
    return redirect('/area-cliente?erro=login', 303);
  }
};
