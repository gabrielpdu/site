import { z } from 'zod';

const TELEFONE_REGEX = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;
const TELEFONE_MSG = 'Informe um telefone válido com DDD (Ex: 11 99999-9999)';
const APARELHOS = ['celular', 'notebook', 'pc', 'outro'] as const;

export const ContatoSchema = z.object({
  nome: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().email('Insira um e-mail válido'),
  telefone: z.string().regex(TELEFONE_REGEX, TELEFONE_MSG),
  aparelho: z.enum(APARELHOS, {
    errorMap: () => ({ message: 'Selecione o tipo de aparelho' })
  }),
  servico: z.string().min(1, 'Selecione um serviço desejado'),
  descricao: z.string().min(10, 'Descreva o problema com pelo menos 10 caracteres').max(2000, 'Descrição muito longa'),
  lgpd: z.boolean().refine(val => val === true, {
    message: 'Você deve concordar com a Política de Privacidade (LGPD)'
  })
});

export type ContatoData = z.infer<typeof ContatoSchema>;

// ---------------------------------------------------------------------------
// Ordens de serviço (validadas no servidor a partir de FormData)
// ---------------------------------------------------------------------------

const texto = (min: number, max: number, msgMin: string) =>
  z.string().trim().min(min, msgMin).max(max, `Máximo de ${max} caracteres`);

const camposAparelho = {
  telefone: z.string().trim().regex(TELEFONE_REGEX, TELEFONE_MSG),
  aparelho: z.enum(APARELHOS, { errorMap: () => ({ message: 'Selecione o tipo de aparelho' }) }),
  marcaModelo: texto(2, 100, 'Informe a marca e o modelo'),
  defeito: texto(10, 2000, 'Descreva o problema com pelo menos 10 caracteres'),
  atendimento: z.enum(['balcao', 'coleta'], { errorMap: () => ({ message: 'Escolha a forma de atendimento' }) }),
};

/** OS aberta pelo próprio cliente logado. Nome/e-mail vêm da conta Google. */
export const NovaOsClienteSchema = z.object({
  ...camposAparelho,
  lgpd: z.literal('on', { errorMap: () => ({ message: 'Você deve concordar com a Política de Privacidade (LGPD)' }) }),
});
export type NovaOsCliente = z.infer<typeof NovaOsClienteSchema>;

/** OS cadastrada no balcão pelo admin, vinculada ao e-mail do cliente. */
export const NovaOsAdminSchema = z.object({
  ...camposAparelho,
  clienteNome: texto(2, 100, 'Informe o nome do cliente'),
  clienteEmail: z.string().trim().toLowerCase().email('Insira um e-mail válido').max(254),
});
export type NovaOsAdmin = z.infer<typeof NovaOsAdminSchema>;

const STATUS_OS = [
  'Aguardando análise',
  'Diagnóstico',
  'Aguardando Aprovação',
  'Em Reparo',
  'Testes Finais',
  'Pronto para Retirada',
  'Entregue',
  'Cancelada',
] as const;

const vazioParaUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const AtualizarOsSchema = z.object({
  status: z.enum(STATUS_OS, { errorMap: () => ({ message: 'Status inválido' }) }),
  percentual: z.coerce.number().int().min(0).max(100, 'Percentual entre 0 e 100'),
  tecnico: z.preprocess(vazioParaUndefined, z.string().trim().max(100).optional()),
  laudo: z.preprocess(vazioParaUndefined, z.string().trim().max(4000).optional()),
  // Aceita "280", "280,00", "1.280,50" ou "R$ 280,00" → centavos.
  valor: z.preprocess(
    vazioParaUndefined,
    z
      .string()
      .trim()
      .regex(/^(R\$\s?)?\d{1,3}(\.?\d{3})*(,\d{1,2})?$/, 'Valor inválido (ex.: 280,00)')
      .transform((v) => {
        const [inteiro, dec = '0'] = v.replace(/^R\$\s?/, '').replace(/\./g, '').split(',');
        return Number(inteiro) * 100 + Number(dec.padEnd(2, '0'));
      })
      .optional()
  ),
  previsaoEntrega: z.preprocess(
    vazioParaUndefined,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
      .transform((d) => new Date(`${d}T12:00:00-03:00`))
      .optional()
  ),
  evento: z.preprocess(vazioParaUndefined, z.string().trim().max(300).optional()),
});
export type AtualizarOs = z.infer<typeof AtualizarOsSchema>;

/** Converte FormData em objeto simples para validar com Zod. */
export function formParaObjeto(form: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === 'string') obj[k] = v;
  return obj;
}

/** Primeiro erro de cada campo, para exibir no formulário. */
export function errosPorCampo(error: z.ZodError): Record<string, string> {
  const erros: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? '_');
    erros[campo] ??= issue.message;
  }
  return erros;
}
