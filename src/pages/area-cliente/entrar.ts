import type { APIRoute } from 'astro';
import { auth, googleConfigurado } from '../../lib/auth';
import { destinoAposLogin } from '../../lib/voltar';

export const prerender = false;

// Inicia o login com Google (POST para não ser disparado por links/prefetch).
// O Better Auth cria o `state` + PKCE e grava o cookie de verificação.
export const POST: APIRoute = async ({ request, redirect }) => {
  if (!googleConfigurado) return redirect('/area-cliente?erro=config', 303);

  // Volta para onde o cliente estava (ex.: formulário de OS com coleta), só dentro da Área do Cliente.
  const form = await request.formData().catch(() => null);
  const voltar = form?.get('voltar');
  const callbackURL = destinoAposLogin(typeof voltar === 'string' ? voltar : null);

  try {
    const { headers, response } = await auth.api.signInSocial({
      body: {
        provider: 'google',
        callbackURL,
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
