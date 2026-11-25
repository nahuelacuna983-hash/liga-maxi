[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ConfigPath,
  [Parameter(Mandatory=$true)][string]$OutputDirectory,
  [Parameter(Mandatory=$true)][string]$ExpectedCommit,
  [Parameter(Mandatory=$true)][string]$ApprovedConfigSha256,
  [switch]$ApprovePublishableConfiguration
)
$ErrorActionPreference = 'Stop'
if (-not $ApprovePublishableConfiguration) { throw 'Confirm the publishable configuration belongs to authorized APdB Staging; no hosting authorization is implied.' }
$node = Get-Command node -ErrorAction Stop
& $node.Source (Join-Path $PSScriptRoot 'prepare-apdb-cpanel.cjs') $ConfigPath $OutputDirectory $ExpectedCommit $ApprovedConfigSha256
if ($LASTEXITCODE -ne 0) { throw 'Preparation failed. No deployment performed.' }
