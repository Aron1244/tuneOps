@echo off

echo Starting TuneOps services...

docker compose up -d

echo.
echo Services started.
echo.

docker ps

pause