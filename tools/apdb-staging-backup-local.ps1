# APdB 2027 staging-only backup. Read-only; NEVER run against production.
# Requires PostgreSQL 17 clients in PATH and authorized PGUSER and PGPASSWORD (or pgpass).
# The output contains sensitive database records: keep encrypted and OFF GitHub.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$hostExpected = 'db.wffvmthdmmjwspnozyrv.supabase.co'
if ($env:PGHOST -and $env:PGHOST -ne $hostExpected) { throw 'Incorrect PGHOST; refusing backup' }
if (-not $env:PGUSER) { throw 'PGUSER is missing' }
foreach ($app in @('pg_dump','pg_restore')) {
  if (-not (Get-Command $app -ErrorAction SilentlyContinue)) { throw "Missing $app (PostgreSQL 17 client required)" }
}
$v = (& pg_dump --version) -join ' '
if ($LASTEXITCODE -ne 0 -or $v -notmatch '17([.]|\s|$)') { throw "Use PostgreSQL 17 pg_dump: $v" }
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$dir = (Resolve-Path $OutputDirectory).Path
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$archive = Join-Path $dir "apdb-staging-$stamp.dump"
$catalog = Join-Path $dir "apdb-staging-$stamp.catalog.txt"
$manifest = Join-Path $dir "apdb-staging-$stamp.manifest.txt"
if (Test-Path $archive) { throw 'Backup filename exists: refusing overwrite' }
$env:PGHOST = $hostExpected
$env:PGPORT = '5432'
$env:PGDATABASE = 'postgres'
$env:PGSSLMODE = 'require'
try {
  & pg_dump --host=$hostExpected --port=5432 --username=$env:PGUSER --dbname=postgres --format=custom --no-owner --no-acl --schema=public --schema=auth --schema=storage --schema=supabase_migrations --file=$archive
  if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed: NOT backed up' }
  if (-not (Test-Path $archive) -or (Get-Item $archive).Length -lt 1024) { throw 'Backup missing or too small' }
  & pg_restore --list $archive | Out-File -FilePath $catalog -Encoding utf8
  if ($LASTEXITCODE -ne 0) { throw 'Could not inspect dump catalog' }
  $hash = (Get-FileHash -Path $archive -Algorithm SHA256).Hash
  @(
    'Project: APdB 2027 Staging ONLY',
    "Host: $hostExpected",
    "Created UTC: $((Get-Date).ToUniversalTime().ToString('o'))",
    "Client: $v",
    "Bytes: $((Get-Item $archive).Length)",
    "SHA256: $hash",
    'Status: dump created and catalog read; NOT yet restore-verified',
    'Storage object bytes require a separate authorized export.',
    'Store this dump encrypted, never in GitHub or chat.'
  ) | Set-Content -Path $manifest -Encoding utf8
  Write-Output "Backup generated: $archive"
  Write-Output "Catalog and manifest: $catalog ; $manifest"
} catch {
  if (Test-Path $archive) { Remove-Item $archive -Force -ErrorAction SilentlyContinue }
  throw
}
