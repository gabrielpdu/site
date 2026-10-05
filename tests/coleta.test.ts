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
