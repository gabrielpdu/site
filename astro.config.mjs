import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://techcamargo.com.br',
  compressHTML: true,
  // Páginas continuam estáticas; só a área logada/admin/API rodam sob demanda
  // (`export const prerender = false`).
  adapter: vercel(),
  security: {
    // Rejeita POST/PUT/DELETE de outra origem nas rotas sob demanda (CSRF).
    checkOrigin: true,
  },
  env: {
    schema: {
      DATABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      BETTER_AUTH_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      BETTER_AUTH_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      GOOGLE_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      GOOGLE_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Lista separada por vírgula dos e-mails com acesso ao painel /admin.
      ADMIN_EMAILS: envField.string({ context: 'server', access: 'secret', default: '' }),
    },
  },
  server: {
    port: 4321
  }
});
