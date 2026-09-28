import { db } from './db';
import { isAdmin } from './auth';
import { criarRepositorioOs, type Ator } from './os';

export const repoOs = criarRepositorioOs(db);

/** Converte o usuário da sessão (Astro.locals.user) no "ator" usado pelas regras de OS. */
export function atorDe(user: App.Locals['user']): Ator | null {
  if (!user) return null;
  return {
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    admin: isAdmin(user),
  };
}
