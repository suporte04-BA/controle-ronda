# BA Elétrica — Sistema de Controle de Ronda

Sistema completo de controle de rondas de segurança com validação fotográfica, relatórios automáticos por e-mail e gestão de equipe em tempo real.

---

## Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Fluxo de Trabalho](#fluxo-de-trabalho)
- [Tech Stack](#tech-stack)
- [Arquitetura](#arquitetura)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Como Rodar Localmente](#como-rodar-localmente)
- [Deploy](#deploy)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Banco de Dados](#banco-de-dados)
- [Edge Functions](#edge-functions)
- [Contas e Permissões](#contas-e-permissões)
- [URLs de Produção](#urls-de-produção)

---

## Visão Geral

O **Controle de Ronda BA Elétrica** é um sistema web responsivo para gerenciar rondas de vigilância. Cada vigilantepreenche um ciclo de rondas tirando fotos com a câmera do dispositivo. O sistema registra data/hora da captura e envio, gera relatórios PDF e Excel automaticamente e envia por e-mail aos gestores.

### Ciclo de Ronda

Cada ciclo consiste em **2 etapas**:

| Etapa | Tipo          | Descrição                                    |
| ----- | ------------- | -------------------------------------------- |
| 1     | `check_in`    | **Início de Ronda** — Primeira foto do ciclo |
| 2     | `check_out_2` | **Fim de Ronda** — Última foto do ciclo      |

Após completar as 2 etapas, um novo ciclo é iniciado automaticamente.

---

## Funcionalidades

### Vigilante (App Mobile)

| Funcionalidade         | Descrição                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------- |
| **Bater Ponto**        | Tela principal com relógio em tempo real, status do ciclo atual e botão para registrar |
| **Captura por Câmera** | Foto obrigatoriamente tirada pela câmera do dispositivo (sem upload de galeria)        |
| **Timestamp Duplo**    | Registra horário da captura (shutter) e horário do envio (confirmação)                 |
| **Meu Histórico**      | Lista dos últimos 100 registros agrupados por data, com foto do perfil e tipo do check |
| **Perfil**             | Foto de perfil (câmera ou galeria), setor, role, alternar tema claro/escuro            |
| **Modo Claro/Escuro**  | Tema neon escuro (padrão) e modo claro                                                 |

### Administrador (Dashboard Web)

| Funcionalidade         | Descrição                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| **Dashboard**          | Rondas finalizadas/abertas, último ponto verificado, ranking de vigilantes, distribuição por setor   |
| **Controle de Ronda**  | Tabela completa com filtros por data, setor e nome. Detalhe do ciclo com fotos. Exportação PDF/Excel |
| **Gestão de Usuários** | Cadastro, exclusão, promoção/remoção de admin, definição de setor e foto de perfil                   |
| **Gestão de Setores**  | CRUD de setores da organização                                                                       |
| **Relatório de Teste** | Envio de relatório diário de teste via e-mail (apenas conta de suporte)                              |

### Relatórios Automáticos

| Relatório  | Frequência                          | Conteúdo                                                                                                                 |
| ---------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Diário** | Todo dia às 07:00 (Manaus)          | PDF com capa, estatísticas, tabela de registros e evidência fotográfica com avatar do vigilante + Excel com dados brutos |
| **Mensal** | Dia 1 de cada mês às 08:00 (Manaus) | PDF consolidado com estatísticas, ranking, evidência fotográfica + Excel                                                 |

**Destinatários:** Usuários com papel **admin** e setor **gestor** + suporte04@baeletrica.com.br

---

## Fluxo de Trabalho

```
┌─────────────────────────────────────────────────────────────┐
│                     FLUXO DO VIGILANTE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Login → Sync automático de perfil/role                   │
│           ↓                                                  │
│  2. Tela "Bater Ponto" → Relógio + Status do ciclo           │
│     ┌──────────┐    ┌──────────┐                             │
│     │ Início   │ →  │   Fim    │   (ciclo de 2 etapas)      │
│     │ de Ronda │    │ de Ronda │                             │
│     └──────────┘    └──────────┘                             │
│           ↓                                                  │
│  3. Botão "Registrar" → Câmera abre automaticamente          │
│           ↓                                                  │
│  4. Tirar foto → Preview → Confirmar                         │
│           ↓                                                  │
│  5. Upload para Supabase Storage + Insert no banco           │
│           ↓                                                  │
│  6. Toast de sucesso → Status atualizado                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   FLUXO DO RELATÓRIO                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Cron dispara Edge Function (diário às 07:00 Manaus)     │
│           ↓                                                  │
│  2. Query registros_ponto + profiles + setores               │
│           ↓                                                  │
│  3. Buscar fotos de ronda (fotos_ponto) como base64          │
│  4. Buscar avatares dos vigilantes (avatars) como base64     │
│           ↓                                                  │
│  5. Gerar PDF com:                                           │
│     • Capa com logo + estatísticas                           │
│     • Tabela de registros                                    │
│     • Evidência fotográfica (avatar + foto + nome + setor)   │
│           ↓                                                  │
│  6. Gerar Excel com dados brutos                             │
│           ↓                                                  │
│  7. Enviar e-mail via Resend API com anexos                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Camada               | Tecnologia               | Uso                              |
| -------------------- | ------------------------ | -------------------------------- |
| **Frontend**         | React 19                 | UI componentes                   |
| **SSR/Router**       | TanStack Router + Start  | Rotas, server functions, SSR     |
| **Estilo**           | Tailwind CSS + shadcn/ui | Design system neon dark          |
| **Backend**          | Supabase                 | PostgreSQL, Auth, Storage, RLS   |
| **Edge Functions**   | Deno (Supabase)          | Geração de relatórios PDF/Excel  |
| **Email**            | Resend API               | Envio de relatórios              |
| **PDF**              | pdf-lib                  | Geração server-side de PDFs      |
| **Excel**            | xlsx (SheetJS)           | Geração de planilhas             |
| **Gráficos**         | Recharts                 | Dashboard (barras, pizza)        |
| **Deploy App**       | Cloudflare Workers       | Hosting + CDN global             |
| **CI/CD**            | GitHub Actions           | Deploy automático a cada push    |
| **Deploy Functions** | Supabase CLI             | Deploy manual das Edge Functions |

---

## Arquitetura

```
                    ┌──────────────────┐
                    │  GitHub Actions  │
                    │  (CI/CD)         │
                    └────────┬─────────┘
                             │ push main
                             ▼
┌────────────────────────────────────────────────────┐
│              CLOUDFLARE WORKERS                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  TanStack Start (SSR + Client)               │  │
│  │  ├── /app/*      → Vigilante (bater ponto)   │  │
│  │  ├── /admin/*    → Administrador (dashboard) │  │
│  │  └── /login      → Autenticação              │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Vite Build → Client Bundle (injetado)       │  │
│  └──────────────────────────────────────────────┘  │
└──────────────────────┬─────────────────────────────┘
                       │ API calls
                       ▼
┌────────────────────────────────────────────────────┐
│                   SUPABASE                          │
│  ┌────────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ PostgreSQL │  │ Auth     │  │ Storage        │  │
│  │ (RLS)      │  │ (JWT)    │  │ fotos_ponto/   │  │
│  │            │  │          │  │ avatars/       │  │
│  └────────────┘  └──────────┘  └────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Edge Functions (Deno)                       │  │
│  │  ├── send-daily-report  (cron: 07:00 Manaus) │  │
│  │  └── send-monthly-report (dia 1, 08:00)      │  │
│  └──────────────────────────────────────────────┘  │
│                       │                             │
│                       ▼                             │
│              ┌────────────────┐                     │
│              │   Resend API   │                     │
│              │  (envio email) │                     │
│              └────────────────┘                     │
└────────────────────────────────────────────────────┘
```

---

## Estrutura de Pastas

```
controle-ronda/
├── src/
│   ├── components/
│   │   ├── ui/                    # Componentes shadcn/ui (Button, Input, Dialog, etc.)
│   │   ├── AdminSidebar.tsx       # Sidebar de navegação do admin
│   │   ├── CameraCapture.tsx      # Modal de captura por câmera (só câmera, sem galeria)
│   │   ├── EmployeeBottomNav.tsx  # Nav inferior do vigilante (Bater Ponto / Histórico / Perfil)
│   │   └── ThemeToggle.tsx        # Toggle modo claro/escuro
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts          # Cliente Supabase (client-side, com JWT)
│   │       ├── client.server.ts   # Cliente Supabase (server-side, service_role)
│   │       ├── auth-middleware.ts  # Middleware de auth para server functions
│   │       ├── auth-attacher.ts   # Attacher de JWT nas requisições
│   │       └── types.ts           # Tipos gerados pelo Supabase
│   ├── lib/
│   │   ├── auth.tsx               # AuthProvider (session, profile, role)
│   │   ├── theme.tsx              # ThemeProvider (dark/light)
│   │   ├── timezone.ts            # Utilitários Manaus TZ + ciclo de rondas
│   │   ├── storage.ts             # Signed URLs para fotos de ronda
│   │   ├── access.functions.ts    # Sync de acesso (server function)
│   │   ├── admin-users.functions.ts # CRUD de usuários (server function)
│   │   └── report.functions.ts    # Trigger de relatório de teste
│   ├── routes/
│   │   ├── app.tsx                # Layout do vigilante (auth guard + redirect admin)
│   │   ├── app.index.tsx          # Bater Ponto (tela principal do vigilante)
│   │   ├── app.historico.tsx      # Meu Histórico (últimos 100 registros)
│   │   ├── app.perfil.tsx         # Perfil do vigilante
│   │   ├── admin.tsx              # Layout do admin (sidebar + auth guard)
│   │   ├── admin.index.tsx        # Dashboard (charts, stats)
│   │   ├── admin.registros.tsx    # Controle de Ronda (tabela + PDF + Excel)
│   │   ├── admin.usuarios.tsx     # Gestão de Usuários
│   │   ├── admin.setores.tsx      # Gestão de Setores
│   │   └── login.tsx              # Tela de Login
│   ├── server.ts                  # Entry point do Worker (SSR)
│   └── start.ts                   # Configuração do TanStack Start
├── supabase/
│   ├── functions/
│   │   ├── send-daily-report/     # Edge Function: relatório diário
│   │   │   └── index.ts           #   PDF + Excel + email (cron 07:00)
│   │   └── send-monthly-report/   # Edge Function: relatório mensal
│   │       └── index.ts           #   PDF + Excel + email (dia 1)
│   └── migrations/                # Migrations SQL do banco
├── public/
│   └── logo.png                   # Logo da BA Elétrica
├── wrangler.toml                  # Configuração Cloudflare Workers
├── vite.config.ts                 # Configuração Vite + TanStack Start
├── tailwind.config.ts             # Configuração Tailwind CSS
├── package.json                   # Dependências + scripts
└── README.md                      # Este arquivo
```

---

## Como Rodar Localmente

### Pré-requisitos

- Node.js 18+
- npm
- Conta no Supabase com o projeto configurado

### Passo a Passo

```bash
# 1. Clonar o repositório
git clone https://github.com/suporte04-BA/controle-ronda.git
cd controle-ronda

# 2. Instalar dependências
npm install

# 3. Criar arquivo .dev.vars na raiz do projeto
# (este arquivo é gitignored — NÃO commite no GitHub)
```

Criar o arquivo `.dev.vars` na raiz:

```ini
SUPABASE_URL=https://rdmbayprbfqbjhfqcasp.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=eyJ...sua_chave_service_role
VITE_SUPABASE_URL=https://rdmbayprbfqbjhfqcasp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...sua_chave_anon
```

```bash
# 4. Iniciar servidor de desenvolvimento
npm run dev

# 5. Acessar
# http://localhost:8080
```

### Login

- Crie um usuário no Supabase Dashboard > Auth > Users
- Faça login no app com email/senha
- O primeiro acesso cria automaticamente o perfil como "Vigilante"
- Para virar admin, acesse o painel admin com outra conta admin e promova

---

## Deploy

### Deploy Automático (Recomendado)

O deploy é feito **automaticamente** a cada push na branch `main` via GitHub Actions.

**Fluxo:**

1. Push para `main` → GitHub Actions dispara
2. `npm ci` → Instala dependências
3. `npx vite build` → Gera o bundle do Worker
4. `npx wrangler deploy` → Faz deploy no Cloudflare Workers

**Secrets necessários no GitHub** (`Settings > Secrets and variables > Actions`):

| Secret                      | Descrição                      | Como obter                                                    |
| --------------------------- | ------------------------------ | ------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`      | Token de API do Cloudflare     | Cloudflare Dashboard > My Profile > API Tokens > Create Token |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role do Supabase | Supabase Dashboard > Settings > API > service_role            |

**Configurar via CLI:**

```bash
gh secret set CLOUDFLARE_API_TOKEN --body "cfat_sua_chave_aqui"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "eyJ...sua_chave_aqui"
```

### Deploy Manual

```bash
# Build + Deploy do Worker
npm run deploy

# Ou separadamente:
npx vite build
npx wrangler deploy
```

### Deploy das Edge Functions (Supabase)

As Edge Functions são deployadas **separadamente** do Worker:

```bash
# Deploy da função de relatório diário
npx supabase functions deploy send-daily-report --project-ref rdmbayprbfqbjhfqcasp

# Deploy da função de relatório mensal
npx supabase functions deploy send-monthly-report --project-ref rdmbayprbfqbjhfqcasp
```

> **Nota:** As Edge Functions não são deployadas pelo GitHub Actions. Faça deploy manual após alterar.

---

## Variáveis de Ambiente

### Desenvolvimento Local (`.dev.vars`)

| Variável                        | Descrição                    | Onde usar                               |
| ------------------------------- | ---------------------------- | --------------------------------------- |
| `SUPABASE_URL`                  | URL do projeto Supabase      | Server-side (Edge Functions, server.ts) |
| `SUPABASE_PUBLISHABLE_KEY`      | Chave anon/publishable       | Server-side                             |
| `SUPABASE_SERVICE_ROLE_KEY`     | Chave service_role (secreta) | Server-side (bypassa RLS)               |
| `VITE_SUPABASE_URL`             | URL do Supabase              | Client-side (injetado no bundle)        |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave anon                   | Client-side (injetado no bundle)        |

### Produção (Cloudflare Workers)

**Não-sensíveis** (em `wrangler.toml` `[vars]`):

```toml
[vars]
SUPABASE_URL = "https://rdmbayprbfqbjhfqcasp.supabase.co"
SUPABASE_PUBLISHABLE_KEY = "eyJ..."
VITE_SUPABASE_URL = "https://rdmbayprbfqbjhfqcasp.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY = "eyJ..."
```

**Sensíveis** (via `wrangler secret put`):

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Cole a chave service_role quando solicitado
```

### Edge Functions (Supabase Secrets)

Configurados no Supabase Dashboard > Edge Functions > Secrets:

| Secret                      | Descrição                            |
| --------------------------- | ------------------------------------ |
| `SUPABASE_URL`              | URL do projeto                       |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role                   |
| `RESEND_API_KEY`            | Chave da API Resend (envio de email) |

---

## Banco de Dados

### Tabelas Principais

#### `profiles`

| Coluna     | Tipo                | Descrição                            |
| ---------- | ------------------- | ------------------------------------ |
| `id`       | UUID (PK)           | ID do usuário (FK → auth.users)      |
| `nome`     | TEXT                | Nome completo                        |
| `email`    | TEXT                | E-mail do usuário                    |
| `setor_id` | UUID (FK → setores) | Setor do usuário                     |
| `foto_url` | TEXT                | Caminho da foto de perfil no Storage |

#### `registros_ponto`

| Coluna         | Tipo                   | Descrição                   |
| -------------- | ---------------------- | --------------------------- |
| `id`           | UUID (PK)              | ID do registro              |
| `user_id`      | UUID (FK → auth.users) | Vigilante que fez o check   |
| `tipo_acao`    | ENUM                   | `check_in` ou `check_out_2` |
| `horario_acao` | TIMESTAMPTZ            | Quando a foto foi capturada |
| `horario_foto` | TIMESTAMPTZ            | Quando a foto foi enviada   |
| `foto_url`     | TEXT                   | Caminho da foto no Storage  |

#### `setores`

| Coluna | Tipo      | Descrição     |
| ------ | --------- | ------------- |
| `id`   | UUID (PK) | ID do setor   |
| `nome` | TEXT      | Nome do setor |

#### `user_roles`

| Coluna    | Tipo                   | Descrição         |
| --------- | ---------------------- | ----------------- |
| `user_id` | UUID (FK → auth.users) | ID do usuário     |
| `role`    | ENUM                   | `admin` ou `user` |

### Policies (RLS)

| Tabela                  | Operação      | Regra                         |
| ----------------------- | ------------- | ----------------------------- |
| `registros_ponto`       | SELECT        | Próprios registros OU admin   |
| `registros_ponto`       | INSERT        | Apenas `user_id = auth.uid()` |
| `registros_ponto`       | UPDATE/DELETE | Apenas admin                  |
| `profiles`              | SELECT        | Próprio perfil OU admin       |
| `user_roles`            | ALL           | Apenas admin                  |
| `fotos_ponto` (Storage) | SELECT        | Próprias fotos OU admin       |
| `fotos_ponto` (Storage) | INSERT        | Apenas própria pasta          |
| `avatars` (Storage)     | SELECT        | Todos (bucket público)        |

### Buckets de Storage

| Bucket        | Conteúdo                                              | Público |
| ------------- | ----------------------------------------------------- | ------- |
| `fotos_ponto` | Fotos das rondas (`{user_id}/{timestamp}_{tipo}.jpg`) | Privado |
| `avatars`     | Fotos de perfil (`{user_id}/avatar.jpg`)              | Público |

---

## Edge Functions

### send-daily-report

**Agendamento:** Cron diário às 11:00 UTC (07:00 Manaus)

**Trigger manual:**

```bash
curl -X POST https://rdmbayprbfqbjhfqcasp.supabase.co/functions/v1/send-daily-report \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"modo": "teste"}'
```

**Parâmetros:**
| Modo | Período | Uso |
|------|---------|-----|
| `teste` | Ontem + Hoje | Envio de teste manual |
| `diario` | Apenas ontem | Cron automático |

**O que gera:**

1. PDF com capa, estatísticas, tabela de registros e evidência fotográfica
2. Excel com dados brutos
3. E-mail HTML com anexos via Resend API

### send-monthly-report

**Agendamento:** Cron no dia 1 de cada mês às 12:00 UTC (08:00 Manaus)

**Mesmo fluxo do diário, mas consolidado do mês anterior.**

---

## Contas e Permissões

### Conta de Suporte

| Campo      | Valor                                                  |
| ---------- | ------------------------------------------------------ |
| Email      | suporte04@baeletrica.com.br                            |
| Senha      | sjr183039                                              |
| Perfil     | Administrador protegido                                |
| Permissões | Enviar relatório de teste, gerenciar todos os usuários |

**Proteções:**

- Não pode ter role de admin removida
- Botão "Remover admin" desabilitado na UI
- Último admin do sistema não pode ser removido

### Papéis (Roles)

| Papel     | Permissões                                                                               |
| --------- | ---------------------------------------------------------------------------------------- |
| **admin** | Acessa dashboard, gerencia usuários, vê todos os registros, baixa PDFs, envia relatórios |
| **user**  | Bate ponto, vê próprio histórico, gerencia próprio perfil                                |

### Filtro de Email dos Relatórios

Apenas recebem os relatórios por e-mail:

- Usuários com papel **admin** E setor contendo **"GESTOR"**
- suporte04@baeletrica.com.br (sempre)

---

## URLs de Produção

| Serviço                | URL                                                         |
| ---------------------- | ----------------------------------------------------------- |
| **App (Frontend)**     | https://controle-ronda.suporte04.workers.dev                |
| **Supabase Dashboard** | https://supabase.com/dashboard/project/rdmbayprbfqbjhfqcasp |
| **GitHub**             | https://github.com/suporte04-BA/controle-ronda              |

---

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev                          # Iniciar dev server (porta 8080)

# Build
npx vite build                       # Gerar bundle do Worker

# Deploy
npm run deploy                       # Build + deploy Worker
npx wrangler deploy                  # Deploy Worker direto
npx supabase functions deploy send-daily-report --project-ref rdmbayprbfqbjhfqcasp
npx supabase functions deploy send-monthly-report --project-ref rdmbayprbfqbjhfqcasp

# GitHub CLI
gh run list                          # Ver workflows recentes
gh run watch <ID>                    # Acompanhar deploy em tempo real
gh secret set <NAME> --body "<VALUE>" # Configurar secret

# Supabase
npx supabase db push                 # Aplicar migrations
npx supabase functions logs          # Ver logs das Edge Functions
```

---

## Licença

Projeto privado — BA Elétrica. Uso interno apenas.
