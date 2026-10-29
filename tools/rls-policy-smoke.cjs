const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20261029_restrict_partidos_write_by_permission.sql'), 'utf8');

function assertPolicyMatrix() {
  assert.match(migration, /revoke insert, update, delete on public\.partidos from public, anon, authenticated/i);
  assert.doesNotMatch(migration, /grant update \(puntos_local, puntos_visitante, estado_resultado, cargado_por, cargado_en\)/i);
  assert.doesNotMatch(migration, /grant (?:all|insert|delete|update) .*partidos.*\b(?:anon|public)\b/i);
  assert.match(migration, /permission\.user_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /permission\.can_load_results and permission\.equipo_id in \(home_team\.id, away_team\.id\)/i);
  assert.match(migration, /permission\.can_correct_results and permission\.equipo_id is null/i);
  assert.match(migration, /permission\.can_correct_results[\s\S]*permission\.equipo_id in \(home_team\.id, away_team\.id\)/i);
  assert.match(migration, /p\.user_id = auth\.uid\(\)/i);
  assert.match(migration, /p\.can_manage_tournaments is true/i);
  assert.match(migration, /revoke insert, update, delete on public\.app_user_permissions from public, anon, authenticated/i);
  assert.match(migration, /create policy "app permissions own read"/i);
  assert.match(migration, /revoke insert, update, delete on public\.delegados, public\.delegado_categorias, public\.equipos/i);
  assert.match(migration, /create or replace function public\.cargar_resultado_partido/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = public, pg_temp/i);
  assert.match(migration, /grant execute on function public\.cargar_resultado_partido\(uuid, integer, integer\)[\s\S]*to authenticated/i);
  assert.doesNotMatch(migration, /grant execute on function public\.cargar_resultado_partido[\s\S]*to anon/i);
  assert.match(migration, /estado_resultado is not null[\s\S]*se requiere permiso de correccion/i);
  assert.match(migration, /Fecha bloqueada/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /El fixture contiene equipos fuera de la categoria/i);
  assert.match(migration, /El fixture contiene parejas duplicadas/i);
  assert.match(migration, /El fixture repite un equipo en la misma jornada/i);
  assert.match(migration, /El fixture usa una fecha bloqueada/i);
  assert.match(migration, /El fixture supera el limite de partidos/i);
  assert.match(migration, /create or replace function public\.publicar_fixture_categoria/i);
  assert.match(migration, /revoke insert, update, delete on public\.partidos from public, anon, authenticated/i);
  assert.doesNotMatch(migration, /for insert[\s\S]*to authenticated[\s\S]*with check \(\s*true\s*\)/i);
}

assertPolicyMatrix();
console.log('RLS_POLICY_SMOKE_OK');
