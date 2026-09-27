# 🛠️ CamargoTech — Assistência Técnica Especializada

Site institucional e comercial de alta performance para a assistência técnica **CamargoTech**, especializada em celulares, notebooks, PCs e eletrônicos.

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

### 3. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
O servidor será iniciado na porta local:
👉 **http://localhost:4321**

### 4. Build de Produção
```bash
npm run build
npm run preview
```

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
- **Auditoria de OS:** Sistema seguro para visualização de ordens de serviço.

---

## 📄 Páginas Disponíveis

- `/` — Página Principal com Hero, Serviços, Linha do tempo "Como Funciona", Depoimentos, Formulário, FAQ e Mapa
- `/servicos` — Tabela completa de 8 serviços, prazos, faixas de preço e modais detalhados
- `/sobre` — História da empresa, certificações de bancada e padrões de laboratório
- `/contato` — Formulário de orçamento com simulação de CEP (ViaCEP) e integração direta com WhatsApp
- `/area-cliente` — Painel interativo de consulta de Ordem de Serviço (OS) com laudo técnico e progresso
- `/politica-privacidade` — Termos de conformidade com a LGPD
- `/termos` — Condições de serviço e garantia legal de 90 dias
