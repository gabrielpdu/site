import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Instruções que podem quebrar o código em produção ("ON DELETE cascade" de FK não conta). */
const DESTRUTIVO = /\bDROP\b|\bRENAME\b|\bTRUNCATE\b|(?<!\bON )\bDELETE\b|\bALTER\s+COLUMN\b/i;

export function sqlDestrutivo(sql: string): boolean {
  return DESTRUTIVO.test(sql);
}

/** Arquivos de migração com alterações não aditivas. */
export function migracoesDestrutivas(pasta: string): string[] {
  return readdirSync(pasta)
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => sqlDestrutivo(readFileSync(join(pasta, f), 'utf8')));
}
