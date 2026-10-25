$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker CLI не знайдено. Встановіть і запустіть Docker Desktop.'
}
docker compose version | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose недоступний. Оновіть Docker Desktop.' }
docker compose up -d
if ($LASTEXITCODE -ne 0) { throw 'Не вдалося запустити контейнер. Перевірте помилку вище.' }
Write-Host ''
Write-Host 'Контейнер запускається. Перший запуск може тривати кілька хвилин.'
Write-Host 'UI: http://localhost:8080'
Write-Host 'Логи: docker compose logs -f openhab'
