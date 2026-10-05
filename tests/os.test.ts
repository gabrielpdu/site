// Regras de acesso às OS, contra um Postgres real em memória (PGlite).
// Uso: npm test
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { createMigratedPgliteDb } from '../src/lib/db/client';
import { ErroOs, LIMITE_OS_POR_DIA, criarRepositorioOs, type Ator, type RepositorioOs } from '../src/lib/os';
import { AtualizarOsSchema, NovaOsAdminSchema, NovaOsClienteSchema } from '../src/scripts/validation';

const clienteA: Ator = { email: 'Ana@Exemplo.test', name: 'Ana', emailVerified: true, admin: false };
const clienteB: Ator = { email: 'bruno@exemplo.test', name: 'Bruno', emailVerified: true, admin: false };
const naoVerificado: Ator = { email: 'ana@exemplo.test', name: 'Falsa Ana', emailVerified: false, admin: false };
const admin: Ator = { email: 'admin@exemplo.test', name: 'Admin', emailVerified: true, admin: true };

const novaOs = NovaOsClienteSchema.parse({
  telefone: '(44) 99999-0000',
  aparelho: 'celular',
  marcaModelo: 'Moto G84',
  defeito: 'Não carrega mais a bateria',
  atendimento: 'balcao',
  lgpd: 'on',
});

async function falhaCom(codigo: ErroOs['codigo'], fn: () => Promise<unknown>) {
  await assert.rejects(fn, (e: unknown) => e instanceof ErroOs && e.codigo === codigo);
}

describe('repositório de OS', () => {
  let repo: RepositorioOs;
  let osDaAna: string;
  let osDoBalcao: string;

  before(async () => {
    repo = criarRepositorioOs(await createMigratedPgliteDb());
  });

  it('cliente cria OS com número no formato CT-AAAA-NNNN e histórico inicial', async () => {
    const os = await repo.criarPeloCliente(clienteA, novaOs);
    osDaAna = os.id;
    assert.match(os.id, /^CT-\d{4}-\d{4}$/);
    assert.equal(os.clienteEmail, 'ana@exemplo.test', 'e-mail normalizado em minúsculas');
    assert.equal(os.status, 'Aguardando análise');
    const detalhe = await repo.buscar(os.id, clienteA);
    assert.equal(detalhe?.historico.length, 1);
  });

  it('cliente vê apenas as próprias OS', async () => {
    assert.deepEqual((await repo.listarDoCliente(clienteA)).map((o) => o.id), [osDaAna]);
    assert.equal((await repo.listarDoCliente(clienteB)).length, 0);
  });

  it('cliente B não acessa OS do cliente A, nem por número direto', async () => {
    assert.equal(await repo.buscar(osDaAna, clienteB), null);
  });

  it('conta com e-mail não verificado não lê nem cria OS', async () => {
    await falhaCom('email_nao_verificado', () => repo.listarDoCliente(naoVerificado));
    await falhaCom('email_nao_verificado', () => repo.buscar(osDaAna, naoVerificado));
    await falhaCom('email_nao_verificado', () => repo.criarPeloCliente(naoVerificado, novaOs));
  });

  it('OS de balcão cadastrada pelo admin aparece para o cliente pelo e-mail', async () => {
    const dados = NovaOsAdminSchema.parse({
      clienteNome: 'Bruno',
      clienteEmail: 'BRUNO@exemplo.test',
      telefone: '44 98888-7777',
      aparelho: 'notebook',
      marcaModelo: 'Lenovo IdeaPad 3',
      defeito: 'Tela piscando e sem imagem',
      atendimento: 'balcao',
    });
    const os = await repo.criarPeloAdmin(admin, dados);
    osDoBalcao = os.id;
    assert.deepEqual((await repo.listarDoCliente(clienteB)).map((o) => o.id), [osDoBalcao]);
    assert.equal(await repo.buscar(osDoBalcao, clienteA), null);
  });

  it('funções de admin exigem papel admin', async () => {
    const atualizacao = AtualizarOsSchema.parse({ status: 'Em Reparo', percentual: '50' });
    await falhaCom('sem_permissao', () => repo.listarTodas(clienteA));
    await falhaCom('sem_permissao', () => repo.atualizar(clienteA, osDaAna, atualizacao));
    await falhaCom('sem_permissao', () =>
      repo.criarPeloAdmin(clienteA, { ...novaOs, clienteNome: 'X', clienteEmail: 'x@exemplo.test' })
    );
    await falhaCom('sem_permissao', () => repo.listarTodas({ ...admin, emailVerified: false }));
  });

  it('admin atualiza status/valor e isso vira evento na linha do tempo', async () => {
    const dados = AtualizarOsSchema.parse({
      status: 'Em Reparo',
      percentual: '40',
      valor: 'R$ 1.280,50',
      previsaoEntrega: '2026-10-01',
      evento: 'Peça encomendada',
    });
    const os = await repo.atualizar(admin, osDaAna, dados);
    assert.equal(os.valorCentavos, 128050);
    assert.equal(os.percentual, 40);
    const eventos = (await repo.buscar(osDaAna, clienteA))!.historico.map((h) => h.evento);
    assert.ok(eventos.includes('Status alterado para: Em Reparo'));
    assert.ok(eventos.includes('Peça encomendada'));
    await falhaCom('nao_encontrada', () => repo.atualizar(admin, 'CT-0000-9999', dados));
  });

  it('busca do admin trata % e _ como texto literal', async () => {
    assert.equal((await repo.listarTodas(admin, { busca: '%' })).length, 0);
    assert.equal((await repo.listarTodas(admin, { busca: 'ideapad' })).length, 1);
  });

  it('número da OS não é truncado após 9999', async () => {
    const db = await createMigratedPgliteDb();
    const r = criarRepositorioOs(db);
    await db.execute(sql`select setval('os_seq', 9999)`);
    const ids = [(await r.criarPeloCliente(clienteA, novaOs)).id, (await r.criarPeloCliente(clienteA, novaOs)).id];
    assert.deepEqual(ids.map((id) => id.split('-')[2]), ['10000', '10001']);
  });

  it(`limita a ${LIMITE_OS_POR_DIA} OS por cliente por dia`, async () => {
    for (let i = 1; i < LIMITE_OS_POR_DIA; i++) await repo.criarPeloCliente(clienteA, novaOs);
    await falhaCom('limite_diario', () => repo.criarPeloCliente(clienteA, novaOs));
  });
});

describe('validação', () => {
  it('rejeita abertura sem consentimento LGPD e campos inválidos', () => {
    const r = NovaOsClienteSchema.safeParse({ ...novaOs, lgpd: undefined, telefone: '123', aparelho: 'geladeira' });
    assert.equal(r.success, false);
    const campos = r.error!.issues.map((i) => i.path[0]);
    assert.ok(campos.includes('lgpd') && campos.includes('telefone') && campos.includes('aparelho'));
  });

  it('rejeita status fora da lista e percentual fora de 0–100', () => {
    assert.equal(AtualizarOsSchema.safeParse({ status: 'Hackeado', percentual: '10' }).success, false);
    assert.equal(AtualizarOsSchema.safeParse({ status: 'Em Reparo', percentual: '150' }).success, false);
  });
});

describe('OS com coleta', () => {
  it('grava o endereço só quando o atendimento é coleta', async () => {
    const repo = criarRepositorioOs(await createMigratedPgliteDb());
    const cliente: Ator = { email: 'carla@exemplo.test', name: 'Carla', emailVerified: true, admin: false };
    const endereco = { cep: '87140000', logradouro: 'Rua das Flores', numero: '10', complemento: null, bairro: 'Centro', cidade: 'Paiçandu', uf: 'PR' };

    const coleta = await repo.criarPeloCliente(cliente, { ...novaOs, atendimento: 'coleta' }, endereco);
    assert.equal(coleta.cep, '87140000');
    assert.equal(coleta.cidade, 'Paiçandu');
    const detalhe = await repo.buscar(coleta.id, cliente);
    assert.match(detalhe!.historico[0].evento, /coleta por motoboy/);

    const balcao = await repo.criarPeloCliente(cliente, { ...novaOs, atendimento: 'balcao' }, endereco);
    assert.equal(balcao.cep, null, 'endereço ignorado quando não é coleta');
  });
});

describe('validação do painel admin', () => {
  const ok = (dados: Record<string, string>) => AtualizarOsSchema.safeParse({ status: 'Em Reparo', percentual: '10', ...dados }).success;
  it('recusa valor gigante e aceita até R$ 9.999.999,99', () => {
    assert.equal(ok({ valor: '9.999.999,99' }), true);
    assert.equal(ok({ valor: '99999999999999999999' }), false);
    assert.equal(ok({ valor: '1.000.000.000,00' }), false);
  });
  it('recusa datas impossíveis', () => {
    assert.equal(ok({ previsaoEntrega: '2026-10-31' }), true);
    for (const d of ['2026-02-30', '2026-13-01', '2026-99-99', '0001-01-01']) assert.equal(ok({ previsaoEntrega: d }), false, d);
  });
});

describe('limite diário sob concorrência', () => {
  it('10 envios simultâneos criam no máximo 5 OS', async () => {
    const repo = criarRepositorioOs(await createMigratedPgliteDb());
    const apressado: Ator = { email: 'rapido@exemplo.test', name: 'Rápido', emailVerified: true, admin: false };
    const r = await Promise.allSettled(Array.from({ length: 10 }, () => repo.criarPeloCliente(apressado, novaOs)));
    const ok = r.filter((x) => x.status === 'fulfilled').length;
    const limite = r.filter((x) => x.status === 'rejected' && (x.reason as ErroOs).codigo === 'limite_diario').length;
    assert.equal(ok, LIMITE_OS_POR_DIA);
    assert.equal(limite, 10 - LIMITE_OS_POR_DIA, 'os demais recebem o erro de limite, não um erro genérico');
    assert.equal((await repo.listarDoCliente(apressado)).length, LIMITE_OS_POR_DIA);
  });

  it('OS de balcão (admin) não consome a cota do cliente', async () => {
    const repo = criarRepositorioOs(await createMigratedPgliteDb());
    const admin: Ator = { email: 'admin@exemplo.test', name: 'Admin', emailVerified: true, admin: true };
    const cliente: Ator = { email: 'dora@exemplo.test', name: 'Dora', emailVerified: true, admin: false };
    for (let i = 0; i < 6; i++) await repo.criarPeloAdmin(admin, { ...novaOs, clienteNome: 'Dora', clienteEmail: 'dora@exemplo.test' });
    await repo.criarPeloCliente(cliente, novaOs);
  });
});
