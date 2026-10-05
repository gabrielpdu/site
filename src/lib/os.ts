// Acesso às ordens de serviço. TODA regra de autorização fica aqui, no servidor:
// o cliente só enxerga OS cujo `cliente_email` é o e-mail VERIFICADO da conta
// Google; operações administrativas exigem `ator.admin === true`.
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type { Db } from './db/client';
import { historicoOs, ordensServico, type HistoricoOs, type OrdemServico } from './db/schema';
import type { AtualizarOs, NovaOsAdmin, NovaOsCliente } from '../scripts/validation';
import type { EnderecoColeta } from './endereco-coleta';

export const LIMITE_OS_POR_DIA = 5;

export interface Ator {
  email: string;
  name: string;
  emailVerified: boolean;
  admin: boolean;
}

export type OsComHistorico = OrdemServico & { historico: HistoricoOs[] };

export class ErroOs extends Error {
  constructor(
    public codigo: 'email_nao_verificado' | 'limite_diario' | 'sem_permissao' | 'nao_encontrada',
    mensagem: string
  ) {
    super(mensagem);
  }
}

const emailDe = (ator: Ator) => ator.email.trim().toLowerCase();

function exigirEmailVerificado(ator: Ator) {
  // Sem e-mail verificado, vincular OS por e-mail permitiria acessar dados alheios.
  if (!ator.emailVerified) {
    throw new ErroOs('email_nao_verificado', 'Seu e-mail Google não está verificado.');
  }
}

function exigirAdmin(ator: Ator) {
  if (!ator.admin || !ator.emailVerified) throw new ErroOs('sem_permissao', 'Acesso restrito à equipe.');
}

/** Data de hoje em São Paulo (AAAA-MM-DD), base da cota diária. */
function diaSaoPaulo(agora: Date): string {
  return agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/** Erro 23505 do Postgres (unique_violation), direto ou embrulhado pelo Drizzle. */
function violacaoUnica(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === '23505' || err?.cause?.code === '23505';
}

/** Grava o endereço só quando o atendimento é coleta (ignora sobras do formulário). */
function enderecoSeColeta(atendimento: string, endereco: EnderecoColeta | null) {
  return atendimento === 'coleta' && endereco ? endereco : {};
}

export function criarRepositorioOs(db: Db) {
  async function historicoDe(osId: string) {
    return db.select().from(historicoOs).where(eq(historicoOs.osId, osId)).orderBy(asc(historicoOs.criadoEm), asc(historicoOs.id));
  }

  async function registrarEvento(osId: string, evento: string) {
    await db.insert(historicoOs).values({ osId, evento });
  }

  return {
    /** OS do cliente logado (mais recentes primeiro). */
    async listarDoCliente(ator: Ator): Promise<OrdemServico[]> {
      exigirEmailVerificado(ator);
      return db
        .select()
        .from(ordensServico)
        .where(eq(ordensServico.clienteEmail, emailDe(ator)))
        .orderBy(desc(ordensServico.criadoEm));
    },

    /**
     * Detalhe de uma OS. Retorna `null` tanto se não existir quanto se for de
     * outro cliente — assim não revelamos quais números de OS existem.
     */
    async buscar(id: string, ator: Ator): Promise<OsComHistorico | null> {
      exigirEmailVerificado(ator);
      const filtro = ator.admin
        ? eq(ordensServico.id, id)
        : and(eq(ordensServico.id, id), eq(ordensServico.clienteEmail, emailDe(ator)));
      const [os] = await db.select().from(ordensServico).where(filtro).limit(1);
      if (!os) return null;
      return { ...os, historico: await historicoDe(os.id) };
    },

    async criarPeloCliente(ator: Ator, dados: NovaOsCliente, endereco: EnderecoColeta | null = null): Promise<OrdemServico> {
      exigirEmailVerificado(ator);
      const email = emailDe(ator);
      const dia = diaSaoPaulo(new Date());
      const prefixo = `${email}|${dia}|`;

      // Começa pela próxima vaga provável; se outra requisição simultânea pegou a
      // mesma, o índice único recusa e tentamos a seguinte. Sem vaga → limite.
      const [{ usadas }] = await db
        .select({ usadas: sql<number>`count(*)::int` })
        .from(ordensServico)
        .where(sql`starts_with(${ordensServico.cotaDiaria}, ${prefixo})`);

      for (let vaga = usadas + 1; vaga <= LIMITE_OS_POR_DIA; vaga++) {
        let os: OrdemServico;
        try {
          [os] = await db
            .insert(ordensServico)
            .values({
              clienteEmail: email,
              clienteNome: ator.name,
              telefone: dados.telefone,
              aparelho: dados.aparelho,
              marcaModelo: dados.marcaModelo,
              defeito: dados.defeito,
              atendimento: dados.atendimento,
              ...enderecoSeColeta(dados.atendimento, endereco),
              criadoPor: 'cliente',
              cotaDiaria: prefixo + vaga,
            })
            .returning();
        } catch (e) {
          if (violacaoUnica(e)) continue; // vaga ocupada por outra requisição
          throw e;
        }
        await registrarEvento(
          os.id,
          dados.atendimento === 'coleta'
            ? 'OS aberta pelo cliente no site com pedido de coleta por motoboy. Aguardando contato da equipe.'
            : 'OS aberta pelo cliente no site. Aguardando análise da equipe.'
        );
        return os;
      }
      throw new ErroOs(
        'limite_diario',
        `Você já abriu ${LIMITE_OS_POR_DIA} OS hoje. Fale com a equipe pelo WhatsApp.`
      );
    },

    // ---------------------------------------------------------------- admin

    async listarTodas(ator: Ator, filtros: { busca?: string; status?: string } = {}): Promise<OrdemServico[]> {
      exigirAdmin(ator);
      const condicoes = [];
      if (filtros.status) condicoes.push(eq(ordensServico.status, filtros.status as OrdemServico['status']));
      if (filtros.busca) {
        const termo = `%${filtros.busca.replace(/[%_\\]/g, '\\$&')}%`;
        condicoes.push(
          or(
            ilike(ordensServico.id, termo),
            ilike(ordensServico.clienteEmail, termo),
            ilike(ordensServico.clienteNome, termo),
            ilike(ordensServico.marcaModelo, termo)
          )
        );
      }
      return db
        .select()
        .from(ordensServico)
        .where(condicoes.length ? and(...condicoes) : undefined)
        .orderBy(desc(ordensServico.criadoEm))
        .limit(200);
    },

    async criarPeloAdmin(ator: Ator, dados: NovaOsAdmin, endereco: EnderecoColeta | null = null): Promise<OrdemServico> {
      exigirAdmin(ator);
      const [os] = await db
        .insert(ordensServico)
        .values({
          clienteEmail: dados.clienteEmail.toLowerCase(),
          clienteNome: dados.clienteNome,
          telefone: dados.telefone,
          aparelho: dados.aparelho,
          marcaModelo: dados.marcaModelo,
          defeito: dados.defeito,
          atendimento: dados.atendimento,
          ...enderecoSeColeta(dados.atendimento, endereco),
          status: 'Diagnóstico',
          criadoPor: 'admin',
        })
        .returning();
      await registrarEvento(os.id, 'Equipamento recebido e OS gerada.');
      return os;
    },

    async atualizar(ator: Ator, id: string, dados: AtualizarOs): Promise<OrdemServico> {
      exigirAdmin(ator);
      const [atual] = await db.select().from(ordensServico).where(eq(ordensServico.id, id)).limit(1);
      if (!atual) throw new ErroOs('nao_encontrada', 'OS não encontrada.');

      const [os] = await db
        .update(ordensServico)
        .set({
          status: dados.status,
          percentual: dados.status === 'Entregue' || dados.status === 'Pronto para Retirada' ? 100 : dados.percentual,
          tecnico: dados.tecnico ?? null,
          laudo: dados.laudo ?? null,
          valorCentavos: dados.valor ?? null,
          previsaoEntrega: dados.previsaoEntrega ?? null,
          atualizadoEm: new Date(),
        })
        .where(eq(ordensServico.id, id))
        .returning();

      if (atual.status !== dados.status) await registrarEvento(id, `Status alterado para: ${dados.status}`);
      if (dados.evento) await registrarEvento(id, dados.evento);
      return os;
    },
  };
}

export type RepositorioOs = ReturnType<typeof criarRepositorioOs>;
