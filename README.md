# 🛠️ CamargoTech — Assistência Técnica Especializada

Site institucional e comercial de alta performance para a assistência técnica **CamargoTech**, especializada em celulares, notebooks, PCs e eletrônicos.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/gabrielpdu/site)

Desenvolvido com foco em **performance radical, segurança por padrão e acessibilidade universal (WCAG AA)**, atendendo rigorosamente às especificações do [camargotech-prompt.md.md](camargotech-prompt.md.md).

---

## 🚀 Tecnologias

- **Framework:** [Astro](https://astro.build) (Static HTML, islands architecture, zero runtime JS desnecessário)
- **Engine / Build:** Vite integrado
- **Linguagem:** TypeScript
- **Interatividade:** Alpine.js (~15 KB)
- **Validação de Schemas:** Zod
- **Estilos:** Vanilla CSS com Design Tokens e variáveis customizadas (`tokens.css`, `base.css`, `utilities.css`)
- **PWA:** Manifest Web + Service Worker com suporte offline básico
- **SEO & Acessibilidade:** Schema.org JSON-LD (`LocalBusiness`), skip-to-content, tags ARIA, contraste WCAG AA, suporte a `prefers-reduced-motion` e modo claro/escuro nativo.

---

## 📦 Como Executar Localmente

### 1. Pré-requisitos
- **Node.js** v18+ (testado e homologado no Node.js v24.11+)
- **NPM** v10+

### 2. Instalação das Dependências
```bash
npm install
```

### 3. Variáveis de ambiente
Copie `.env.example` para `.env.local` e preencha. Para desenvolvimento, `DATABASE_URL=.data/pglite`
usa um Postgres embutido (PGlite), sem criar conta em nenhum serviço.

### 4. Banco local e dados de exemplo
```bash
npm run db:seed
```
Cria clientes/OS fictícios. Para testar logado **sem** Google, gere uma sessão de teste e cole o
cookie impresso no navegador (DevTools → Application → Cookies):
```bash
npm run db:seed -- --sessao cliente.a@camargotech.test
```
(Usuários de teste: `cliente.a@…`, `cliente.b@…`, `admin@camargotech.test`. Pare o `npm run dev` antes de rodar o seed: o PGlite aceita um processo por vez.)

### 5. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
O servidor será iniciado na porta local:
👉 **http://localhost:4321**

### 6. Testes, tipos e build
```bash
npm test
npm run check
npm run build
```

---

## 👤 Área do Cliente (login Google + ordens de serviço)

- **Login:** [Better Auth](https://better-auth.com) com Google (OAuth 2.0/OIDC com `state` + PKCE). Sessão em cookie `HttpOnly`/`Secure`/`SameSite=Lax`; nenhum token no `localStorage`.
- **Banco:** Postgres (Neon em produção, PGlite no dev) via Drizzle ORM. Schema em `src/lib/db/schema.ts`, migrações em `drizzle/`.
- **Autorização:** toda regra fica em `src/lib/os.ts`. O cliente só vê OS cujo `cliente_email` é o **e-mail verificado** da conta Google; OS de outra pessoa retorna 404. Admin = e-mails em `ADMIN_EMAILS`.
- **Vínculo balcão → site:** no `/admin/nova`, cadastre a OS com o Gmail do cliente; ela aparece automaticamente quando ele entrar.
- **Proteções:** checagem de `Origin` (CSRF) nos formulários, validação Zod no servidor, limite de 5 OS/24h por cliente, rate limit do login, `Cache-Control: private, no-store` e service worker sem cache nas rotas privadas.
- **Rotas:** `/area-cliente` (login/lista), `/area-cliente/nova`, `/area-cliente/os/[id]`, `/admin`, `/admin/nova`, `/admin/os/[id]`, `/api/auth/*`. As demais páginas continuam estáticas.

### Configuração em produção (feita pelo dono do projeto)

1. **Google Cloud Console** → *APIs e serviços*:
   - *Tela de consentimento OAuth*: tipo **Externo**, nome "CamargoTech", logo, e-mail de suporte, domínio `techcamargo.com.br`, links da política de privacidade e termos. Escopos: `openid`, `email`, `profile` (não exigem verificação do Google). Publique o app ("Em produção").
   - *Credenciais → Criar ID do cliente OAuth → Aplicativo da Web*:
     - Origens JavaScript: `https://techcamargo.com.br` (e `http://localhost:4321` para dev)
     - URIs de redirecionamento: `https://techcamargo.com.br/api/auth/callback/google` e `http://localhost:4321/api/auth/callback/google`
2. **Vercel** → projeto → *Storage* → **Create Database → Neon (Postgres)** e conecte ao projeto (cria `DATABASE_URL`).
3. **Vercel → Settings → Environment Variables** (Production e Preview):
   `BETTER_AUTH_SECRET` (gere com `openssl rand -base64 32`), `BETTER_AUTH_URL=https://techcamargo.com.br`,
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS=seu@gmail.com,outro@gmail.com`.
4. Aplique as migrações no Neon (uma vez, e a cada nova migração):
   ```bash
   npx vercel env pull .env.production.local
   ```
   ```bash
   node --env-file=.env.production.local --import tsx scripts/migrate.ts
   ```
5. Faça o deploy e teste: entrar com Google → abrir OS → ver no `/admin`.

---

## 🎨 Paleta de Cores e Identidade Visual

- **Azul Escuro:** `#0A1929`
- **Azul Principal:** `#1E6FBF`
- **Laranja Destaque:** `#FF6B1A`
- **Verde Sucesso:** `#14B87A`
- **Tipografia:** Inter (Google Fonts)

---

## 🔐 Segurança e LGPD

- **Sanitização estrita:** Nenhum input do usuário é inserido diretamente com `innerHTML`.
- **Validação Dupla:** Schemas Zod em `src/scripts/validation.ts`.
- **Privacidade LGPD:** Banner de consentimento com persistência local e página formal de Política de Privacidade.
- **Ordens de serviço:** acesso autenticado (Google) e autorizado no servidor — veja "Área do Cliente".

---

## 📄 Páginas Disponíveis

- `/` — Página Principal com Hero, Serviços, Linha do tempo "Como Funciona", Depoimentos, Formulário, FAQ e Mapa
- `/servicos` — Tabela completa de 8 serviços, prazos, faixas de preço e modais detalhados
- `/sobre` — História da empresa, certificações de bancada e padrões de laboratório
- `/contato` — Formulário de orçamento com simulação de CEP (ViaCEP) e integração direta com WhatsApp
- `/area-cliente` — Login com Google; o cliente acompanha e abre as próprias Ordens de Serviço (OS)
- `/admin` — Painel da equipe: cadastrar OS de balcão e atualizar status, laudo, valor e linha do tempo
- `/politica-privacidade` — Termos de conformidade com a LGPD
- `/termos` — Condições de serviço e garantia legal de 90 dias
