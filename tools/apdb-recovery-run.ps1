# One-command operator flow for a disposable local recovery rehearsal.
# The dump and reports stay outside the repository. Hosted targets are refused.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$DumpPath,
  [Parameter(Mandatory=$true)][string]$TargetDatabase,
  [int]$TargetPort = 5432,
  [string]$OutputDirectory = (Join-Path $env:USERPROFILE 'Documents\APDB-2027-Recovery-Reports'),
  [switch]$ApproveRestore
)
$ErrorActionPreference = 'Stop'
if (-not $ApproveRestore) { throw 'Restore is refused without explicit -ApproveRestore.' }
$root = Split-Path -Parent $PSScriptRoot
$tool = Join-Path $root 'tools\apdb-supabase-restore-local.ps1'
if (-not (Test-Path -LiteralPath $tool)) { throw 'Restore tool is missing.' }
$shell = Get-Command pwsh -ErrorAction SilentlyContinue
if (-not $shell) { $shell = Get-Command powershell -ErrorAction Stop }
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$preflight = & $shell.Source -NoProfile -File $tool -Mode preflight -DumpPath $DumpPath -TargetDatabase $TargetDatabase -TargetPort $TargetPort -OutputDirectory $OutputDirectory
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; restore was not attempted.' }
$result = & $shell.Source -NoProfile -File $tool -Mode restore -DumpPath $DumpPath -TargetDatabase $TargetDatabase -TargetPort $TargetPort -OutputDirectory $OutputDirectory
if ($LASTEXITCODE -ne 0) { throw 'Restore failed; no successful recovery is reported.' }
$safe = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  targetDatabase = $TargetDatabase
  targetHost = 'localhost-only'
  preflight = ($preflight -join "`n")
  result = ($result -join "`n")
  credentialsLogged = $false
  sourceDumpCopied = $false
  verification = 'pending; compare source and destination snapshots before any GO decision'
}
$safe | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $OutputDirectory 'recovery-run-report.json') -Encoding utf8
Write-Output 'APDB_RECOVERY_RUN_COMPLETED_VERIFICATION_PENDING'
