'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { Client } = require('pg');

const BASE = 'supabase/migrations/20261111000000_apdb_isolated_schema.sql';
const ADMIN = 'supabase/migrations/20261122000000_apdb_administrative_onboarding_rpc.sql';
const ids = {
  org: '00000000-0000-4000-8000-000000000201', orgOther: '00000000-0000-4000-8000-000000000202',
  actor: '00000000-0000-4000-8000-000000000203', delegate: '00000000-0000-4000-8000-000000000204',
  otherUser: '00000000-0000-4000-8000-000000000205',
  tournament: '00000000-0000-4000-8000-000000000206', category: '00000000-0000-4000-8000-000000000207',
  team: '00000000-0000-4000-8000-000000000208', teamOther: '00000000-0000-4000-8000-000000000209',
  otherTournament: '00000000-0000-4000-8000-000000000210', otherCategory: '00000000-0000-4000-8000-000000000211',
};

async function main() {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL es obligatorio');
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const identity = await db.query('select current_database() as database');
    assert.equal(identity.rows[0].database, process.env.APDB_ADMIN_DATABASE || 'liga_maxi_admin', 'base aislada requerida');
    await db.query(`create schema if not exists auth;
      create or replace function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
      do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;`);
    await db.query(fs.readFileSync(BASE, 'utf8'));
    await db.query(fs.readFileSync(ADMIN, 'utf8'));
    await db.query(`insert into organizaciones(id,nombre,slug) values ($1,'APdB Admin Test','apdb-admin-test'),($2,'Otra Org','otra-org')`, [ids.org, ids.orgOther]);
    await db.query(`insert into torneos(id,organizacion_id,nombre,temporada) values ($1,$2,'Admin Tournament','2027'),($3,$4,'Other Tournament','2027')`, [ids.tournament, ids.org, ids.otherTournament, ids.orgOther]);
    await db.query(`insert into categorias(id,torneo_id,nombre) values ($1,$2,'Admin Category'),($3,$4,'Other Category')`, [ids.category, ids.tournament, ids.otherCategory, ids.otherTournament]);
    await db.query(`insert into equipos(id,categoria_id,nombre) values ($1,$2,'Admin Team'),($3,$4,'Other Team')`, [ids.team, ids.category, ids.teamOther, ids.otherCategory]);
    await db.query(`insert into app_users(id,auth_user_id,organizacion_id,display_name,email,role) values
      ($1,$2,$3,'Asociacion','asoc@synthetic.invalid','asociacion'),
      ($4,$5,$3,'Delegado','delegate@synthetic.invalid','delegado'),
      ($6,$7,$8,'Otra Asociacion','other@synthetic.invalid','asociacion')`,
      [ids.actor, ids.actor, ids.org, ids.delegate, ids.delegate, ids.otherUser, ids.otherUser, ids.orgOther]);
    await db.query(`insert into app_user_permissions(user_id,organizacion_id,can_view,can_manage_tournaments,can_manage_users)
      values ($1,$2,true,true,true),($3,$2,true,false,false),($4,$5,true,true,true)`, [ids.actor, ids.org, ids.delegate, ids.otherUser, ids.orgOther]);

    const asRole = async (role, uid, callback, persist = false) => {
      await db.query('begin');
      try {
        await db.query(`set local role ${role}`);
        await db.query(`select set_config('request.jwt.claim.sub',$1,true)`, [uid || '']);
        const value = await callback();
        await db.query(persist ? 'commit' : 'rollback');
        return value;
      } catch (error) { await db.query('rollback'); throw error; }
    };
    const create = () => db.query(`select * from public.apdb_ensure_tournament_category_teams($1,$2,$3,$4::jsonb)`, ['Admin Tournament', '2027', 'Admin Category', JSON.stringify(['Admin Team', 'Second Team', 'Third Team', 'Fourth Team'])]);
    const denied = /permission denied for function|identidad sin permiso|no autorizado|organizacion/;

    await assert.rejects(() => asRole('anon', null, create), /permission denied for function/);
    console.log('APDB_ADMIN_NEGATIVE_ANON_OK');
    const first = await asRole('authenticated', ids.actor, create, true);
    assert.equal(first.rows.length, 1);
    const second = await asRole('authenticated', ids.actor, create, true);
    assert.deepEqual(second.rows[0], first.rows[0]);
    const counts = await db.query(`select (select count(*) from torneos where id=$1)::int tournaments, (select count(*) from categorias where id=$2)::int categories, (select count(*) from equipos where categoria_id=$2)::int teams`, [ids.tournament, ids.category]);
    assert.deepEqual(counts.rows[0], { tournaments: 1, categories: 1, teams: 4 });
    console.log('APDB_ADMIN_IDEMPOTENCY_OK');

    await assert.rejects(() => asRole('authenticated', ids.delegate, create), denied);
    await assert.rejects(() => asRole('authenticated', ids.otherUser, create), denied);
    console.log('APDB_ADMIN_NEGATIVE_SCOPE_OK');

    const scope = await asRole('authenticated', ids.actor, () => db.query(`select public.apdb_set_delegate_scope($1,$2,$3,$4) as permission_id`, [ids.delegate, ids.tournament, ids.category, ids.team]), true);
    assert.match(scope.rows[0].permission_id, /^[0-9a-f-]{36}$/);
    const revoked = await asRole('authenticated', ids.actor, () => db.query(`select public.apdb_revoke_delegate_scope($1) as revoked`, [scope.rows[0].permission_id]), true);
    assert.equal(revoked.rows[0].revoked, true);
    await assert.rejects(() => asRole('authenticated', ids.delegate, () => db.query(`select public.apdb_set_delegate_scope($1,$2,$3,$4)`, [ids.delegate, ids.otherTournament, ids.otherCategory, ids.teamOther])), denied);
    console.log('APDB_ADMIN_ASSIGN_REVOKE_ISOLATION_OK');

    const privileges = await db.query(`select has_function_privilege('authenticated','public.apdb_ensure_tournament_category_teams(text,text,text,jsonb)','execute') auth_exec,
      has_function_privilege('anon','public.apdb_ensure_tournament_category_teams(text,text,text,jsonb)','execute') anon_exec,
      prosecdef, proconfig from pg_proc where oid='public.apdb_ensure_tournament_category_teams(text,text,text,jsonb)'::regprocedure`);
    assert.equal(privileges.rows[0].auth_exec, true); assert.equal(privileges.rows[0].anon_exec, false);
    assert.equal(privileges.rows[0].prosecdef, true); assert.deepEqual(privileges.rows[0].proconfig, ['search_path=public, auth, pg_temp']);
    console.log('APDB_ADMIN_PRIVILEGE_CONTRACT_OK');
    console.log('APDB_ADMINISTRATIVE_RPC_INTEGRATION_OK');
  } finally { await db.end(); }
}

main().catch((error) => { console.error(`APDB_ADMINISTRATIVE_RPC_INTEGRATION_FAILED ${error.message}`); process.exitCode = 1; });
