param([string]$OutputBase)
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$output = if ($OutputBase) { [IO.Path]::GetFullPath($OutputBase) } else { Join-Path $repo "private\apdb-2027-cpanel-$stamp" }
$zip = "$output.zip"
$stage = "$output-stage"

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item $stage -ItemType Directory -Force | Out-Null
New-Item (Join-Path $stage "assets") -ItemType Directory -Force | Out-Null

# index_online is the current public/association entry point; it is staged as index.html.
Copy-Item (Join-Path $repo "index_online.html") (Join-Path $stage "index.html")
Copy-Item (Join-Path $repo "app_online.js"),(Join-Path $repo "style.css"),(Join-Path $repo "manifest.json"),(Join-Path $repo "sw.js"),(Join-Path $repo "icon-192.png"),(Join-Path $repo "icon-512.png") $stage
if (Test-Path (Join-Path $repo "assets")) { Copy-Item (Join-Path $repo "assets\*") (Join-Path $stage "assets") -Recurse -Force -ErrorAction SilentlyContinue }
@"
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
<Files "sw.js">
  Header set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"
  Header set Pragma "no-cache"
  Header set Expires "0"
</Files>
"@ | Set-Content (Join-Path $stage ".htaccess") -Encoding ASCII

$manifest = Get-ChildItem $stage -Recurse -File | ForEach-Object {
  $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  [PSCustomObject]@{ path = $_.FullName.Substring($stage.Length + 1).Replace("\", "/"); bytes = $_.Length; sha256 = $hash }
}
$manifest | ConvertTo-Json -Depth 3 | Set-Content (Join-Path $stage "MANIFEST.json") -Encoding UTF8
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Get-ChildItem $stage -Force | Select-Object -ExpandProperty FullName) -DestinationPath $zip -CompressionLevel Optimal
Remove-Item $stage -Recurse -Force
Write-Host "Paquete privado creado: $zip"
Write-Host "Archivos: index.html, app_online.js, style.css, manifest.json, sw.js, iconos, assets y .htaccess"
Write-Host "No incluye SQL, docs, private, credenciales ni node_modules."
