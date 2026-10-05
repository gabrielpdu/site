import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  pgSequence,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Tabelas exigidas pelo Better Auth (nomes/campos conforme `getAuthTables`).
// ---------------------------------------------------------------------------

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('session_user_id_idx').on(t.userId)]
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('account_user_id_idx').on(t.userId)]
);

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Rate limit persistido no banco: em serverless a memória não é compartilhada.
export const rateLimit = pgTable('rate_limit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
});

// ---------------------------------------------------------------------------
// Ordens de serviço
// ---------------------------------------------------------------------------

export const STATUS_OS = [
  'Aguardando análise',
  'Diagnóstico',
  'Aguardando Aprovação',
  'Em Reparo',
  'Testes Finais',
  'Pronto para Retirada',
  'Entregue',
  'Cancelada',
] as const;
export type StatusOS = (typeof STATUS_OS)[number];

export const APARELHOS = ['celular', 'notebook', 'pc', 'outro'] as const;
export type Aparelho = (typeof APARELHOS)[number];

export const ATENDIMENTOS = ['balcao', 'coleta'] as const;
export type Atendimento = (typeof ATENDIMENTOS)[number];

export const osSeq = pgSequence('os_seq', { startWith: 1 });

export const ordensServico = pgTable(
  'ordens_servico',
  {
    // Ex.: CT-2026-0001. A sequência garante unicidade sem transação.
    // Mínimo de 4 dígitos sem truncar (lpad cortaria 10000 → "1000").
    id: text('id')
      .primaryKey()
      .default(
        sql`('CT-' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY') || '-' || regexp_replace('000' || nextval('os_seq')::text, '^0*(\\d{4,})$', '\\1'))`
      ),
    // E-mail sempre em minúsculas: é a chave de vínculo com a conta Google.
    clienteEmail: text('cliente_email').notNull(),
    clienteNome: text('cliente_nome').notNull(),
    telefone: text('telefone').notNull(),
    aparelho: text('aparelho', { enum: APARELHOS }).notNull(),
    marcaModelo: text('marca_modelo').notNull(),
    defeito: text('defeito').notNull(),
    atendimento: text('atendimento', { enum: ATENDIMENTOS }).notNull().default('balcao'),
    // Endereço de coleta (preenchido só quando atendimento = 'coleta').
    // Cidade/UF vêm da consulta de CEP no servidor, não do navegador.
    cep: text('cep'),
    logradouro: text('logradouro'),
    numero: text('numero'),
    complemento: text('complemento'),
    bairro: text('bairro'),
    cidade: text('cidade'),
    uf: text('uf'),
    status: text('status', { enum: STATUS_OS }).notNull().default('Aguardando análise'),
    percentual: integer('percentual').notNull().default(0),
    laudo: text('laudo'),
    tecnico: text('tecnico'),
    valorCentavos: integer('valor_centavos'),
    previsaoEntrega: timestamp('previsao_entrega', { mode: 'date' }),
    criadoPor: text('criado_por', { enum: ['cliente', 'admin'] }).notNull(),
    // "Vaga" diária do cliente (email|AAAA-MM-DD|1..5). O índice único garante o
    // limite de OS por dia mesmo com envios simultâneos em instâncias diferentes.
    // NULL para OS de balcão (admin).
    cotaDiaria: text('cota_diaria').unique(),
    criadoEm: timestamp('criado_em').notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em').notNull().defaultNow(),
  },
  (t) => [index('os_cliente_email_idx').on(t.clienteEmail), index('os_criado_em_idx').on(t.criadoEm)]
);

export const historicoOs = pgTable(
  'historico_os',
  {
    id: serial('id').primaryKey(),
    osId: text('os_id')
      .notNull()
      .references(() => ordensServico.id, { onDelete: 'cascade' }),
    evento: text('evento').notNull(),
    criadoEm: timestamp('criado_em').notNull().defaultNow(),
  },
  (t) => [index('historico_os_id_idx').on(t.osId)]
);

export type OrdemServico = typeof ordensServico.$inferSelect;
export type HistoricoOs = typeof historicoOs.$inferSelect;
