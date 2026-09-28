import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
  ADMIN_EMAILS,
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} from 'astro:env/server';
import { db } from './db';
import * as schema from './db/schema';

export const googleConfigurado = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      rateLimit: schema.rateLimit,
    },
  }),
  // Somente login social. Nada de senha armazenada no site.
  emailAndPassword: { enabled: false },
  socialProviders: googleConfigurado
    ? {
        google: {
          clientId: GOOGLE_CLIENT_ID!,
          clientSecret: GOOGLE_CLIENT_SECRET!,
          // Deixa o cliente escolher a conta (útil em computador compartilhado).
          prompt: 'select_account',
        },
      }
    : {},
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 dias
    updateAge: 60 * 60 * 24, // renova no máximo 1x por dia
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 30,
  },
  telemetry: { enabled: false },
});

export type SessaoUsuario = typeof auth.$Infer.Session.user;

const admins = ADMIN_EMAILS.split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Admin = e-mail verificado presente em ADMIN_EMAILS. */
export function isAdmin(user: Pick<SessaoUsuario, 'email' | 'emailVerified'> | null | undefined): boolean {
  return Boolean(user && user.emailVerified && admins.includes(user.email.toLowerCase()));
}
