// Regras de acesso às OS, contra um Postgres real em memória (PGlite).
// Uso: npm test
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
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

  it(`limita a ${LIMITE_OS_POR_DIA} OS por cliente em 24h`, async () => {
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
