$ErrorActionPreference = "Stop"

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Falta '$Name'. Instalarlo antes de iniciar el piloto persistente; no se modificó ninguna base externa."
  }
}

Require-Command "supabase"
Require-Command "node"
Require-Command "docker"

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$config = Get-Content (Join-Path $repo "supabase\config.toml") -Raw
if ($config -notmatch 'project_id\s*=\s*"apdb-2027-isolated"') {
  throw "El project_id no es el entorno aislado autorizado; se cancela."
}

$env:APDB_PILOT_PORT = if ($env:APDB_PILOT_PORT) { $env:APDB_PILOT_PORT } else { "8790" }
supabase start | Out-Host
if ($LASTEXITCODE -ne 0) { throw "No se pudo iniciar Supabase local." }

supabase db push --local --include-seed | Out-Host
if ($LASTEXITCODE -ne 0) { throw "No se pudieron aplicar migraciones/seed al Supabase local; no se ejecutó db reset." }

$status = supabase status -o env
if ($LASTEXITCODE -ne 0) { throw "No se pudo leer el estado de Supabase local." }
foreach ($line in ($status -split "`r?`n")) {
  if ($line -match '^([A-Z_]+)=(.*)$') { Set-Item -Path "Env:$($Matches[1])" -Value $Matches[2].Trim('"') }
}
if (-not $env:SUPABASE_URL -and $env:API_URL) { $env:SUPABASE_URL = $env:API_URL }
if (-not $env:SUPABASE_ANON_KEY -and $env:ANON_KEY) { $env:SUPABASE_ANON_KEY = $env:ANON_KEY }
if ($env:SUPABASE_URL -notmatch '^https?://127\.0\.0\.1(:\d+)?$') {
  throw "El endpoint no es localhost; se cancela para proteger cualquier entorno remoto."
}

$server = Start-Process node -ArgumentList "tools/apdb-isolated-server.cjs" -WorkingDirectory $repo -PassThru -WindowStyle Hidden
try {
  $url = "http://127.0.0.1:$($env:APDB_PILOT_PORT)/index_online.html?secureResults=1"
  Write-Host "Piloto persistente aislado: $url"
  Write-Host "Los datos locales se conservan al cerrar y reiniciar Supabase; no ejecutes 'supabase db reset'."
  Wait-Process -Id $server.Id
} finally {
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
}
