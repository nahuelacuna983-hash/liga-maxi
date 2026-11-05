$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
$database = "liga_maxi_2027_demo"
$hostName = "127.0.0.1"
$port = "5432"
$user = "postgres"
if (-not (Test-Path $psql)) { throw "No se encontró psql.exe en $psql" }
function Assert-PortFree([int]$portNumber) {
  $listeners = Get-NetTCPConnection -LocalPort $portNumber -State Listen -ErrorAction SilentlyContinue
  if ($listeners) {
    $details = $listeners | ForEach-Object { try { $process = Get-Process -Id $_.OwningProcess -ErrorAction Stop; "PID $($_.OwningProcess) $($process.ProcessName)" } catch { "PID $($_.OwningProcess)" } }
    throw "El puerto $portNumber ya está ocupado: $($details -join ', '). Cerrá ese proceso o liberá el puerto antes de iniciar."
  }
}
function Show-LogTail([string]$path, [string]$label) {
  if (Test-Path $path) {
    Write-Host "--- Últimas líneas de $label ($path) ---" -ForegroundColor Yellow
    Get-Content $path -Tail 20 -ErrorAction SilentlyContinue
    Write-Host "--- Fin de $label ---" -ForegroundColor Yellow
  }
}

$secure = Read-Host "Contraseña de PostgreSQL para $user@$database (no se guarda en archivos)" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
$env:PGPASSWORD = $password
$env:PGHOST = $hostName; $env:PGPORT = $port; $env:PGUSER = $user; $env:PGDATABASE = $database
$env:DATABASE_URL = "postgres://$user@$hostName`:$port/$database"
$env:LM_REQUIRE_AUTH = "1"
$secretBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($secretBytes)
$env:LM_DEMO_AUTH_SECRET = [Convert]::ToHexString($secretBytes)
Assert-PortFree 8787
Assert-PortFree 4173

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
$seedSql = @"
insert into lm_demo_users(id,username,role) values
('00000000-0000-4000-8000-000000000201','dev-organizer','organizer'),
('00000000-0000-4000-8000-000000000202','dev-admin','platform_admin'),
('00000000-0000-4000-8000-000000000203','dev-delegate','delegate')
on conflict (id) do nothing;
insert into lm_demo_memberships(user_id,organization_id) values
('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000101'),
('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000101')
on conflict do nothing;
"@
$seedSql | & $psql -X -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw "Falló la preparación de identidades sintéticas." }
Write-Host "Iniciando backend persistente en http://127.0.0.1:8787" -ForegroundColor Green
$env:PORT = "8787"
$backendLog = Join-Path $env:TEMP "apdb-2027-backend-$PID.log"
$backendError = Join-Path $env:TEMP "apdb-2027-backend-$PID.error.log"
$frontendLog = Join-Path $env:TEMP "apdb-2027-frontend-$PID.log"
$frontendError = Join-Path $env:TEMP "apdb-2027-frontend-$PID.error.log"
$backend = Start-Process -FilePath "node" -ArgumentList "demo_2027_postgres_server.js" -WorkingDirectory $repo -RedirectStandardOutput $backendLog -RedirectStandardError $backendError -PassThru
$env:PORT = "4173"
$frontend = Start-Process -FilePath "node" -ArgumentList "tools\demo-server.cjs" -WorkingDirectory $repo -RedirectStandardOutput $frontendLog -RedirectStandardError $frontendError -PassThru
try {
  $ready = $false
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    if ($backend.HasExited) { Show-LogTail $backendError "error del backend"; throw "El backend terminó durante el arranque. El log se conservó en $backendError" }
    if ($frontend.HasExited) { Show-LogTail $frontendError "error del frontend"; throw "El frontend terminó durante el arranque. El log se conservó en $frontendError" }
    try {
      $health = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:8787/health"
      $front = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:4173/demo_circuito_2027.html?mode=postgres&api=http://127.0.0.1:8787"
      if ($health.StatusCode -eq 200 -and $front.StatusCode -eq 200) { $ready = $true; break }
    } catch { Start-Sleep -Milliseconds 250 }
  }
  if (-not $ready) { throw "No respondieron ambos servicios dentro del tiempo de arranque." }
  Write-Host ($health.Content) -ForegroundColor Green
  $edge = @("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", "C:\Program Files\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
  $url = "http://127.0.0.1:4173/demo_circuito_2027.html?mode=postgres&api=http://127.0.0.1:8787"
  if ($edge) { Start-Process $edge $url } else { Write-Host "Edge no encontrado; abrí manualmente la URL indicada." -ForegroundColor Yellow }
  Write-Host "Interfaz integrada: $url" -ForegroundColor Green
  Write-Host "Backend:  http://127.0.0.1:8787/health" -ForegroundColor Green
  Write-Host "Presioná Ctrl+C para detener ambos servicios." -ForegroundColor Yellow
  while ($true) {
    if ($backend.HasExited) { Show-LogTail $backendError "error del backend"; throw "El backend terminó. El log se conservó en $backendError" }
    if ($frontend.HasExited) { Show-LogTail $frontendError "error del frontend"; throw "El frontend terminó. El log se conservó en $frontendError" }
    Start-Sleep -Seconds 1
  }
}
finally {
  if ($frontend -and -not $frontend.HasExited) { Stop-Process -Id $frontend.Id -Force }
  if ($backend -and -not $backend.HasExited) { Stop-Process -Id $backend.Id -Force }
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:LM_REQUIRE_AUTH -ErrorAction SilentlyContinue
  Remove-Item Env:LM_DEMO_AUTH_SECRET -ErrorAction SilentlyContinue
  Write-Host "Logs conservados para diagnóstico:" -ForegroundColor Yellow
  Write-Host "  Backend:  $backendLog / $backendError"
  Write-Host "  Frontend: $frontendLog / $frontendError"
}
