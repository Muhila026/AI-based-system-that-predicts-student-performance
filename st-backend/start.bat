@echo off
echo Starting Backend (uvicorn)...
cd /d "%~dp0"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
