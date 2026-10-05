// Confere no servidor o endereço informado numa OS com coleta: o CEP precisa
// existir e (para o cliente) estar na área atendida. Cidade/UF saem da consulta
// do CEP, nunca do formulário.
import { consultarCep } from './cep';
import { avaliarCobertura, cidadesAtendidasTexto } from './coleta';

export interface EnderecoColeta {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string | null;
  uf: string | null;
}

interface DadosEndereco {
  cep: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
}

export type ResultadoEndereco = { ok: true; endereco: EnderecoColeta } | { ok: false; campo: 'cep'; mensagem: string };

export async function resolverEnderecoColeta(
  dados: DadosEndereco,
  { exigirCobertura, fetchImpl }: { exigirCobertura: boolean; fetchImpl?: typeof fetch }
): Promise<ResultadoEndereco> {
  const r = await consultarCep(dados.cep, fetchImpl);
  const base = {
    cep: dados.cep,
    logradouro: dados.logradouro ?? '',
    numero: dados.numero ?? '',
    complemento: dados.complemento || null,
    bairro: dados.bairro ?? '',
  };

  if (r.status === 'invalido' || r.status === 'nao_encontrado') {
    return { ok: false, campo: 'cep', mensagem: 'CEP não encontrado. Confira os 8 dígitos.' };
  }
  if (r.status === 'indisponivel') {
    // Equipe pode registrar mesmo assim; o cliente precisa da confirmação de área.
    if (!exigirCobertura) return { ok: true, endereco: { ...base, cidade: null, uf: null } };
    return {
      ok: false,
      campo: 'cep',
      mensagem: 'Não conseguimos validar o CEP agora. Tente novamente em instantes ou fale com a gente pelo WhatsApp.',
    };
  }
  if (exigirCobertura && !avaliarCobertura(r.endereco).atendido) {
    return {
      ok: false,
      campo: 'cep',
      mensagem: `A coleta por motoboy atende só ${cidadesAtendidasTexto()}. Escolha "Levar na loja" ou fale com a gente pelo WhatsApp para enviar pelos Correios.`,
    };
  }
  return { ok: true, endereco: { ...base, cidade: r.endereco.cidade, uf: r.endereco.uf } };
}
