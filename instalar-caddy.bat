@echo off
REM Script para instalar y ejecutar Caddy en Windows

echo.
echo ========================================
echo  Instalador de Caddy + SSL/HTTPS
echo ========================================
echo.

REM Verificar si Caddy está instalado
caddy version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Caddy ya está instalado
    goto :run_caddy
)

REM Si no está instalado, intentar descargarlo
echo ⏳ Descargando Caddy...
echo.
echo Descargando desde: https://caddyserver.com/download
echo.
echo Por favor:
echo 1. Visita: https://caddyserver.com/download
echo 2. Descarga la versión para Windows
echo 3. Extrae caddy.exe en una carpeta
echo 4. Agrega la carpeta al PATH del sistema
echo 5. Abre una nueva terminal y ejecuta este script nuevamente
echo.
pause
goto :end

:run_caddy
echo.
echo ========================================
echo  Iniciando Caddy...
echo ========================================
echo.
echo 🔐 URL: https://camarafarma.duckdns.org
echo 📡 Backend: http://localhost:4000
echo 🔌 Socket.IO: http://localhost:4001
echo.
echo Caddy obtendrá un certificado SSL de Let's Encrypt
echo automáticamente en los próximos segundos...
echo.
echo Presiona Ctrl+C para detener Caddy
echo.

REM Ejecutar Caddy
caddy run -config C:\wppconnect2\Caddyfile

:end
echo.
echo Caddy finalizado.
echo.
pause
