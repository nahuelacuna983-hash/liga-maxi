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
Copy-Item (Join-Path $repo "app_online.js"),(Join-Path $repo "style.css"),(Join-Path $repo "sw.js"),(Join-Path $repo "icon-192.png"),(Join-Path $repo "icon-512.png") $stage
@{
  name = "APdB 2027 - Prueba privada"
  short_name = "APdB 2027"
  start_url = "./"
  scope = "./"
  display = "standalone"
  background_color = "#0f172a"
  theme_color = "#0f172a"
  icons = @(
    @{ src = "icon-192.png"; sizes = "192x192"; type = "image/png" },
    @{ src = "icon-512.png"; sizes = "512x512"; type = "image/png" }
  )
} | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $stage "manifest.json") -Encoding ASCII
if (Test-Path (Join-Path $repo "assets")) { Copy-Item (Join-Path $repo "assets\*") (Join-Path $stage "assets") -Recurse -Force -ErrorAction SilentlyContinue }
@"
# Instalacion privada APdB 2027
# Proteger esta carpeta desde cPanel Directory Privacy o equivalente antes de compartirla.
# El ZIP no incluye .htaccess: conservar el archivo creado por cPanel.
# Revisar docs/cpanel-options-indexes.htaccess antes de añadir Options -Indexes.
# No contiene credenciales. No subir archivos SQL, docs internos ni backups.
"@ | Set-Content (Join-Path $stage "INSTALL-PRIVATE.txt") -Encoding ASCII

$manifest = Get-ChildItem $stage -Recurse -File | ForEach-Object {
  $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  [PSCustomObject]@{ path = $_.FullName.Substring($stage.Length + 1).Replace("\", "/"); bytes = $_.Length; sha256 = $hash }
}
$manifest | ConvertTo-Json -Depth 3 | Set-Content (Join-Path $stage "FILE-MANIFEST.json") -Encoding ASCII
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Get-ChildItem $stage -Force | Select-Object -ExpandProperty FullName) -DestinationPath $zip -CompressionLevel Optimal
Remove-Item $stage -Recurse -Force
Write-Host "Paquete privado creado: $zip"
Write-Host "Archivos: index.html, app_online.js, style.css, manifest.json, sw.js, iconos y assets"
Write-Host "No incluye SQL, docs, private, credenciales ni node_modules."
