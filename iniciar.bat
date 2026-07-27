@echo off
echo ============================================
echo   Controle de Ronda - BA Eletrica
echo   Sistema de Gestao de TI
echo ============================================
echo.

:: Verificar se Docker esta instalado
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Docker nao encontrado! Instale o Docker Desktop.
    echo https://docs.docker.com/desktop/install/windows-install/
    pause
    exit /b 1
)

:: Verificar se Docker esta rodando
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Docker nao esta rodando! Inicie o Docker Desktop.
    pause
    exit /b 1
)

echo [1/3] Parando containers anteriores...
docker-compose down

echo [2/3] Construindo e iniciando containers...
docker-compose up --build -d

echo [3/3] Aguardando sistema inicializar...
timeout /t 15 /nobreak >nul

echo.
echo ============================================
echo   Sistema iniciado com sucesso!
echo ============================================
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8080
echo   Swagger:  http://localhost:8080/swagger-ui.html
echo.
echo   Credenciais:
echo     admin / admin123
echo     tecnico / tecnico123
echo     usuario / usuario123
echo.

:: Abrir no Edge
start msedge "http://localhost:3000"

echo Pressione qualquer tecla para parar o sistema...
pause >nul

echo Parando containers...
docker-compose down
echo Sistema parado.
