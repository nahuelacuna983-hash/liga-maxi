$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
$database = "liga_maxi_2027_demo"
$hostName = "127.0.0.1"
$port = "5432"
$user = "postgres"
if (-not (Test-Path $psql)) { throw "No se encontró psql.exe en $psql" }

$secure = Read-Host "Contraseña de PostgreSQL para $user@$database (no se guarda en archivos)" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
$env:PGPASSWORD = $password
$env:PGHOST = $hostName; $env:PGPORT = $port; $env:PGUSER = $user; $env:PGDATABASE = $database
$env:DATABASE_URL = "postgres://$user@$hostName`:$port/$database"

$tableCount = & $psql -X -qAt -c "select count(*) from pg_tables where schemaname='public' and tablename like 'lm_demo_%';"
if ($LASTEXITCODE -ne 0) { throw "No se pudo conectar a PostgreSQL." }
if ([int]$tableCount -gt 0) { throw "La base ya contiene tablas lm_demo_*. No se aplicó ningún cambio para proteger datos existentes." }

Get-Content (Join-Path $repo "docs\demo-2027-postgres-schema.sql") -Raw | & $psql -X -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw "Falló la aplicación del esquema." }
Write-Host "Esquema aplicado en $database. Iniciando backend persistente en http://127.0.0.1:8787" -ForegroundColor Green
$env:PORT = "8787"
$backend = Start-Process -FilePath "node" -ArgumentList "demo_2027_postgres_server.js" -WorkingDirectory $repo -PassThru
$env:PORT = "4173"
$frontend = Start-Process -FilePath "node" -ArgumentList "tools\demo-server.cjs" -WorkingDirectory $repo -PassThru
try {
  Start-Sleep -Seconds 2
  Invoke-WebRequest "http://127.0.0.1:8787/health" | Select-Object -ExpandProperty Content
  Start-Process "msedge.exe" "http://127.0.0.1:4173/demo_persistencia_2027.html"
  Write-Host "Frontend: http://127.0.0.1:4173/demo_persistencia_2027.html" -ForegroundColor Green
  Write-Host "Backend:  http://127.0.0.1:8787/health" -ForegroundColor Green
  Write-Host "Presioná Ctrl+C para detener ambos servicios." -ForegroundColor Yellow
  Wait-Process -Id $backend.Id
}
finally {
  if ($frontend -and -not $frontend.HasExited) { Stop-Process -Id $frontend.Id -Force }
  if ($backend -and -not $backend.HasExited) { Stop-Process -Id $backend.Id -Force }
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}
