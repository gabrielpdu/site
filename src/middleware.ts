import { defineMiddleware } from 'astro:middleware';

// Rotas que dependem de sessão. As demais (estáticas) nem consultam o banco.
const ROTAS_PRIVADAS = ['/area-cliente', '/admin'];

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.user = null;
  context.locals.session = null;

  const { pathname } = context.url;
  const privada = ROTAS_PRIVADAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  if (context.isPrerendered || !privada) {
    return next();
  }

  // Import tardio: páginas estáticas não carregam auth/banco no build.
  const { auth } = await import('./lib/auth');
  // returnHeaders: quando a sessão é renovada, o Better Auth devolve o cookie
  // atualizado — precisa ser repassado ao navegador (sessão "deslizante").
  const { headers: authHeaders, response: sessao } = await auth.api.getSession({
    headers: context.request.headers,
    returnHeaders: true,
  });
  if (sessao) {
    context.locals.user = sessao.user;
    context.locals.session = sessao.session;
  }

  // Conteúdo pessoal: nunca guardar em cache (navegador, CDN ou service worker).
  return semCache(await next(), authHeaders.getSetCookie());
});

function semCache(response: Response, cookies: string[]): Response {
  // Alguns Responses (ex.: Response.redirect) têm headers imutáveis → recria.
  const r = new Response(response.body, response);
  r.headers.set('Cache-Control', 'private, no-store');
  r.headers.set('X-Robots-Tag', 'noindex, nofollow');
  // Não sobrescreve cookies definidos pela própria rota (ex.: logout).
  if (!r.headers.has('Set-Cookie')) for (const c of cookies) r.headers.append('Set-Cookie', c);
  return r;
}
