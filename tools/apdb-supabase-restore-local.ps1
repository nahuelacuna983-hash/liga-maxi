# APdB 2027: restore one Supabase-compatible dump into a disposable localhost database.
# Credentials come from PGPASSFILE/PGPASSWORD or an interactive secure prompt and are never logged.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][ValidateSet('preflight','restore')][string]$Mode,
  [Parameter(Mandatory=$true)][string]$DumpPath,
  [Parameter(Mandatory=$true)][string]$TargetDatabase,
  [string]$TargetHost = '127.0.0.1',
  [int]$TargetPort = 5432,
  [string]$TargetUser = 'postgres',
  [string]$OutputDirectory = (Join-Path $env:TEMP 'apdb-supabase-restore')
)
$ErrorActionPreference = 'Stop'

function Fail([string]$Message) { throw $Message }
if ($TargetHost -notin @('127.0.0.1','localhost','::1')) { Fail 'Target must be localhost; hosted Supabase and remote targets are refused.' }
if ($TargetDatabase -notmatch '^(?i:apdb_)[a-z0-9_]*(?i:restore|test|disposable)[a-z0-9_]*$') { Fail 'Target database name must start apdb_ and contain restore, test, or disposable.' }
if ($TargetDatabase -match '(?i)production|staging|liga|maxi|2026') { Fail 'Target database name is not disposable.' }
if ($TargetPort -lt 1 -or $TargetPort -gt 65535) { Fail 'Invalid target port.' }
$dump = (Resolve-Path -LiteralPath $DumpPath -ErrorAction Stop).Path
if ((Get-Item -LiteralPath $dump).Length -lt 1024) { Fail 'Dump is missing or unexpectedly small.' }
if (-not (Test-Path -LiteralPath $OutputDirectory)) { New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null }

foreach ($tool in @('psql','pg_restore')) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { Fail "Missing PostgreSQL 17 client tool: $tool" }
}
$version = (& pg_restore --version) -join ' '
if ($LASTEXITCODE -ne 0 -or $version -notmatch '17([.]|\s|$)') { Fail "PostgreSQL 17 client required: $version" }
$psqlVersion = (& psql --version) -join ' '
if ($LASTEXITCODE -ne 0 -or $psqlVersion -notmatch '17([.]|\s|$)') { Fail "PostgreSQL 17 psql required: $psqlVersion" }

$oldPassword = $env:PGPASSWORD
$prompted = $false
try {
  if (-not $env:PGPASSFILE -and -not $env:PGPASSWORD) {
    $secure = Read-Host 'PostgreSQL password (hidden)' -AsSecureString
    $env:PGPASSWORD = [System.Net.NetworkCredential]::new('', $secure).Password
    $prompted = $true
  }
  $common = @("--host=$TargetHost","--port=$TargetPort","--username=$TargetUser","--dbname=$TargetDatabase")
  # Restore must target a newly created throwaway database, not an initialized Supabase service database.
  $empty = (& psql @common -X -v ON_ERROR_STOP=1 -At -c "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p','v','m','f') and n.nspname not in ('pg_catalog','information_schema') and not exists (select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')")
  if ($LASTEXITCODE -ne 0) { Fail 'Unable to connect to target database.' }
  if ([int]$empty -ne 0) { Fail 'Target database is not empty; refusing restore.' }
  # The archive restores managed schemas; a pristine target will not contain auth/storage yet.
  $capabilities = (& psql @common -X -v ON_ERROR_STOP=1 -At -F '|' -c "select current_setting('server_version_num'), exists(select 1 from pg_available_extensions where name='supabase_vault')")
  if ($LASTEXITCODE -ne 0) { Fail 'Unable to inspect target capabilities.' }
  $capabilityParts = $capabilities.Trim().Split('|')
  if ($capabilityParts.Count -ne 2 -or [int]$capabilityParts[0] -lt 170000 -or $capabilityParts[1] -ne 't') { Fail "Target is not a compatible Supabase PG17 database: $capabilities" }
  $catalog = Join-Path $OutputDirectory ((Get-Item $dump).BaseName + '.catalog.txt')
  & pg_restore --list $dump | Set-Content -LiteralPath $catalog -Encoding utf8
  if ($LASTEXITCODE -ne 0) { Fail 'pg_restore could not read the dump catalog.' }
  if ($Mode -eq 'preflight') {
    Write-Output "APDB_SUPABASE_RESTORE_PREFLIGHT_OK target=$TargetHost database=$TargetDatabase capabilities=$($capabilities.Trim())"
    return
  }
  & pg_restore --single-transaction --exit-on-error --no-owner --no-acl @('--host='+$TargetHost,'--port='+$TargetPort,'--username='+$TargetUser,'--dbname='+$TargetDatabase) $dump
  if ($LASTEXITCODE -ne 0) { Fail 'pg_restore failed; no successful restore is reported.' }
  $checks = (& psql @common -X -v ON_ERROR_STOP=1 -At -F '|' -c "select current_setting('server_version_num')::integer >= 170000, exists(select 1 from pg_extension where extname='supabase_vault'), to_regnamespace('auth') is not null, to_regnamespace('storage') is not null, (select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r') > 0")
  if ($LASTEXITCODE -ne 0 -or $checks.Trim() -notmatch '^t\|t\|t\|t\|t$') { Fail "Restored database failed compatibility checks: $checks" }
  $archive = Get-Item -LiteralPath $dump
  $hash = (Get-FileHash -LiteralPath $dump -Algorithm SHA256).Hash
  $manifest = [ordered]@{ generatedAt=(Get-Date).ToUniversalTime().ToString('o'); targetHost=$TargetHost; targetPort=$TargetPort; targetDatabase=$TargetDatabase; dump=$archive.Name; bytes=$archive.Length; sha256=$hash; restoreExecuted=$true; verificationPending=$true; aclLimitation='The manifest does not claim ACL recovery when the source dump was generated with --no-acl.' }
  $manifestPath = Join-Path $OutputDirectory ($archive.BaseName + '.restore-manifest.json')
  $manifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding utf8
  Write-Output "APDB_SUPABASE_RESTORE_EXECUTED_VERIFICATION_PENDING manifest=$manifestPath bytes=$($archive.Length) sha256=$hash"
} finally {
  if ($prompted) { $env:PGPASSWORD = $oldPassword }
}
