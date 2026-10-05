import type { APIRoute } from 'astro';
import { consultarCep, permitirConsulta } from '../../../lib/cep';
import { avaliarCobertura } from '../../../lib/coleta';

export const prerender = false;

const json = (status: number, body: unknown, cache = 'no-store') =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache },
  });

// GET /api/cep/87140000 → endereço + se a coleta por motoboy atende.
export const GET: APIRoute = async ({ params, request, clientAddress }) => {
  // Na Vercel o IP real do visitante vem no primeiro item de x-forwarded-for.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || clientAddress || 'desconhecido';
  if (!permitirConsulta(ip)) {
    return new Response(JSON.stringify({ erro: 'Muitas consultas. Aguarde um minuto.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Retry-After': '60', 'Cache-Control': 'no-store' },
    });
  }

  const r = await consultarCep(params.cep ?? '');
  switch (r.status) {
    case 'invalido':
      return json(400, { erro: 'CEP inválido. Use 8 dígitos.' });
    case 'nao_encontrado':
      return json(404, { erro: 'CEP não encontrado.' }, 'public, max-age=3600');
    case 'indisponivel':
      return json(502, { erro: 'Serviço de CEP indisponível no momento.' });
    case 'ok':
      // A previsão muda com o horário: não guardar a resposta em cache.
      return json(200, { endereco: r.endereco, cobertura: avaliarCobertura(r.endereco) });
  }
};
