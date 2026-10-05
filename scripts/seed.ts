// Popula o banco LOCAL (PGlite) com dados fictícios para desenvolvimento.
// Recusa rodar contra Postgres real para não misturar dados de teste com produção.
//
// Uso: npm run db:seed
// Com --sessao <email>: cria também uma sessão de teste para esse usuário e
// imprime o cookie para colar no navegador (substitui o login Google no dev).
import { createHmac, randomBytes } from 'node:crypto';
import { createMigratedPgliteDb, isPostgresUrl } from '../src/lib/db/client';
import { historicoOs, ordensServico, session, user } from '../src/lib/db/schema';

const url = process.env.DATABASE_URL;
if (isPostgresUrl(url)) {
  console.error('Seed é apenas para o banco local (PGlite). Abortado.');
  process.exit(1);
}

const db = await createMigratedPgliteDb(url);

const usuarios = [
  { id: 'dev-cliente-a', name: 'Cliente Exemplo A', email: 'cliente.a@camargotech.test' },
  { id: 'dev-cliente-b', name: 'Cliente Exemplo B', email: 'cliente.b@camargotech.test' },
  { id: 'dev-admin', name: 'Admin CamargoTech', email: 'admin@camargotech.test' },
];

await db
  .insert(user)
  .values(usuarios.map((u) => ({ ...u, emailVerified: true })))
  .onConflictDoNothing();

const existentes = await db.select({ id: ordensServico.id }).from(ordensServico).limit(1);
if (existentes.length === 0) {
  const [a] = await db
    .insert(ordensServico)
    .values({
      clienteEmail: 'cliente.a@camargotech.test',
      clienteNome: 'Cliente Exemplo A',
      telefone: '(44) 99999-0001',
      aparelho: 'notebook',
      marcaModelo: 'Notebook Dell Inspiron 15',
      defeito: 'Superaquecimento, desligamento repentino e lentidão no boot',
      status: 'Em Reparo',
      percentual: 65,
      tecnico: 'Eng. Lucas Camargo',
      laudo:
        'Identificado acúmulo severo de poeira e ressecamento total da pasta térmica original. Executada limpeza dos coolers e aplicação de pasta térmica de prata. Upgrade para SSD NVMe 512GB com clonagem do Windows.',
      valorCentavos: 28000,
      previsaoEntrega: new Date(Date.now() + 2 * 86400000),
      criadoPor: 'admin',
    })
    .returning();

  const [b] = await db
    .insert(ordensServico)
    .values({
      clienteEmail: 'cliente.b@camargotech.test',
      clienteNome: 'Cliente Exemplo B',
      telefone: '(44) 99999-0002',
      aparelho: 'celular',
      marcaModelo: 'Samsung Galaxy S22',
      defeito: 'Tela frontal estilhaçada sem imagem após queda',
      status: 'Pronto para Retirada',
      percentual: 100,
      tecnico: 'Técnica Fabiana Ramos',
      laudo: 'Substituição completa do módulo display AMOLED original com aro e vedação.',
      valorCentavos: 49000,
      criadoPor: 'admin',
    })
    .returning();

  await db.insert(historicoOs).values([
    { osId: a.id, evento: 'Equipamento recebido e OS gerada.' },
    { osId: a.id, evento: 'Diagnóstico de bancada concluído e orçamento emitido.' },
    { osId: a.id, evento: 'Orçamento aprovado pelo cliente via WhatsApp.' },
    { osId: b.id, evento: 'Aparelho recebido para troca de tela.' },
    { osId: b.id, evento: 'Testes de toque e biometria aprovados. Pronto para entrega.' },
  ]);
  console.log(`OS de exemplo criadas: ${a.id} (cliente A), ${b.id} (cliente B).`);
} else {
  console.log('Já existem OS no banco local; nada a inserir.');
}

const idx = process.argv.indexOf('--sessao');
if (idx !== -1) {
  const email = process.argv[idx + 1];
  const alvo = usuarios.find((u) => u.email === email);
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!alvo || !secret) {
    console.error('Informe um e-mail de teste válido e defina BETTER_AUTH_SECRET.');
    process.exit(1);
  }
  const token = randomBytes(24).toString('base64url');
  await db.insert(session).values({
    id: `dev-${token.slice(0, 8)}`,
    token,
    userId: alvo.id,
    expiresAt: new Date(Date.now() + 86400000),
  });
  // Mesmo formato de cookie assinado usado pelo Better Auth (HMAC-SHA256).
  const assinatura = createHmac('sha256', secret).update(token).digest('base64');
  console.log(`Cookie de teste (${email}):`);
  console.log(`better-auth.session_token=${encodeURIComponent(`${token}.${assinatura}`)}`);
}

// Fecha o PGlite corretamente (senão o Postgres "pula" números da sequência de OS).
await (db as unknown as { $client: { close(): Promise<void> } }).$client.close();
