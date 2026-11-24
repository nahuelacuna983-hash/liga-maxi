"use strict";
// Generate a public-safe delivery receipt for an ALREADY BUILT package.
// This tool never reads credentials from CLI or fetches external services.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const cp = require("node:child_process");
const assert = require("node:assert/strict");
function sha(buffer) { return crypto.createHash("sha256").update(buffer).digest("hex"); }
function prepare(pkg, destination, commit) {
  assert.match(commit, /^[a-f0-9]{40}$/, "Exact 40-character commit SHA required");
  const root = path.resolve(pkg);
  const receiptPath = path.resolve(destination);
  assert.notEqual(root, receiptPath, "Receipt directory must be outside package");
  assert.ok(!receiptPath.startsWith(root + path.sep), "Do not add receipt to the public package");
  assert.ok(!fs.existsSync(receiptPath), "Receipt destination exists; refusing overwrite");
  const verify = cp.spawnSync(process.execPath, ["tools/verify-apdb-release.cjs", root], {encoding:"utf8"});
  assert.equal(verify.status,0, "Package integrity or allowlist failed");
  const manifest = JSON.parse(fs.readFileSync(path.join(root,"release-integrity.json"),"utf8"));
  assert.equal(manifest.environment,"staging");
  assert.equal(manifest.publicBasePath,"/apdb-2027-prueba/");
  const files = fs.readdirSync(root).sort();
  const hashes = files.map(name => ({file:name, bytes:fs.statSync(path.join(root,name)).size,
    sha256:sha(fs.readFileSync(path.join(root,name)))}));
  const fingerprint = sha(Buffer.from(hashes.map(x=>x.file+" "+x.bytes+" "+x.sha256).join("\n")+"\n"));
  const receipt = {
    format:"apdb-delivery-receipt-v1",
    commit_sha:commit,
    basePath:manifest.publicBasePath,
    environment:manifest.environment,
    files:hashes,
    fingerprint_sha256:fingerprint,
    status:"PREPARED_ONLY_NOT_DEPLOYED",
    reminder:"Valid only for these bytes. This is not evidence of hosting, Auth, Storage or approval of publication."
  };
  fs.mkdirSync(receiptPath,{recursive:true});
  fs.writeFileSync(path.join(receiptPath,"APDB-RELEASE-RECEIPT.json"),JSON.stringify(receipt,null,2)+"\n",{flag:"wx",mode:0o600});
  const markdown = [
    "# APdB 2027 — Constancia de paquete para instalación protegida",
    "",
    "**Estado:** PREPARADO, NO PUBLICADO",
    "**Commit:** `"+commit+"`",
    "**Destino previsto:** `"+manifest.publicBasePath+"`",
    "**Huella del paquete (SHA-256):** `"+fingerprint+"`",
    "**Archivos permitidos:** "+files.length+" (se enumeran en el JSON anexo)",
    "",
    "El paquete debe almacenarse de forma privada hasta la autorización de cPanel.",
    "El manifiesto y esta constancia no prueban accesos de usuario, Storage ni recuperación real de la base de datos.",
    "No incorporar credenciales privadas ni la copia de seguridad a la carpeta pública.",
    ""
  ].join("\n");
  fs.writeFileSync(path.join(receiptPath,"APDB-CONSTANCIA-ENTREGA.md"),markdown,{flag:"wx",mode:0o600});
  return {fileCount:files.length,fingerprint};
}
if(require.main===module) {
  try {
    assert.equal(process.argv.length,5,"Usage: node tools/apdb-package-receipt.cjs <package-dir> <new-private-receipt-dir> <commit-sha>");
    const result=prepare(process.argv[2],process.argv[3],process.argv[4]);
    console.log("APDB_PRIVATE_HANDOFF_RECEIPT_OK files="+result.fileCount+" fingerprint="+result.fingerprint);
  } catch(e) {
    // Never echo paths or sensitive inputs.
    console.error("APDB_PRIVATE_HANDOFF_RECEIPT_FAILED "+e.message);
    process.exitCode=1;
  }
}
module.exports={prepare};
