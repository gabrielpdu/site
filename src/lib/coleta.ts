// Regras da coleta por motoboy. Edite AREA_COLETA / HORARIO_CORTE para mudar
// cidades atendidas, taxa ou horário — o card de /contato e o formulário de OS
// usam estas mesmas regras.

export interface CidadeAtendida {
  ibge: string;
  cidade: string;
  uf: string;
  taxaCentavos: number;
}

export const AREA_COLETA: CidadeAtendida[] = [
  { ibge: '4117503', cidade: 'Paiçandu', uf: 'PR', taxaCentavos: 0 },
];

/** Pedidos até esta hora (exclusiva) saem no mesmo dia. Domingo não há coleta. */
export const HORARIO_CORTE = { util: 15, sabado: 11 } as const;

export interface Endereco {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  ibge: string;
}

export interface Previsao {
  hoje: boolean;
  /** Data local (America/Sao_Paulo) no formato YYYY-MM-DD. */
  data: string;
  /** Texto para exibir: "hoje" ou "ter, 07/10". */
  rotulo: string;
}

export type Cobertura =
  | { atendido: true; taxaCentavos: number; previsao: Previsao }
  | { atendido: false };

const TZ = 'America/Sao_Paulo';
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export function cidadesAtendidasTexto(): string {
  return AREA_COLETA.map((c) => `${c.cidade}/${c.uf}`).join(', ');
}

/** Data/hora "de parede" em São Paulo, independente do fuso do servidor. */
function partesSP(agora: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      weekday: 'short',
    })
      .formatToParts(agora)
      .map((x) => [x.type, x.value])
  );
  const semana = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { ano: +p.year, mes: +p.month, dia: +p.day, hora: +p.hour, semana };
}

export function previsaoColeta(agora: Date = new Date()): Previsao {
  const { ano, mes, dia, hora, semana } = partesSP(agora);
  const corte = semana === 6 ? HORARIO_CORTE.sabado : HORARIO_CORTE.util;
  const hoje = semana !== 0 && hora < corte;

  // Avança em "datas de calendário" (UTC só como contador de dias).
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (!hoje) {
    do d.setUTCDate(d.getUTCDate() + 1);
    while (d.getUTCDay() === 0); // seg–sáb são dias de coleta
  }
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return {
    hoje,
    data: `${d.getUTCFullYear()}-${mm}-${dd}`,
    rotulo: hoje ? 'hoje' : `${DIAS[d.getUTCDay()]}, ${dd}/${mm}`,
  };
}

export function avaliarCobertura(endereco: Pick<Endereco, 'ibge'>, agora: Date = new Date()): Cobertura {
  const cidade = AREA_COLETA.find((c) => c.ibge === endereco.ibge);
  if (!cidade) return { atendido: false };
  return { atendido: true, taxaCentavos: cidade.taxaCentavos, previsao: previsaoColeta(agora) };
}
