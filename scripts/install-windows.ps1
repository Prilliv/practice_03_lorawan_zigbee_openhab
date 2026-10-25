param(
  [Parameter(Mandatory=$true)]
  [string]$OpenHabConf
)
$ErrorActionPreference = "Stop"
$source = Join-Path (Split-Path -Parent $PSScriptRoot) "conf"
if (!(Test-Path $source)) { throw "Не знайдено папку conf у розпакованому проєкті: $source" }
if (!(Test-Path $OpenHabConf)) { throw "Каталог openHAB conf не існує: $OpenHabConf" }
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Get-ChildItem -Path $source -Recurse -File | ForEach-Object {
  $relative = $_.FullName.Substring($source.Length).TrimStart('\','/')
  $dest = Join-Path $OpenHabConf $relative
  $destDir = Split-Path -Parent $dest
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  if (Test-Path $dest) { Copy-Item $dest "$dest.bak-$stamp" }
  Copy-Item $_.FullName $dest -Force
  Write-Host "Installed: $relative"
}
Write-Host "Готово. Резервні копії наявних файлів мають суфікс .bak-$stamp"
