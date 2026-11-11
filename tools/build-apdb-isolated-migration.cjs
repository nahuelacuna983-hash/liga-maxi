"use strict";
const fs = require("node:fs");
const path = require("node:path");

const sourcePath = process.argv[2] || "docs/APDB_2027_SUPABASE_METADATA_SOURCE.json";
const outputPath = process.argv[3] || "supabase/migrations/20261111000000_apdb_isolated_schema.sql";
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const tables = source.object_catalog.filter((object) => object.schema === "public" && object.kind === "r");
const tableNames = new Set(tables.map((table) => table.name));
const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
const typeMap = { uuid: "uuid", text: "text", bool: "boolean", int4: "integer", int8: "bigint", date: "date", time: "time", timestamptz: "timestamptz", timestamp: "timestamp", jsonb: "jsonb", numeric: "numeric" };
const defaultSql = (value) => value ? ` default ${value}` : "";

const sql = [];
sql.push(`-- Generated from the authorized metadata snapshot ${source.source_sha256}.`);
sql.push("-- Isolated APdB baseline: original permissive policies and function bodies are not copied.");
sql.push("-- Auth users must be created by Supabase Auth; this migration never inserts auth.users.");
sql.push("begin;");
sql.push("create extension if not exists pgcrypto;");

for (const table of tables) {
  const columns = source.columns.filter((column) => column.table === table.name);
  if (!columns.length) throw new Error(`Missing columns for ${table.name}`);
  sql.push(`create table public.${quote(table.name)} (`);
  sql.push(columns.map((column) => `  ${quote(column.column)} ${typeMap[column.type] || column.type}${column.nullable === "NO" ? " not null" : ""}${defaultSql(column.default)}`).join(",\n"));
  sql.push(");");
}

const constraints = source.constraints.filter((item) => tableNames.has(item.table));
const foreignKeys = constraints.filter((item) => /\bFOREIGN KEY\b/i.test(item.definition));
const localConstraints = constraints.filter((item) => !/\bFOREIGN KEY\b/i.test(item.definition));

// PostgreSQL requires the referenced primary/unique key to exist before a FK.
// The metadata export is not guaranteed to be dependency ordered.
for (const constraint of [...localConstraints, ...foreignKeys]) {
  sql.push(`alter table public.${quote(constraint.table)} add constraint ${quote(constraint.name)} ${constraint.definition};`);
}
const constraintNames = new Set(constraints.map((constraint) => constraint.name));
for (const index of source.indexes.filter((item) => tableNames.has(item.table) && !constraintNames.has(item.name))) {
  const definition = String(index.definition).replace(/^CREATE\s+/i, "create ");
  sql.push(`${definition};`);
}

const publicCatalog = ["organizaciones", "torneos", "categorias", "equipos", "fechas", "fixtures_publicos", "partidos", "playoff_matches", "match_schedules"];
for (const table of tables) {
  sql.push(`alter table public.${quote(table.name)} enable row level security;`);
  if (publicCatalog.includes(table.name)) {
    sql.push(`grant select on public.${quote(table.name)} to anon, authenticated;`);
    sql.push(`create policy ${quote(`${table.name}_isolated_public_read`)} on public.${quote(table.name)} for select to anon, authenticated using (true);`);
  }
}

for (const view of source.views.filter((item) => item.name && item.definition)) {
  sql.push(`-- View definition recovered from metadata; private views are denied to anon below.`);
  sql.push(`create or replace view public.${quote(view.name)} as${String(view.definition).replace(/^\s*select/i, " select")};`);
  if (!view.anon_select) sql.push(`revoke all on public.${quote(view.name)} from anon;`);
}

sql.push("commit;");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${sql.join("\n")}\n`, "utf8");
console.log(`APDB_ISOLATED_MIGRATION_WRITTEN ${outputPath} tables=${tables.length} views=${source.views.length} functions=0 policies=isolated-public-read-only`);
