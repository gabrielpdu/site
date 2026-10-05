// Aplica as migrações SQL de ./drizzle no banco de DATABASE_URL.
// Uso: npm run db:migrate   (em produção: DATABASE_URL do Neon no ambiente)
//
// Com --somente-producao (usado no build da Vercel):
// - production: sempre migra (idempotente; migrações já aplicadas são ignoradas);
// - preview: previews usam o MESMO banco da produção, então só migra se todas as
//   migrações forem aditivas (criar tabela/índice, adicionar coluna). Assim o
//   preview de um PR que adiciona colunas funciona, sem nunca aplicar algo que
//   quebre o código que está no ar (DROP, RENAME, mudança de tipo...).
import { migrate as migrateNeon } from 'drizzle-orm/neon-http/migrator';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { MIGRATIONS_FOLDER, createMigratedPgliteDb, createNeonDb, isPostgresUrl } from '../src/lib/db/client';
import { migracoesDestrutivas } from '../src/lib/db/migracoes';

const url = process.env.DATABASE_URL;
const env = process.env.VERCEL_ENV;

function deveMigrar(): boolean {
  if (!process.argv.includes('--somente-producao') || env === 'production') return true;
  if (env === 'preview') {
    const destrutivas = migracoesDestrutivas(MIGRATIONS_FOLDER);
    if (destrutivas.length === 0) return true;
    console.log(`Migração ignorada no preview: alterações não aditivas em ${destrutivas.join(', ')}.`);
    return false;
  }
  console.log(`Migração ignorada (VERCEL_ENV=${env ?? 'local'}).`);
  return false;
}

if (!deveMigrar()) {
  // nada a fazer
} else if (isPostgresUrl(url)) {
  const db = createNeonDb(url) as unknown as NeonHttpDatabase;
  await migrateNeon(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log(`Migrações aplicadas no Postgres (Neon)${env ? ` [${env}]` : ''}.`);
} else if (env === 'production' || env === 'preview') {
  // Nunca "migrar" um banco embutido na Vercel: falha o build.
  console.error('DATABASE_URL do Postgres ausente.');
  process.exit(1);
} else {
  await createMigratedPgliteDb(url);
  console.log(`Migrações aplicadas no PGlite local (${url || 'memória'}).`);
}
