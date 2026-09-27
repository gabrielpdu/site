# 🛠️ PROMPT MESTRE — Gerar Site "CamargoTech" (Assistência Técnica)

Você é um engenheiro full-stack sênior especializado em **performance web, segurança e acessibilidade**. Sua tarefa é gerar o projeto **completo, funcional e pronto para produção** do site institucional/comercial da empresa **CamargoTech**, uma assistência técnica especializada em celulares, notebooks, PCs e eletrônicos.

Entregue **todo o código**, sem placeholders vagos, seguindo rigorosamente as especificações abaixo.

---

## 🏷️ IDENTIDADE DA MARCA

- **Nome:** CamargoTech
- **Slogan:** "Tecnologia consertada com confiança"
- **Domínio:** techcamargo.com.br
- **E-mail:** techcamargo@techcamargo.com.br
- **WhatsApp:** botão flutuante com link `https://wa.me/5544988424935` (DDD 44)
- **Cores:**
  - Azul escuro `#0A1929` / Azul `#1E6FBF`
  - Laranja destaque `#FF6B1A`
  - Verde sucesso `#14B87A`
- **Tipografia:** Inter (variable font, WOFF2, self-hosted)
- **Logo:** textual "Camargo" (azul/branco) + "Tech" (laranja)

Use **"CamargoTech"** em TODOS os títulos, metatags, JSON-LD, rodapé, alt text e textos visíveis.

---

## 🧱 STACK OBRIGATÓRIA

### Frontend
- **Astro** (HTML estático, zero JS por padrão, islands architecture)
- **Vite** (build otimizado)
- **TypeScript** (type-safe)
- **Alpine.js** (~15 KB, interatividade leve)
- **HTMX** (~14 KB, se necessário)
- **UnoCSS** ou **Tailwind JIT** (gera só o CSS usado)
- **Zod** (validação compartilhada)
- **Web Components nativos** para carrossel e modais
- **SVG sprite inline** para ícones (zero requests extras)

### Backend (opcional, mas documentado)
- **Bun + Elysia** ou **Node.js + Fastify**
- **Drizzle ORM** + **SQLite** (dev) / **PostgreSQL** (prod)
- **JWT** com `jose` (cookies `httpOnly`, `Secure`, `SameSite=Strict`)
- **Argon2id** para hash de senhas
- **Zod** para validação server-side

### Deploy
- **Cloudflare Pages/Workers** (recomendado)
- Alternativas: Vercel, Netlify

---

## 📁 ESTRUTURA DE ARQUIVOS

```
camargotech/
├── src/
│   ├── layouts/BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── sobre.astro
│   │   ├── servicos.astro
│   │   ├── contato.astro
│   │   ├── area-cliente.astro
│   │   ├── politica-privacidade.astro
│   │   └── termos.astro
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── Hero.astro
│   │   ├── ServiceCard.astro
│   │   ├── ServiceModal.astro
│   │   ├── HowItWorks.astro
│   │   ├── Testimonials.astro
│   │   ├── ContactForm.astro
│   │   ├── FAQ.astro
│   │   ├── Map.astro
│   │   ├── CookieBanner.astro
│   │   ├── WhatsAppButton.astro
│   │   ├── ReadingProgress.astro
│   │   └── Toast.astro
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── base.css
│   │   └── utilities.css
│   ├── scripts/
│   │   ├── theme.ts
│   │   ├── validation.ts
│   │   ├── auth.ts
│   │   ├── api.ts
│   │   ├── viacep.ts
│   │   └── security.ts
│   └── assets/
│       ├── img/  (AVIF + WebP)
│       ├── icons/ (SVG sprite)
│       └── fonts/ (WOFF2 subset)
├── public/
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── manifest.webmanifest
│   ├── sw.js
│   └── favicon.ico
├── astro.config.mjs
├── vite.config.ts
├── tsconfig.json
├── package.json
├── .env.example
└── README.md
```

---

## 🎨 DESIGN SYSTEM

### Design Tokens (`src/styles/tokens.css`)

```css
:root {
  /* Cores */
  --ct-blue-900: #0A1929;
  --ct-blue-700: #123A5C;
  --ct-blue-500: #1E6FBF;
  --ct-blue-300: #5CA8E8;
  --ct-orange-500: #FF6B1A;
  --ct-orange-400: #FF8A47;
  --ct-green-500: #14B87A;
  --ct-white: #FFFFFF;
  --ct-gray-100: #F4F6F8;
  --ct-gray-300: #D5DBE0;
  --ct-gray-500: #6B7785;
  --ct-gray-900: #1A2027;
  --ct-success: #14B87A;
  --ct-error: #E63946;
  --ct-warning: #FFB800;

  /* Espaçamento */
  --ct-space-xs: 0.25rem;
  --ct-space-sm: 0.5rem;
  --ct-space-md: 1rem;
  --ct-space-lg: 2rem;
  --ct-space-xl: 4rem;

  /* Tipografia fluida */
  --ct-font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --ct-font-mono: 'JetBrains Mono', ui-monospace, monospace;
  --ct-h1: clamp(1.75rem, 4vw + 1rem, 3rem);
  --ct-h2: clamp(1.5rem, 2.5vw + 0.5rem, 2.25rem);
  --ct-body: clamp(1rem, 1vw + 0.75rem, 1.125rem);

  /* Sombras e raios */
  --ct-shadow-sm: 0 1px 2px rgba(10,25,41,.06);
  --ct-shadow-md: 0 4px 12px rgba(10,25,41,.10);
  --ct-shadow-lg: 0 12px 32px rgba(10,25,41,.16);
  --ct-radius-sm: 6px;
  --ct-radius-md: 12px;
  --ct-radius-lg: 20px;
  --ct-radius-full: 9999px;
}

[data-theme="dark"] {
  --ct-white: #0F1419;
  --ct-gray-100: #1A2027;
  --ct-gray-900: #F4F6F8;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- Mobile-first, responsivo (breakpoints: 480px, 768px, 1024px, 1440px)
- Acessibilidade WCAG AA (contraste ≥ 4.5:1)
- Foco visível (`:focus-visible`)
- Suporte a `prefers-color-scheme` e `prefers-reduced-motion`

---

## 🧩 SEÇÕES E PÁGINAS

### 1. Header
- Logo CamargoTech (SVG inline)
- Menu responsivo (hambúrguer no mobile, `<dialog>` nativo)
- Links: Início, Serviços, Sobre, Depoimentos, Contato, Área do Cliente
- CTA "Solicitar Orçamento"
- Toggle dark/light mode com `localStorage`

### 2. Hero
- Título: "CamargoTech — Assistência Técnica Especializada"
- Subtítulo sobre agilidade, garantia e confiança
- CTAs: "Solicitar Orçamento" + "Fale no WhatsApp"
- Imagem de fundo (AVIF + WebP + fallback)
- Contadores animados (clientes atendidos, anos de experiência, avaliação média)

### 3. Serviços (grid de cards)
| Serviço | Prazo | Faixa |
|---------|-------|-------|
| Conserto de Celulares | 1-3 dias | R$ 80 – R$ 900 |
| Conserto de Notebooks/PCs | 2-5 dias | R$ 120 – R$ 1500 |
| Formatação e Instalação | 1 dia | R$ 80 – R$ 200 |
| Recuperação de Dados | 2-7 dias | R$ 200 – R$ 2000 |
| Troca de Tela/Bateria | 1-2 dias | R$ 150 – R$ 1200 |
| Manutenção Preventiva | 1 dia | R$ 100 – R$ 300 |
| Instalação de Redes | 1-2 dias | R$ 200 – R$ 800 |
| Venda de Acessórios | Imediato | Sob consulta |

Cada card abre `<dialog>` acessível com detalhes.

### 4. Como Funciona
Timeline: Diagnóstico → Orçamento → Aprovação → Conserto → Entrega (animada com `IntersectionObserver`).

### 5. Sobre a CamargoTech
História, missão, visão, valores, certificações, garantia de 90 dias, equipe.

### 6. Depoimentos
Carrossel via Web Component nativo, autoplay com pausa no hover, estrelas, setas e dots acessíveis.

### 7. Formulário de Contato / Orçamento
Campos: Nome, E-mail, Telefone (máscara), Tipo de aparelho, Descrição, Anexo opcional (máx 5 MB), Checkbox LGPD.
Validação client (Zod) + server. Feedback com `aria-live="polite"`.

### 8. Área do Cliente
Login/Registro com JWT em cookie `httpOnly`. Dashboard com status do reparo, histórico de serviços, logout automático após 30 min.

### 9. FAQ
Acordeão nativo com `<details>` + `<summary>` (zero JS).

### 10. Localização
Mapa com lazy load (iframe só carrega ao clicar). Endereço, telefone, e-mail, horário.

### 11. Footer
Nome CamargoTech, links úteis, redes sociais, newsletter, políticas (Privacidade, Termos, LGPD), ano dinâmico, "© CamargoTech — Todos os direitos reservados."

---

## ⚙️ FUNCIONALIDADES OBRIGATÓRIAS

- Menu responsivo (`<dialog>` + Alpine.js)
- Dark/light mode com persistência
- Scroll suave + `scroll-margin-top`
- Animações com `IntersectionObserver` e View Transitions API
- Validação com Zod + HTML5
- Máscaras (IMask.js ou regex pura)
- Modais nativos (`<dialog>`)
- Carrossel Web Component
- FAQ com `<details>`
- Botão "voltar ao topo"
- Contadores animados
- Lazy loading (`loading="lazy"`, `decoding="async"`)
- Login seguro com Argon2id (backend)
- Botão flutuante WhatsApp
- Barra de progresso de leitura (CSS `scroll-timeline`)
- Toasts via Popover API
- Integração ViaCEP com cache
- PWA (Service Worker + manifest)

---

## 🔐 SEGURANÇA (OBRIGATÓRIO)

### Frontend
1. **Validação dupla:** client (Zod) + server
2. **Sanitização:** usar `textContent` em vez de `innerHTML`; DOMPurify se HTML for inevitável
3. **CSP restritiva** (meta + header):
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self' https://viacep.com.br;
frame-src https://www.google.com https://www.openstreetmap.org;
upgrade-insecure-requests
```
4. **SRI** em qualquer CDN externo
5. **HTTPS obrigatório** (HSTS + redirect 301)
6. **Headers de segurança:**
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: geolocation=(), camera=(), microphone=()`
7. **CSRF:** token duplo (cookie + header) em POSTs
8. **Rate limiting:** cliente (debounce) + Cloudflare WAF
9. **CAPTCHA:** Cloudflare Turnstile (invisível, sem cookies)
10. **Nada sensível em `localStorage`** — apenas preferências (tema, idioma)
11. **JWT em cookie `httpOnly`, `Secure`, `SameSite=Strict`**
12. **Hash de senha com Argon2id** (nunca SHA puro)
13. **Links externos:** `rel="noopener noreferrer"`
14. **Sessão expira** após 30 min de inatividade
15. **Logs de auditoria** para ações críticas

### LGPD
- Banner de cookies (aceitar / rejeitar / gerenciar)
- Página de Política de Privacidade
- Consentimento explícito no formulário
- Direito ao esquecimento (exclusão de dados)

---

## 🚀 PERFORMANCE (METAS)

| Métrica | Meta |
|---------|------|
| LCP | < 1,5 s |
| CLS | < 0,05 |
| INP | < 100 ms |
| JS inicial | < 30 KB (gzip) |
| CSS total | < 20 KB (gzip) |
| Peso home | < 300 KB |
| Lighthouse | ≥ 98 em todas categorias |

Técnicas: HTML estático (Astro), zero JS por padrão, CSS crítico inline, imagens AVIF/WebP com `srcset`, fontes self-hosted WOFF2 com `font-display: swap`, `preconnect`/`preload` só para críticos, cache imutável, Service Worker, CDN edge.

---

## 🔍 SEO

Metatags:
```html
<title>CamargoTech | Assistência Técnica de Celulares e Computadores</title>
<meta name="description" content="CamargoTech — conserto de celulares, notebooks e PCs com garantia, agilidade e confiança." />
<meta property="og:title" content="CamargoTech | Assistência Técnica Especializada" />
<meta property="og:description" content="Conserto de celulares, notebooks e PCs com garantia e agilidade." />
<meta property="og:image" content="/og-image.png" />
<meta property="og:url" content="https://techcamargo.com.br" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="canonical" href="https://techcamargo.com.br" />
```

JSON-LD (`LocalBusiness`):
```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "CamargoTech",
  "image": "https://techcamargo.com.br/og-image.png",
  "url": "https://techcamargo.com.br",
  "telephone": "+55-44-98842-4935",
  "email": "techcamargo@techcamargo.com.br",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Rua Exemplo, 123",
    "addressLocality": "Cidade",
    "addressRegion": "UF",
    "postalCode": "00000-000",
    "addressCountry": "BR"
  },
  "openingHoursSpecification": [{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
    "opens": "09:00",
    "closes": "18:00"
  }],
  "priceRange": "$$",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "500"
  }
}
```

Inclua também `sitemap.xml`, `robots.txt` e feed RSS (opcional).

---

## ♿ ACESSIBILIDADE

- Contraste WCAG AA
- `alt` em todas as imagens
- ARIA labels onde necessário
- Navegação completa por teclado
- Skip link "Pular para conteúdo"
- Estrutura semântica (`<header>`, `<main>`, `<nav>`, `<footer>`)
- Formulários com `<label>` associado
- Mensagens de erro com `aria-live="polite"`
- `prefers-reduced-motion` respeitado
- Foco visível (`:focus-visible`)

---

## 🖥️ BACKEND (opcional)

Stack: Bun + Elysia (ou Node + Fastify) + Drizzle + Zod + jose + argon2.

Endpoints:
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/contato` | Envia orçamento |
| POST | `/api/auth/register` | Registro |
| POST | `/api/auth/login` | Login (JWT) |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/cliente/reparos` | Lista reparos do cliente |
| GET | `/api/cliente/reparos/:id` | Detalhes de um reparo |

Exemplo de rota:
```ts
import { Elysia } from 'elysia';
import { z } from 'zod';

const ContatoSchema = z.object({
  nome: z.string().min(2).max(100),
  email: z.string().email(),
  telefone: z.string().regex(/^\+?[0-9\s()-]{8,20}$/),
  aparelho: z.enum(['celular','notebook','pc','outro']),
  descricao: z.string().min(10).max(2000),
  lgpd: z.literal(true),
});

export const contatoRoute = new Elysia()
  .post('/api/contato', async ({ body }) => {
    const parsed = ContatoSchema.safeParse(body);
    if (!parsed.success) {
      return { error: 'Dados inválidos', details: parsed.error.flatten() };
    }
    // processar envio
    return { success: true };
  });
```

---

## 🌐 DEPLOY

### Cloudflare Pages
```bash
pnpm install
pnpm build
npx wrangler pages deploy dist
```

### `.env.example`
```env
PUBLIC_SITE_URL=https://techcamargo.com.br
PUBLIC_WHATSAPP=5544988424935
PUBLIC_EMAIL=techcamargo@techcamargo.com.br
TURNSTILE_SITE_KEY=xxxxx
JWT_SECRET=change-me-super-secret
DATABASE_URL=file:./data.db
```

### `_headers` (Cloudflare Pages)
```
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), camera=(), microphone=()
```

---

## 🧪 TESTES

- **Playwright** para fluxos (contato, login)
- **Axe-core** para acessibilidade
- **Lighthouse CI** no pipeline

```ts
// tests/contato.spec.ts
import { test, expect } from '@playwright/test';

test('formulário de contato valida campos', async ({ page }) => {
  await page.goto('/contato');
  await page.click('button[type="submit"]');
  await expect(page.locator('[role="alert"]')).toBeVisible();
});
```

---

## 📦 ENTREGÁVEIS

Gere **todos** os arquivos abaixo com código completo e comentado:

1. `package.json` (scripts de dev, build, preview, test)
2. `astro.config.mjs` (com CSP e sitemap)
3. `vite.config.ts`
4. `tsconfig.json`
5. `.env.example`
6. `README.md` (setup, build, deploy, segurança, acessibilidade)
7. `src/layouts/BaseLayout.astro`
8. Todas as 7 páginas em `src/pages/`
9. Todos os 14 componentes em `src/components/`
10. `src/styles/tokens.css`, `base.css`, `utilities.css`
11. Todos os scripts em `src/scripts/`
12. `public/robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `sw.js`
13. Rota backend de exemplo (`server/contato.ts`)
14. Testes de exemplo (`tests/`)

---

## ✅ CRITÉRIOS DE ACEITAÇÃO

- [ ] Site 100% responsivo (mobile, tablet, desktop)
- [ ] "CamargoTech" em logo, títulos, rodapé, metatags e JSON-LD
- [ ] Zero frameworks pesados no runtime (React/Vue/Angular evitados)
- [ ] JS inicial < 30 KB gzip
- [ ] Lighthouse ≥ 98 em Performance, Acessibilidade, Boas Práticas e SEO
- [ ] Formulários validam (client + server) e sanitizam dados
- [ ] Nenhum uso de `innerHTML` com dados do usuário
- [ ] CSP, HSTS e demais headers configurados
- [ ] Tema claro/escuro funcional com persistência
- [ ] Acessível por teclado e leitor de tela
- [ ] Consentimento LGPD implementado (banner + checkbox)
- [ ] PWA funcional (offline básico)
- [ ] Código comentado, tipado (TypeScript), sem erros no console
- [ ] Deploy funcional em CDN edge (Cloudflare Pages/Vercel)

---

## 🧠 PRINCÍPIOS NORTEADORES

1. **Leveza radical:** cada KB importa — justifique toda dependência
2. **Segurança por padrão:** zero confiança no cliente
3. **Acessibilidade universal:** funciona sem JS sempre que possível (progressive enhancement)
4. **Performance como feature:** velocidade é UX
5. **Simplicidade:** prefira a solução nativa do navegador

---

## 🎬 INSTRUÇÃO FINAL

Gere **todos** os arquivos completos, um por um, com código real, comentado e funcional. Use **Astro + Vite + TypeScript + UnoCSS/Tailwind JIT + Alpine.js**, com backend opcional em **Bun + Elysia + Drizzle + Zod**. Aplique todos os headers de segurança, otimizações de performance e práticas de acessibilidade listadas acima. Use **"CamargoTech"** como nome oficial em todos os elementos visuais, metatags, textos e dados estruturados. Explique decisões técnicas relevantes em comentários no código. **Não use placeholders vagos** — entregue o projeto pronto para rodar com `pnpm install && pnpm dev`.

Comece pela estrutura de pastas e `package.json`, siga com configurações, depois layout/páginas/componentes, estilos, scripts, arquivos públicos e, por fim, exemplos de backend e testes.