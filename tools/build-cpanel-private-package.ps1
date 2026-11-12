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

# The offline package opens the existing synthetic circuit. It never loads the
# production client and therefore cannot contact Supabase without an explicit
# future staging package.
$html = Get-Content (Join-Path $repo "demo_circuito_2027.html") -Raw -Encoding UTF8
$html = $html -replace '<body>', '<body><div id="apdb-private-backend-notice" class="notice" role="status"><strong>DATOS FICTICIOS - DEMOSTRACION NO OFICIAL.</strong> Este recorrido funciona en memoria; las operaciones persistentes no estan disponibles sin un backend staging autorizado.</div>'
$html = $html -replace '</body>', '<script src="apdb-private-config.js"></script><script>if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js", { scope: "./" });</script></body>'
$html = $html -replace '<title>APdB 2027 \| Demostración integral</title>', '<title>APdB 2027 | Piloto privado sintético</title>'
$html = $html -replace '</head>', '<link rel="manifest" href="manifest.json"></head>'
$html | Set-Content (Join-Path $stage "index.html") -Encoding UTF8
$app = Get-Content (Join-Path $repo "app_online.js") -Raw -Encoding UTF8
$app = $app -replace 'window\.APDB_SUPABASE_URL \|\| "https://eshbydpsmypflfxpmhyk\.supabase\.co"', 'window.APDB_SUPABASE_URL || ""'
$app = $app -replace 'window\.APDB_SUPABASE_ANON_KEY \|\| "sb_publishable_[^"]+"', 'window.APDB_SUPABASE_ANON_KEY || ""'
$app | Set-Content (Join-Path $stage "app_online.js") -Encoding UTF8
Copy-Item (Join-Path $repo "style.css"),(Join-Path $repo "sw.js"),(Join-Path $repo "icon-192.png"),(Join-Path $repo "icon-512.png") $stage
Copy-Item (Join-Path $repo "demo_circuito_2027.html") $stage -ErrorAction SilentlyContinue
Copy-Item (Join-Path $repo "demo_circuito_2027.js"),(Join-Path $repo "demo_2027_fixture.js"),(Join-Path $repo "demo_2027_sports.js"),(Join-Path $repo "demo_2027_provider.js") $stage
@'
// Deliberately empty in the deployable package. Replace this file only with
// values from an independently authorized staging project.
window.APDB_PRIVATE_CONFIG = Object.freeze({ mode: "offline", url: "", anonKey: "" });
'@ | Set-Content (Join-Path $stage "apdb-private-config.js") -Encoding ASCII
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
# El indice del paquete usa el circuito sintetico existente, sin red ni
# persistencia. app_online.js saneado queda incluido como referencia de la
# futura integracion, pero no se carga en modo offline.
# Para staging, generar otro paquete autorizado con una configuracion publica
# del proyecto aislado; nunca introducir una service-role key.
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
Write-Host "Archivos: index.html, app_online.js saneado, apdb-private-config.js, style.css, manifest.json, sw.js, iconos y assets"
Write-Host "No incluye SQL, docs, private, credenciales ni node_modules."
