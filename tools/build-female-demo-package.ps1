param([string]$OutputBase)
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$output = if ($OutputBase) { [IO.Path]::GetFullPath($OutputBase) } else { Join-Path $repo "private\apdb-2027-demo-femenino" }
$stage = "$output-stage"
$zip = "$output.zip"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item $stage -ItemType Directory -Force | Out-Null
Copy-Item (Join-Path $repo "demo_circuito_2027.html") (Join-Path $stage "circuito.html")
foreach ($file in @("style.css", "demo_2027_fixture.js", "demo_2027_sports.js", "demo_2027_provider.js", "demo_circuito_2027.js", "demo_2027_http_client.js", "demo_circuito_2027_persistent.js", "demo_2027_documentation_ui.js")) {
  Copy-Item (Join-Path $repo $file) (Join-Path $stage $file)
}
@'
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>APdB 2027 | Demostración Femenino</title>
  <style>
    :root { color-scheme: light; font-family: Arial, sans-serif; }
    body { margin: 0; background: #eef3f7; color: #16324f; }
    .notice { margin: 0; padding: 14px 20px; background: #8a3b08; color: #fff; font-weight: 800; text-align: center; letter-spacing: .03em; }
    iframe { display: block; width: 100%; height: calc(100vh - 54px); min-height: 720px; border: 0; background: #f4f6f8; }
  </style>
</head>
<body>
  <div class="notice" role="alert">DATOS FICTICIOS - DEMOSTRACI&#211;N NO OFICIAL</div>
  <iframe title="Circuito femenino sintético" src="circuito.html"></iframe>
</body>
</html>
'@ | Set-Content (Join-Path $stage "index.html") -Encoding ASCII
@'
# APdB 2027 - demo Femenino aislada
# DATOS FICTICIOS - DEMOSTRACIÓN NO OFICIAL.
# No contiene credenciales, SQL ni .htaccess.
# Instalar en una subcarpeta protegida sin reemplazar archivos existentes.
'@ | Set-Content (Join-Path $stage "INSTALL-DEMO-FEMENINO.txt") -Encoding ASCII
$manifest = Get-ChildItem $stage -Recurse -File | ForEach-Object {
  [PSCustomObject]@{ path = $_.FullName.Substring($stage.Length + 1).Replace("\", "/"); bytes = $_.Length; sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
}
$manifest | ConvertTo-Json -Depth 3 | Set-Content (Join-Path $stage "FILE-MANIFEST.json") -Encoding ASCII
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Get-ChildItem $stage -Force | Select-Object -ExpandProperty FullName) -DestinationPath $zip -CompressionLevel Optimal
Remove-Item $stage -Recurse -Force
Write-Host "Paquete demo femenino creado: $zip"
Write-Host "No incluye .htaccess, credenciales, SQL ni servicios remotos."
