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
// Cache limitado: Map mantém a ordem de inserção, então o primeiro é o mais antigo.
const MAX_CACHE = 2000;
const cache = new Map<string, { ate: number; resultado: ResultadoCep }>();

function guardar(cep: string, resultado: ResultadoCep) {
  cache.delete(cep);
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
  cache.set(cep, { ate: Date.now() + TTL_MS, resultado });
}

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
  guardar(cep, resultado);
  return resultado;
}

// Limite por visitante para o endpoint público /api/cep: evita que um script use o
// site para martelar o ViaCEP (e o ViaCEP bloquear o servidor para todos).
// Em memória, por instância: suficiente para uso abusivo casual.
const JANELA_MS = 60_000;
const MAX_POR_JANELA = 20;
const MAX_VISITANTES = 5000;
const acessos = new Map<string, { inicio: number; total: number }>();

/** IPv6: agrupa pela rede /64 (um único cliente costuma ter a /64 inteira). */
export function chaveVisitante(ip: string): string {
  if (!ip.includes(':')) return ip;
  return ip.split(':').slice(0, 4).join(':') + '::/64';
}

export function permitirConsulta(ip: string, agora = Date.now()): boolean {
  const chave = chaveVisitante(ip);
  const a = acessos.get(chave);
  if (!a || agora - a.inicio >= JANELA_MS) {
    acessos.delete(chave);
    // Ao lotar, descarta só o mais antigo (nunca zera o contador de todos).
    if (acessos.size >= MAX_VISITANTES) acessos.delete(acessos.keys().next().value!);
    acessos.set(chave, { inicio: agora, total: 1 });
    return true;
  }
  a.total++;
  return a.total <= MAX_POR_JANELA;
}

/** Só para testes. */
export function _limparCacheCep() {
  cache.clear();
  acessos.clear();
}

export const _tamanhoCacheCep = () => cache.size;
