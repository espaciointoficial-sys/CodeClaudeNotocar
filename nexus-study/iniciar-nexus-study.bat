@echo off
cd /d "%~dp0"
echo Iniciando Nexus Study...
call npm run dev
if errorlevel 1 (
  echo.
  echo Hubo un error al iniciar la aplicacion.
  pause
)
