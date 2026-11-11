$ErrorActionPreference = "Stop"

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "Falta '$Name'. Instalarlo o ejecutar este lanzador en el runner aislado; no se aplicó SQL ni se inició ningún servicio." }
}

Require-Command "supabase"
Require-Command "node"
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) { throw "Falta Docker. Supabase local requiere Docker; no se modificó ninguna base externa." }

$env:APDB_PILOT_PORT = if ($env:APDB_PILOT_PORT) { $env:APDB_PILOT_PORT } else { "8790" }
supabase start | Out-Host
$status = supabase status -o env
foreach ($line in ($status -split "`r?`n")) {
  if ($line -match '^([A-Z_]+)=(.*)$') { Set-Item -Path "Env:$($Matches[1])" -Value $Matches[2].Trim('"') }
}
if (-not $env:SUPABASE_URL -and $env:API_URL) { $env:SUPABASE_URL = $env:API_URL }
if (-not $env:SUPABASE_ANON_KEY -and $env:ANON_KEY) { $env:SUPABASE_ANON_KEY = $env:ANON_KEY }
if ($env:SUPABASE_URL -notmatch '^https?://127\.0\.0\.1(:\d+)?$') { throw "Supabase no devolvió un endpoint local; se detiene por seguridad." }
supabase db reset --local | Out-Host
$server = Start-Process node -ArgumentList "tools/apdb-isolated-server.cjs" -WorkingDirectory (Get-Location) -PassThru
try {
  Start-Process "http://127.0.0.1:$($env:APDB_PILOT_PORT)/index_online.html?secureResults=1" | Out-Null
  Write-Host "Piloto aislado: http://127.0.0.1:$($env:APDB_PILOT_PORT)/index_online.html?secureResults=1"
  Write-Host "Sólo se expone en localhost. Ctrl+C detiene el servidor; luego ejecutar 'supabase stop --no-backup'."
  Wait-Process -Id $server.Id
} finally {
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
}
