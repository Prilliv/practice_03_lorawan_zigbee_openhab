$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
docker compose down
if ($LASTEXITCODE -ne 0) { throw 'Не вдалося зупинити проєкт.' }
Write-Host 'Контейнер зупинено. Дані у named volumes збережено.'
