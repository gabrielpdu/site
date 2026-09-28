// Formatação para exibição (fuso de Paiçandu/PR).
const TZ = 'America/Sao_Paulo';

export const APARELHO_LABEL: Record<string, string> = {
  celular: 'Celular / Smartphone',
  notebook: 'Notebook',
  pc: 'PC / Desktop',
  outro: 'Outro',
};

export const ATENDIMENTO_LABEL: Record<string, string> = {
  balcao: 'Levar na loja (balcão)',
  coleta: 'Solicitar coleta',
};

export function data(d: Date | null | undefined): string {
  return d ? d.toLocaleDateString('pt-BR', { timeZone: TZ }) : '—';
}

export function dataHora(d: Date | null | undefined): string {
  return d
    ? d.toLocaleString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—';
}

/** Para <input type="date">. */
export function dataIso(d: Date | null | undefined): string {
  return d ? d.toLocaleDateString('en-CA', { timeZone: TZ }) : '';
}

export function moeda(centavos: number | null | undefined): string {
  return centavos == null ? 'A definir' : (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Para preencher o campo de valor no admin ("280,00"). */
export function valorInput(centavos: number | null | undefined): string {
  return centavos == null ? '' : (centavos / 100).toFixed(2).replace('.', ',');
}
