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
# This operator entrypoint is intentionally pinned to the previously audited staging dump.
# A newer backup requires a new reviewed hash, never a silent override.
$expectedSha = '8074d05758b2ca40a625ffd1634f013b0f0db93bb3bc9ea5b1380a364296ac11'
$expectedBytes = 487263
$actualDump = (Resolve-Path -LiteralPath $DumpPath -ErrorAction Stop).Path
$archive = Get-Item -LiteralPath $actualDump -ErrorAction Stop
if ($archive.Length -ne $expectedBytes) { throw 'Backup size differs from the approved staging snapshot; restore refused.' }
$actualSha = (Get-FileHash -LiteralPath $actualDump -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualSha -ne $expectedSha) { throw 'Backup checksum differs from the approved staging snapshot; restore refused.' }
$root = Split-Path -Parent $PSScriptRoot
$repoRoot = ([System.IO.Path]::GetFullPath($root)).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
$outputFull = [System.IO.Path]::GetFullPath($OutputDirectory)
if ($outputFull -eq $repoRoot -or $outputFull.StartsWith($repoRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Reports directory must be outside repository.'
}
# localhost can be forwarded to a remote server: operator must independently confirm no SSH/proxy tunnel.
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
  sourceSha256 = $expectedSha
  sourceBytes = $expectedBytes
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
