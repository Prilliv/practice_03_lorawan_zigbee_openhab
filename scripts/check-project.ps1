$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$required = @(
 "conf\items\lpwan_mesh.items",
 "conf\automation\js\lpwan_emulator.js",
 "conf\automation\js\zigbee_emulator.js",
 "conf\automation\js\protocol_analytics.js",
 "conf\sitemaps\lpwan_mesh.sitemap",
 "docs\protocol-notes.md"
)
$bad = @()
foreach ($rel in $required) {
  $path = Join-Path $root $rel
  if (Test-Path $path) { Write-Host "[OK] $rel" -ForegroundColor Green }
  else { Write-Host "[MISSING] $rel" -ForegroundColor Red; $bad += $rel }
}
if ($bad.Count) { throw "Не вистачає файлів: $($bad -join ', ')" }
Write-Host "Структура проєкту повна. Перевірка не замінює запуск у openHAB."
