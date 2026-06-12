# BA Elétrica — Controle de Ronda

Sistema de controle de rondas de segurança com validação por foto, relatórios automáticos e gestão de equipe.

## Funcionalidades

- **Registro de Rondas**: Captura fotográfica com timestamp (Início, Meio, Fim de Ronda)
- **Dashboard em Tempo Real**: Monitoramento de rondas finalizadas e em aberto
- **Relatórios Automáticos**: Diário (PDF com fotos) e Mensal (Excel + PDF)
- **Gestão de Usuários**: Cadastro, setor, foto de perfil, role (admin/vigilante)
- **Foto de Perfil**: Upload via câmera do celular ou galeria
- **Modo Claro/Escuro**: Tema neon escuro (padrão) e modo claro com sidebar azul
- **Responsivo**: Acessível em celular e computador
- **Fuso Horário**: America/Manaus (UTC-4)

## Tech Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19, TanStack Router/Start, Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Deploy | Cloudflare Workers (relatórios por email) |
| Email | Resend API |
| PDF | pdf-lib (Edge Functions) |
| Charts | Recharts |

## Estrutura de Pastas

```
src/
├── components/
│   ├── ui/              # Componentes shadcn/ui
│   ├── AdminSidebar.tsx # Sidebar do administrador
│   ├── CameraCapture.tsx# Captura de foto (câmera/galeria)
│   ├── EmployeeBottomNav.tsx # Nav inferior do vigilante
│   └── ThemeToggle.tsx  # Toggle claro/escuro
├── integrations/
│   └── supabase/        # Cliente Supabase + tipos gerados
├── lib/
│   ├── auth.tsx         # Contexto de autenticação
│   ├── theme.ts         # Contexto de tema (dark/light)
│   ├── timezone.ts      # Utilitários de fuso Manaus + labels
│   ├── storage.ts       # Utilitários de Storage (fotos assinadas)
│   └── admin-users.functions.ts # Server functions admin
├── routes/
│   ├── app/             # Rotas do vigilante (bater ponto, histórico, perfil)
│   ├── admin/           # Rotas do admin (dashboard, registros, usuários, setores)
│   └── login.tsx        # Login
supabase/
├── functions/           # Edge Functions (relatórios)
├── migrations/          # Migrations SQL
└── config.toml          # Configuração local do Supabase
```

## Como Rodar Localmente

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com as chaves reais

# Iniciar servidor de desenvolvimento
npm run dev

# URL: http://localhost:3000
```

## Como Deployar

### Supabase Edge Functions
```bash
npx supabase functions deploy send-daily-report
npx supabase functions deploy send-monthly-report
```

### Cloudflare Worker (relatórios)
```bash
cd cloudflare-worker
npx wrangler deploy
```

### Frontend
O frontend é deployado automaticamente via Lovable/Netlify ao dar push no git.

## Conta de Suporte

- **Email**: suporte04@baeletrica.com.br
- **Perfil**: Administrador protegido (não pode ser removido)
- **Relatórios de Teste**: Apenas esta conta pode enviar

## Licença

Projeto privado — BA Elétrica
