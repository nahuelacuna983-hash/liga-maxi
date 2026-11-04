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
if ([int]$tableCount -eq 0) {
  Get-Content (Join-Path $repo "docs\demo-2027-postgres-schema.sql") -Raw | & $psql -X -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw "Falló la aplicación inicial del esquema." }
  Write-Host "Esquema inicial aplicado en $database." -ForegroundColor Green
} else {
  $required = & $psql -X -qAt -c "select count(*) from (select to_regclass('public.lm_demo_organizations') as organizations, to_regclass('public.lm_demo_tournaments') as tournaments, to_regclass('public.lm_demo_categories') as categories, to_regclass('public.lm_demo_matches') as matches, to_regclass('public.lm_demo_playoff_rules') as playoff_rules, (select count(*) from information_schema.columns where table_schema='public' and table_name='lm_demo_playoffs' and column_name='publication_state') as publication_state) required where organizations is not null and tournaments is not null and categories is not null and matches is not null and playoff_rules is not null and publication_state = 1;"
  if ($LASTEXITCODE -ne 0 -or [int]$required -ne 1) { throw "La base contiene un esquema lm_demo_* incompatible; no se modificó ni se reaplicó." }
  Write-Host "Esquema existente compatible; se reutilizan los datos sin borrar ni reaplicar." -ForegroundColor Green
}
Write-Host "Iniciando backend persistente en http://127.0.0.1:8787" -ForegroundColor Green
$env:PORT = "8787"
$backend = Start-Process -FilePath "node" -ArgumentList "demo_2027_postgres_server.js" -WorkingDirectory $repo -PassThru
$env:PORT = "4173"
$frontend = Start-Process -FilePath "node" -ArgumentList "tools\demo-server.cjs" -WorkingDirectory $repo -PassThru
try {
  Start-Sleep -Seconds 2
  Invoke-WebRequest "http://127.0.0.1:8787/health" | Select-Object -ExpandProperty Content
  $edge = @("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", "C:\Program Files\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
  $url = "http://127.0.0.1:4173/demo_circuito_2027.html?mode=postgres&api=http://127.0.0.1:8787"
  if ($edge) { Start-Process $edge $url } else { Write-Host "Edge no encontrado; abrí manualmente la URL indicada." -ForegroundColor Yellow }
  Write-Host "Interfaz integrada: $url" -ForegroundColor Green
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
