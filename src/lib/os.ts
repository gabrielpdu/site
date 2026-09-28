// Acesso às ordens de serviço. TODA regra de autorização fica aqui, no servidor:
// o cliente só enxerga OS cujo `cliente_email` é o e-mail VERIFICADO da conta
// Google; operações administrativas exigem `ator.admin === true`.
import { and, asc, desc, eq, gte, ilike, or, sql } from 'drizzle-orm';
import type { Db } from './db/client';
import { historicoOs, ordensServico, type HistoricoOs, type OrdemServico } from './db/schema';
import type { AtualizarOs, NovaOsAdmin, NovaOsCliente } from '../scripts/validation';

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

    async criarPeloCliente(ator: Ator, dados: NovaOsCliente): Promise<OrdemServico> {
      exigirEmailVerificado(ator);
      const email = emailDe(ator);
      const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(ordensServico)
        .where(
          and(
            eq(ordensServico.clienteEmail, email),
            eq(ordensServico.criadoPor, 'cliente'),
            gte(ordensServico.criadoEm, umDiaAtras)
          )
        );
      if (total >= LIMITE_OS_POR_DIA) {
        throw new ErroOs(
          'limite_diario',
          `Você já abriu ${LIMITE_OS_POR_DIA} OS nas últimas 24h. Fale com a equipe pelo WhatsApp.`
        );
      }

      const [os] = await db
        .insert(ordensServico)
        .values({
          clienteEmail: email,
          clienteNome: ator.name,
          telefone: dados.telefone,
          aparelho: dados.aparelho,
          marcaModelo: dados.marcaModelo,
          defeito: dados.defeito,
          atendimento: dados.atendimento,
          criadoPor: 'cliente',
        })
        .returning();
      await registrarEvento(os.id, 'OS aberta pelo cliente no site. Aguardando análise da equipe.');
      return os;
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

    async criarPeloAdmin(ator: Ator, dados: NovaOsAdmin): Promise<OrdemServico> {
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
