@echo off
REM Script para iniciar VARO Bot automáticamente con Windows

REM Esperar 10 segundos para asegurar que el sistema esté listo
timeout /t 10 /nobreak

REM Ejecutar el script PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\wppconnect2\start-varo-services.ps1"
