[CmdletBinding()]
param(
  [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$required = @(
  'docs/ejecutar-en-supabase-permisos-base.sql',
  'docs/ejecutar-en-supabase-permisos-seed-apdb.sql',
  'docs/ejecutar-en-supabase-documentacion.sql',
  'docs/ejecutar-en-supabase-documentacion-jugadores.sql',
  'docs/ejecutar-en-supabase-documentacion-subidas.sql',
  'docs/ejecutar-en-supabase-playoffs.sql',
  'docs/ejecutar-en-supabase-programacion.sql'
)

foreach ($file in $required) {
  if (-not (Test-Path (Join-Path $repo $file))) { throw "Falta fuente versionada: $file" }
}

function Find-Command([string]$name) {
  return Get-Command $name -ErrorAction SilentlyContinue
}

$cli = Find-Command 'supabase'
$docker = Find-Command 'docker'
$psql = Find-Command 'psql'
$result = [ordered]@{
  isolatedOnly = $true
  supabaseCli = [bool]$cli
  docker = [bool]$docker
  psql = [bool]$psql
  sources = $required.Count
  mode = if ($CheckOnly) { 'check-only' } else { 'not-started' }
}
$result | ConvertTo-Json -Compress

if (-not $cli -or -not $docker -or -not $psql) {
  Write-Error 'No se puede preparar Supabase aislado: se requieren supabase CLI, Docker y psql. No se aplicó SQL ni se creó ningún servicio.'
  exit 2
}

if ($CheckOnly) { exit 0 }
Write-Error 'Fuentes detectadas, pero la consolidación de migraciones Auth/Storage/RPC requiere revisión antes de ejecutar supabase start.'
exit 3
