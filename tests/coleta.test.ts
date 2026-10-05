// Regras da coleta por motoboy e consulta de CEP (sem rede: fetch simulado).
// Uso: npm test
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { avaliarCobertura, previsaoColeta } from '../src/lib/coleta';
import { _limparCacheCep, consultarCep } from '../src/lib/cep';

// Horário de São Paulo (UTC-3) → instante absoluto.
const sp = (iso: string) => new Date(`${iso}-03:00`);

describe('previsão da coleta', () => {
  // 2026-10-05 é segunda-feira.
  const casos: [string, string, boolean, string][] = [
    ['segunda 14:59 → hoje', '2026-10-05T14:59', true, '2026-10-05'],
    ['segunda 15:00 → terça', '2026-10-05T15:00', false, '2026-10-06'],
    ['sexta 16:00 → sábado', '2026-10-09T16:00', false, '2026-10-10'],
    ['sábado 10:00 → hoje', '2026-10-10T10:00', true, '2026-10-10'],
    ['sábado 12:00 → segunda', '2026-10-10T12:00', false, '2026-10-12'],
    ['domingo → segunda', '2026-10-11T09:00', false, '2026-10-12'],
    ['virada de mês', '2026-10-31T12:00', false, '2026-11-02'],
  ];
  for (const [nome, agora, hoje, data] of casos) {
    it(nome, () => {
      const p = previsaoColeta(sp(agora));
      assert.equal(p.hoje, hoje);
      assert.equal(p.data, data);
    });
  }

  it('rótulo legível', () => {
    assert.equal(previsaoColeta(sp('2026-10-05T09:00')).rotulo, 'hoje');
    assert.equal(previsaoColeta(sp('2026-10-05T18:00')).rotulo, 'ter, 06/10');
  });

  it('usa o fuso de São Paulo mesmo com servidor em UTC', () => {
    // 2026-10-05 17:30 UTC = 14:30 em SP → ainda dá para hoje.
    assert.equal(previsaoColeta(new Date('2026-10-05T17:30:00Z')).hoje, true);
  });
});

describe('cobertura', () => {
  it('Paiçandu é atendido e grátis', () => {
    const c = avaliarCobertura({ ibge: '4117503' }, sp('2026-10-05T10:00'));
    assert.equal(c.atendido, true);
    assert.equal(c.atendido && c.taxaCentavos, 0);
  });

  it('Maringá não é atendido', () => {
    assert.deepEqual(avaliarCobertura({ ibge: '4115200' }), { atendido: false });
  });
});

describe('consulta de CEP', () => {
  beforeEach(() => _limparCacheCep());

  const resposta = (status: number, body?: unknown) =>
    new Response(body === undefined ? null : JSON.stringify(body), { status });

  const VIACEP_IVAI = {
    cep: '87140-970', logradouro: 'Avenida Ivaí', bairro: 'Central',
    localidade: 'Paiçandu', uf: 'PR', ibge: '4117503',
  };

  it('normaliza a resposta do ViaCEP', async () => {
    const r = await consultarCep('87140-970', async () => resposta(200, VIACEP_IVAI));
    assert.deepEqual(r, {
      status: 'ok',
      endereco: { cep: '87140970', logradouro: 'Avenida Ivaí', bairro: 'Central', cidade: 'Paiçandu', uf: 'PR', ibge: '4117503' },
    });
  });

  it('formato inválido não chama a rede', async () => {
    let chamadas = 0;
    const r = await consultarCep('1234', async () => (chamadas++, resposta(200, {})));
    assert.equal(r.status, 'invalido');
    assert.equal(chamadas, 0);
  });

  it('CEP inexistente no ViaCEP não consulta a BrasilAPI', async () => {
    const urls: string[] = [];
    const r = await consultarCep('99999999', async (u) => (urls.push(String(u)), resposta(200, { erro: 'true' })));
    assert.equal(r.status, 'nao_encontrado');
    assert.equal(urls.length, 1);
  });

  it('ViaCEP fora do ar → usa BrasilAPI', async () => {
    const r = await consultarCep('87140970', async (u) =>
      String(u).includes('viacep')
        ? resposta(503)
        : resposta(200, { street: 'Avenida Ivaí', neighborhood: 'Centro', city: 'Paiçandu', state: 'PR', ibge: { city: '4117503' } })
    );
    assert.equal(r.status, 'ok');
    assert.equal(r.status === 'ok' && r.endereco.ibge, '4117503');
  });

  it('timeout/erro de rede nos dois → indisponível, sem cache', async () => {
    let chamadas = 0;
    const falha = async () => { chamadas++; throw new TypeError('fetch failed'); };
    assert.equal((await consultarCep('87140970', falha)).status, 'indisponivel');
    assert.equal((await consultarCep('87140970', falha)).status, 'indisponivel');
    assert.equal(chamadas, 4, 'falhas não ficam em cache');
  });

  it('resultado bom fica em cache', async () => {
    let chamadas = 0;
    const f = async () => (chamadas++, resposta(200, VIACEP_IVAI));
    await consultarCep('87140970', f);
    await consultarCep('87140-970', f);
    assert.equal(chamadas, 1);
  });
});

describe('endereço de coleta na OS', async () => {
  const { resolverEnderecoColeta } = await import('../src/lib/endereco-coleta');
  const { NovaOsClienteSchema } = await import('../src/scripts/validation');
  const { destinoAposLogin } = await import('../src/lib/voltar');

  beforeEach(() => _limparCacheCep());

  const viaCep = (body: unknown) => async () => new Response(JSON.stringify(body), { status: 200 });
  const PAICANDU = { logradouro: '', bairro: '', localidade: 'Paiçandu', uf: 'PR', ibge: '4117503' };
  const MARINGA = { logradouro: 'Avenida Cerro Azul', bairro: 'Zona 02', localidade: 'Maringá', uf: 'PR', ibge: '4115200' };
  const base = {
    telefone: '(44) 99999-0000', aparelho: 'celular', marcaModelo: 'Moto G84',
    defeito: 'Não carrega mais a bateria', lgpd: 'on',
  };

  it('coleta exige CEP, rua, número e bairro', () => {
    const r = NovaOsClienteSchema.safeParse({ ...base, atendimento: 'coleta' });
    assert.equal(r.success, false);
    const campos = r.error!.issues.map((i) => i.path[0]).sort();
    assert.deepEqual(campos, ['bairro', 'cep', 'logradouro', 'numero']);
  });

  it('balcão não exige endereço', () => {
    assert.equal(NovaOsClienteSchema.safeParse({ ...base, atendimento: 'balcao' }).success, true);
  });

  it('CEP com máscara é normalizado', () => {
    const r = NovaOsClienteSchema.parse({ ...base, atendimento: 'coleta', cep: '87140-000', logradouro: 'Rua A', numero: '10', bairro: 'Centro' });
    assert.equal(r.cep, '87140000');
  });

  const dados = { cep: '87140000', logradouro: 'Rua das Flores', numero: '10', complemento: '', bairro: 'Centro' };

  it('cliente em Paiçandu: aceito, cidade/UF vêm do CEP', async () => {
    const r = await resolverEnderecoColeta(dados, { exigirCobertura: true, fetchImpl: viaCep(PAICANDU) });
    assert.deepEqual(r, {
      ok: true,
      endereco: { cep: '87140000', logradouro: 'Rua das Flores', numero: '10', complemento: null, bairro: 'Centro', cidade: 'Paiçandu', uf: 'PR' },
    });
  });

  it('cliente fora da área: recusado no servidor', async () => {
    const r = await resolverEnderecoColeta({ ...dados, cep: '87010000' }, { exigirCobertura: true, fetchImpl: viaCep(MARINGA) });
    assert.equal(r.ok, false);
    assert.match(!r.ok ? r.mensagem : '', /Paiçandu/);
  });

  it('equipe pode registrar coleta fora da área', async () => {
    const r = await resolverEnderecoColeta({ ...dados, cep: '87010000' }, { exigirCobertura: false, fetchImpl: viaCep(MARINGA) });
    assert.equal(r.ok && r.endereco.cidade, 'Maringá');
  });

  it('CEP inexistente é recusado para todos', async () => {
    const r = await resolverEnderecoColeta({ ...dados, cep: '99999999' }, { exigirCobertura: false, fetchImpl: viaCep({ erro: 'true' }) });
    assert.equal(r.ok, false);
  });

  it('serviço de CEP fora: cliente recusado, equipe aceita sem cidade', async () => {
    const fora = async () => { throw new TypeError('fetch failed'); };
    assert.equal((await resolverEnderecoColeta(dados, { exigirCobertura: true, fetchImpl: fora })).ok, false);
    const equipe = await resolverEnderecoColeta(dados, { exigirCobertura: false, fetchImpl: fora });
    assert.equal(equipe.ok && equipe.endereco.cidade, null);
  });

  it('voltar após login só aceita caminhos da Área do Cliente', () => {
    assert.equal(destinoAposLogin('/area-cliente/nova?atendimento=coleta&cep=87140000'), '/area-cliente/nova?atendimento=coleta&cep=87140000');
    for (const ruim of ['//evil.com', 'https://evil.com', '/area-cliente/../admin', '/admin', '/area-cliente//evil.com', '/area-clienteX', null]) {
      assert.equal(destinoAposLogin(ruim), '/area-cliente', String(ruim));
    }
  });
});

describe('proteções do /api/cep', async () => {
  const { permitirConsulta, _tamanhoCacheCep } = await import('../src/lib/cep');

  beforeEach(() => _limparCacheCep());

  it('limita consultas por visitante a 20/min', () => {
    const t = 1_000_000;
    for (let i = 0; i < 20; i++) assert.equal(permitirConsulta('1.2.3.4', t + i), true);
    assert.equal(permitirConsulta('1.2.3.4', t + 30), false);
    assert.equal(permitirConsulta('5.6.7.8', t + 30), true, 'outro visitante não é afetado');
    assert.equal(permitirConsulta('1.2.3.4', t + 60_001), true, 'libera após a janela');
  });

  it('encher a tabela de visitantes não libera quem já estourou o limite', () => {
    const t = 2_000_000;
    for (let i = 0; i < 21; i++) permitirConsulta('9.9.9.9', t);
    assert.equal(permitirConsulta('9.9.9.9', t + 1), false);
    for (let i = 0; i < 4999; i++) permitirConsulta(`10.0.${Math.floor(i / 256)}.${i % 256}`, t + 2);
    assert.equal(permitirConsulta('9.9.9.9', t + 3), false, 'continua bloqueado');
  });

  it('IPv6 conta por rede /64', () => {
    const t = 3_000_000;
    for (let i = 0; i < 20; i++) assert.equal(permitirConsulta(`2001:db8:1:2::${i.toString(16)}`, t), true);
    assert.equal(permitirConsulta('2001:db8:1:2::ffff', t), false, 'outro endereço da mesma /64');
    assert.equal(permitirConsulta('2001:db8:1:3::1', t), true, 'outra /64');
  });

  it('cache de CEP tem tamanho máximo', async () => {
    const f = async () => new Response(JSON.stringify({ erro: 'true' }), { status: 200 });
    for (let i = 0; i < 2100; i++) await consultarCep(String(10000000 + i), f);
    assert.equal(_tamanhoCacheCep(), 2000);
  });

});
