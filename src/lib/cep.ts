// Consulta de CEP feita no servidor (o navegador só chama /api/cep, mesma origem).
// ViaCEP é a fonte principal e a única que decide "CEP inexistente";
// a BrasilAPI é usada apenas quando o ViaCEP está fora do ar/lento
// (ela responde endereços para CEPs que não existem, ex.: 99999-999).
import type { Endereco } from './coleta';

export type ResultadoCep =
  | { status: 'ok'; endereco: Endereco }
  | { status: 'invalido' }
  | { status: 'nao_encontrado' }
  | { status: 'indisponivel' };

type Fetch = typeof fetch;

const TIMEOUT_MS = 4000;
const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { ate: number; resultado: ResultadoCep }>();

export function limparCep(cep: string): string | null {
  const limpo = cep.replace(/\D/g, '');
  return /^\d{8}$/.test(limpo) ? limpo : null;
}

async function getJson(url: string, fetchImpl: Fetch): Promise<{ status: number; body: any }> {
  const res = await fetchImpl(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: 'application/json' },
  });
  return { status: res.status, body: res.ok ? await res.json() : null };
}

async function viaCep(cep: string, fetchImpl: Fetch): Promise<ResultadoCep> {
  const { status, body } = await getJson(`https://viacep.com.br/ws/${cep}/json/`, fetchImpl);
  if (status === 400) return { status: 'nao_encontrado' };
  if (status !== 200 || !body) throw new Error(`ViaCEP HTTP ${status}`);
  if (body.erro) return { status: 'nao_encontrado' };
  return {
    status: 'ok',
    endereco: {
      cep,
      logradouro: (body.logradouro ?? '').trim(),
      bairro: (body.bairro ?? '').trim(),
      cidade: (body.localidade ?? '').trim(),
      uf: (body.uf ?? '').trim(),
      ibge: String(body.ibge ?? ''),
    },
  };
}

async function brasilApi(cep: string, fetchImpl: Fetch): Promise<ResultadoCep> {
  const { status, body } = await getJson(`https://brasilapi.com.br/api/cep/v2/${cep}`, fetchImpl);
  if (status === 404) return { status: 'nao_encontrado' };
  if (status !== 200 || !body) throw new Error(`BrasilAPI HTTP ${status}`);
  return {
    status: 'ok',
    endereco: {
      cep,
      logradouro: (body.street ?? '').trim(),
      bairro: (body.neighborhood ?? '').trim(),
      cidade: (body.city ?? '').trim(),
      uf: (body.state ?? '').trim(),
      ibge: String(body.ibge?.city ?? ''),
    },
  };
}

export async function consultarCep(cepEntrada: string, fetchImpl: Fetch = fetch): Promise<ResultadoCep> {
  const cep = limparCep(cepEntrada);
  if (!cep) return { status: 'invalido' };

  const emCache = cache.get(cep);
  if (emCache && emCache.ate > Date.now()) return emCache.resultado;

  let resultado: ResultadoCep;
  try {
    resultado = await viaCep(cep, fetchImpl);
  } catch {
    try {
      resultado = await brasilApi(cep, fetchImpl);
    } catch {
      return { status: 'indisponivel' }; // não guarda falha em cache
    }
  }
  cache.set(cep, { ate: Date.now() + TTL_MS, resultado });
  return resultado;
}

/** Só para testes. */
export function _limparCacheCep() {
  cache.clear();
}
