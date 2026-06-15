# BA Elétrica — Controle de Ronda

Sistema de controle de rondas de segurança com validação por foto, relatórios automáticos e gestão de equipe.

## Funcionalidades

- **Registro de Rondas**: Captura fotográfica com timestamp (Início, Meio, Fim de Ronda)
- **Dashboard em Tempo Real**: Monitoramento de rondas finalizadas e em aberto
- **Relatórios Automáticos**: Diário (PDF com fotos) e Mensal (Excel + PDF)
- **Gestão de Usuários**: Cadastro, setor, foto de perfil, role (admin/vigilante)
- **Foto de Perfil**: Upload via câmera do celular ou galeria
- **Modo Claro/Escuro**: Tema neon escuro (padrão) e modo claro
- **Responsivo**: Acessível em celular e computador
- **Fuso Horário**: America/Manaus (UTC-4)

## Tech Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend/SSR | React 19, TanStack Router/Start, Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Deploy | Cloudflare Workers (app + relatórios) |
| CI/CD | GitHub Actions |
| Email | Resend API (via Edge Functions) |
| PDF | pdf-lib |
| Charts | Recharts |

## Estrutura de Pastas

```
src/
├── components/
│   ├── ui/               # Componentes shadcn/ui
│   ├── AdminSidebar.tsx  # Sidebar do administrador
│   ├── CameraCapture.tsx # Captura de foto (câmera/galeria)
│   ├── EmployeeBottomNav.tsx # Nav inferior do vigilante
│   └── ThemeToggle.tsx   # Toggle claro/escuro
├── integrations/
│   └── supabase/         # Cliente Supabase + auth middleware
├── lib/
│   ├── auth.tsx          # Contexto de autenticação
│   ├── theme.tsx         # Contexto de tema (dark/light)
│   ├── timezone.ts       # Utilitários de fuso Manaus + labels
│   ├── storage.ts        # Utilitários de Storage (fotos assinadas)
│   └── *.functions.ts    # Server functions (admin, reports, access)
├── routes/
│   ├── app/              # Rotas do vigilante (bater ponto, histórico, perfil)
│   ├── admin/            # Rotas do admin (dashboard, registros, usuários, setores)
│   └── login.tsx         # Login
├── server.ts             # Entry point do Worker (SSR)
├── start.ts              # Configuração do TanStack Start
supabase/
├── functions/            # Edge Functions (relatórios diário/mensal)
├── migrations/           # Migrations SQL
└── config.toml           # Configuração do Supabase
wrangler.toml             # Configuração do Cloudflare Workers
```

## Como Rodar Localmente

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com as chaves reais do Supabase

# Iniciar servidor de desenvolvimento
npm run dev

# URL: http://localhost:8080
```

### Variáveis de Ambiente (.env)

```bash
SUPABASE_URL=https://rdmbayprbfqbjhfqcasp.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role_key
VITE_SUPABASE_URL=https://rdmbayprbfqbjhfqcasp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...anon_key
```

## Deploy

### Deploy Manual (CLI)

```bash
# Build + Deploy para Cloudflare Workers
npm run deploy

# Ou separadamente:
npx vite build
npx wrangler deploy
```

### Deploy Automático (GitHub Actions)

O deploy é feito automaticamente a cada push na branch `main` via GitHub Actions.

**Secrets necessários no GitHub** (`Settings > Secrets and variables > Actions`):

| Secret | Descrição |
|--------|-----------|
| `CLOUDFLARE_API_TOKEN` | Token de API do Cloudflare |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role do Supabase |

**Configurar via CLI:**
```bash
gh secret set CLOUDFLARE_API_TOKEN --body "cfat_sua_chave_aqui"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "eyJ...sua_chave_aqui"
```

### Secrets no Cloudflare Workers

Variáveis configuradas via `wrangler.toml` `[vars]` (não-sensíveis):
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_*`

Secrets configurados via CLI (sensíveis):
```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

### Supabase Edge Functions

```bash
npx supabase functions deploy send-daily-report
npx supabase functions deploy send-monthly-report
```

## Conta de Suporte

- **Email**: suporte04@baeletrica.com.br
- **Perfil**: Administrador protegido (não pode ser removido)
- **Relatórios de Teste**: Apenas esta conta pode enviar

## URLs de Produção

- **App**: https://controle-ronda.suporte04.workers.dev
- **Supabase**: https://rdmbayprbfqbjhfqcasp.supabase.co
- **GitHub**: https://github.com/suporte04-BA/controle-ronda

## Licença

Projeto privado — BA Elétrica
