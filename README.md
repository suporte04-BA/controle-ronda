# Controle de Ronda - Sistema de Gestao de TI

## Pre-requisitos
- Docker Desktop instalado e rodando

## Como usar

### Com Docker (recomendado)
1. Clique duas vezes em `iniciar.bat`
2. O sistema vai compilar e iniciar automaticamente
3. O Edge vai abrir em `http://localhost:3000`

### Manualmente (sem Docker)
1. Instalar PostgreSQL e criar database `inventario_db`
2. No terminal do backend: `mvn spring-boot:run`
3. Abrir `frontend/index.html` no navegador

## Credenciais
| Usuario | Senha | Perfil |
|---------|-------|--------|
| admin | admin123 | Administrador |
| tecnico | tecnico123 | Tecnico |
| usuario | usuario123 | Usuario |

## API Endpoints
- `POST /api/auth/login` - Login
- `GET /api/computadores` - Listar equipamentos
- `GET /api/manutencoes` - Listar manutencoes
- `GET /api/ordens-servico` - Listar ordens de servico
- Swagger: `http://localhost:8080/swagger-ui.html`

## Funcionalidades
- Dashboard com KPIs e graficos
- Gestao de equipamentos (CRUD completo)
- Gestao de manutencoes
- Ordens de servico
- Relatorios com graficos
- Gestao de usuarios
- Autenticacao JWT com roles
- BCrypt para senhas
