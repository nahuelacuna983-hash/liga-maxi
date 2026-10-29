const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20261029_restrict_partidos_write_by_permission.sql'), 'utf8');

function assertPolicyMatrix() {
  assert.match(migration, /revoke insert, update, delete on public\.partidos from public, anon, authenticated/i);
  assert.match(migration, /grant update \(puntos_local, puntos_visitante, estado_resultado, cargado_por, cargado_en\)/i);
  assert.doesNotMatch(migration, /grant (?:all|insert|delete|update) .*partidos.*\b(?:anon|public)\b/i);
  assert.match(migration, /p\.user_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /p\.can_load_results and p\.equipo_id in \(e_local\.id, e_visitante\.id\)/i);
  assert.match(migration, /p\.can_correct_results and p\.equipo_id is null/i);
  assert.match(migration, /revoke insert, update, delete on public\.app_user_permissions from public, anon, authenticated/i);
  assert.match(migration, /create policy "app permissions own read"/i);
  assert.match(migration, /revoke insert, update, delete on public\.delegados, public\.delegado_categorias, public\.equipos/i);
  assert.match(migration, /create or replace function public\.cargar_resultado_partido/i);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /grant execute on function public\.cargar_resultado_partido[\s\S]*to authenticated/i);
  assert.doesNotMatch(migration, /grant execute on function public\.cargar_resultado_partido[\s\S]*to anon/i);
  assert.doesNotMatch(migration, /for insert[\s\S]*to authenticated[\s\S]*with check \(\s*true\s*\)/i);
}

assertPolicyMatrix();
console.log('RLS_POLICY_SMOKE_OK');
