@echo off
rem DY01 clone — start the backend (:8015) and the vite dev server (:5188) in two windows.
set HERE=%~dp0
start "dy01 server" cmd /k "cd /d %HERE%server && node index.js"
start "dy01 web"    cmd /k "cd /d %HERE%web && npm run dev"
echo server http://127.0.0.1:8015  -  web http://127.0.0.1:5188
