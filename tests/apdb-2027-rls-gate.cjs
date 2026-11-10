"use strict";
/**
 * APdB 2027: bloqueo de escrituras no autorizadas (metadatos, sin PII).
 * Solamente contra una base AISLADA. No instala políticas ni modifica datos.
 * Uso:
 *  APDB_ISOLATED_DATABASE=YES DATABASE_URL=... node tests/apdb-2027-rls-gate.cjs
 */
const assert = require("node:assert/strict");
const { Pool } = require("pg");

const protectedTables = [
  "categorias", "partidos", "playoff_matches", "match_schedules",
  "player_documents", "team_documents", "document_requirements",
  "app_users", "app_user_permissions", "team_players",
];
const sensitiveViews = [
  "v_team_documents_admin", "v_player_documents_admin",
  "v_drive_player_documents_admin", "v_document_audit_results_admin",
  "v_app_user_permissions",
];

async function main() {
  assert.equal(process.env.APDB_ISOLATED_DATABASE, "YES",
    "Refusado: indicá APDB_ISOLATED_DATABASE=YES únicamente para una base aislada");
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL obligatorio");
  const connection = new URL(process.env.DATABASE_URL);
  const host = (connection.hostname || "").toLowerCase();
  const database = decodeURIComponent(connection.pathname.replace(/^\//, ""));
  const localHost = ["127.0.0.1", "localhost", "::1"].includes(host);
  const allowedDatabase = process.env.APDB_ALLOWED_DATABASE || "";
  const databaseNameAllowed = allowedDatabase
    ? database === allowedDatabase
    : /^(liga_maxi|apdb)[_-][a-z0-9_-]+$/i.test(database);
  assert.ok(!host.endsWith("supabase.co") && !host.endsWith("supabase.com"),
    "Refusado: el gate no puede conectarse a Supabase");
  assert.ok(localHost || process.env.APDB_ALLOW_NONLOCAL_ISOLATED === "YES",
    "Refusado: la base debe ser local; para staging aislado se requiere APDB_ALLOW_NONLOCAL_ISOLATED=YES");
  assert.ok(databaseNameAllowed,
    `Refusado: nombre de base no aislada (${database || "vacío"})`);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    const { rows: identity } = await client.query(`
      select current_database() as database,
             inet_server_addr()::text as address,
             current_setting('server_version') as server_version
    `);
    assert.equal(identity[0].database, database, "La base conectada no coincide con DATABASE_URL");
    console.log(`APDB_RLS_TARGET_VERIFIED database=${identity[0].database} address=${identity[0].address || host} server=${identity[0].server_version}`);
    await client.query("BEGIN TRANSACTION READ ONLY");
    const { rows: tables } = await client.query(`
      SELECT c.relname AS name, c.relrowsecurity AS rls,
        has_table_privilege('anon', c.oid, 'INSERT') AS insert_allowed,
        has_table_privilege('anon', c.oid, 'UPDATE') AS update_allowed,
        has_table_privilege('anon', c.oid, 'DELETE') AS delete_allowed
      FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
        AND c.relkind IN ('r', 'p')
    `, [protectedTables]);
    const byName = new Map(tables.map((r) => [r.name, r]));
    const missing = protectedTables.filter((name) => !byName.has(name));
    if (missing.length) {
      throw new Error(`Faltan tablas críticas: ${missing.join(", ")}`);
    }
    const issues = [];
    const grantReviews = [];
    for (const row of tables) {
      if (!row.rls) issues.push(`RLS apagada: ${row.name}`);
      if (row.insert_allowed || row.update_allowed || row.delete_allowed) {
        // Un GRANT no demuestra por sí solo que una escritura sea posible:
        // PostgreSQL combina grants con RLS y todas las políticas aplicables.
        // La denegación efectiva se prueba en tests/apdb-rls-negative.sql.
        grantReviews.push(`GRANT de escritura anon presente: ${row.name}`);
      }
    }
    const { rows: views } = await client.query(`
      SELECT c.relname AS name,
        has_table_privilege('anon', c.oid, 'SELECT') AS read_allowed
      FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relkind = 'v'
        AND c.relname = ANY($1::text[])
    `, [sensitiveViews]);
    const missingViews = sensitiveViews.filter((name) => !views.some((view) => view.name === name));
    if (missingViews.length) {
      throw new Error(`Faltan vistas administrativas requeridas: ${missingViews.join(", ")}`);
    }
    for (const view of views) if (view.read_allowed)
      issues.push(`Vista administrativa accesible por anon: ${view.name}`);
    const { rows: policies } = await client.query(`
      SELECT tablename, count(*)::int AS policy_count
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = ANY($1::text[])
      GROUP BY tablename
    `, [protectedTables]);
    const policyCounts = new Map(policies.map((row) => [row.tablename, row]));
    for (const table of protectedTables) {
      const policy = policyCounts.get(table);
      if (!policy || policy.policy_count < 1) issues.push(`Sin políticas RLS declaradas: ${table}`);
    }
    const { rows: funcs } = await client.query(`
      SELECT p.proname AS name,
        pg_get_function_identity_arguments(p.oid) AS signature,
        coalesce(array_to_string(p.proconfig, ','), '') AS config
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.prosecdef
        AND has_function_privilege('anon', p.oid, 'EXECUTE')
    `);
    for (const fn of funcs)
      issues.push(`SECURITY DEFINER ejecutable por anon (revisar validaciones internas): ${fn.name}(${fn.signature})`);
    const { rows: definerFunctions } = await client.query(`
      SELECT p.proname AS name,
        pg_get_function_identity_arguments(p.oid) AS signature,
        coalesce(array_to_string(p.proconfig, ','), '') AS config
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.prosecdef
    `);
    for (const fn of definerFunctions) {
      if (!/(^|,)search_path=/.test(fn.config)) {
        issues.push(`SECURITY DEFINER con search_path mutable: ${fn.name}(${fn.signature})`);
      }
    }
    await client.query("ROLLBACK");
    console.log(`APDB_RLS_GATE_SCANNED tables=${tables.length} views=${views.length} policies=${policies.reduce((total, row) => total + row.policy_count, 0)} definer_anon=${funcs.length}`);
    for (const review of grantReviews) console.warn("APDB_GRANT_REVIEW_REQUIRED " + review);
    if (missing.length) console.log("TABLAS_NO_PRESENTES " + missing.join(", "));
    if (issues.length) {
      for (const issue of issues) console.error("APDB_SECURITY_REVIEW_REQUIRED " + issue);
      process.exitCode = 1;
    } else {
      console.log("APDB_RLS_GATE_CATALOG_OK");
    }
    // El gate verifica metadatos, NO sustituye pruebas de usuarios anon/delegado.
  } finally {
    try { await client.query("ROLLBACK"); } catch {}
    client.release();
    await pool.end();
  }
}
main().catch((e) => { console.error("APDB_RLS_GATE_ERROR", e.message); process.exitCode = 1; });
