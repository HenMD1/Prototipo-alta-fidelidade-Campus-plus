@echo off
setlocal EnableDelayedExpansion
title Radar - prototipo
cd /d "%~dp0"

echo.
echo  ==========================================
echo    Radar de Oportunidades - prototipo
echo  ==========================================
echo.

rem --- Procura o Python 3 (py launcher ou python) ---
set "PY="
py -3 --version >nul 2>&1 && set "PY=py -3"
if not defined PY python --version >nul 2>&1 && set "PY=python"
if not defined PY (
  echo  [erro] Python 3 nao encontrado.
  echo  Instale em https://www.python.org/downloads/ marcando "Add python.exe to PATH"
  echo  e rode este arquivo de novo.
  echo.
  pause
  exit /b 1
)

rem --- Escolhe uma porta livre a partir da 8000 ---
set PORTA=8000
:testa_porta
netstat -ano | findstr /R /C:":%PORTA% .*LISTENING" >nul
if not errorlevel 1 (
  set /a PORTA+=1
  if !PORTA! GTR 8020 (
    echo  [erro] Nenhuma porta livre entre 8000 e 8020.
    pause
    exit /b 1
  )
  goto testa_porta
)

echo  Endereco: http://localhost:%PORTA%/
echo  O navegador abre sozinho em instantes.
echo  Para encerrar, feche esta janela ou pressione Ctrl+C.
echo.

rem --- Servidor local sem cache; o proprio Python abre o navegador quando estiver pronto ---
%PY% -c "import http.server as h,sys,threading,webbrowser;p=int(sys.argv[1]);C=type('C',(h.SimpleHTTPRequestHandler,),{'end_headers':lambda s:(s.send_header('Cache-Control','no-store'),h.SimpleHTTPRequestHandler.end_headers(s))});srv=h.ThreadingHTTPServer(('127.0.0.1',p),C);threading.Timer(1,webbrowser.open,['http://localhost:'+str(p)+'/']).start();print(' Pronto. Acessos:',flush=True);srv.serve_forever()" %PORTA%

echo.
echo  Servidor encerrado.
pause
