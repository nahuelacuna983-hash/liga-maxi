// Regression contract for APdB 2027 document read remediation.
// Static guard only: does NOT replace isolated database and browser permission tests.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const js = fs.readFileSync(path.join(root, "app_online.js"), "utf8");
const sql = fs.readFileSync(path.join(root, "supabase", "patches", "apdb_2027_team_documents_secure_rpc_draft.sql"), "utf8");

assert.match(js, /\.rpc\("apdb_list_team_documents",\s*\{\s*p_categoria_id:\s*categoriaId\s*\}\)/);
assert.doesNotMatch(js, /\.from\("v_team_documents_admin"\)/);
assert.match(sql, /CREATE OR REPLACE FUNCTION public\.apdb_list_team_documents\(p_categoria_id uuid\)/i);
assert.match(sql, /SECURITY DEFINER/i);
assert.match(sql, /auth\.uid\(\) IS NULL/i);
assert.match(sql, /td\.categoria_id\s*=\s*p_categoria_id/i);
assert.match(sql, /apdb_document_access_allowed\(td\.organizacion_id, td\.categoria_id, td\.equipo_id\)/i);
assert.match(sql, /ALTER VIEW public\.v_team_documents_admin SET \(security_invoker = true\)/i);
assert.match(sql, /REVOKE ALL ON TABLE public\.v_team_documents_admin FROM authenticated/i);
assert.match(sql, /REVOKE ALL ON FUNCTION public\.apdb_list_team_documents\(uuid\) FROM PUBLIC/i);
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.apdb_list_team_documents\(uuid\) TO authenticated/i);
assert.doesNotMatch(sql, /GRANT\s+(?:ALL|SELECT)\s+ON\s+(?:TABLE\s+)?public\.team_documents\s+TO\s+(?:anon|authenticated)/i);
console.log("APDB_DOCUMENT_RPC_STATIC_CONTRACT_OK");
