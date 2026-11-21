'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { Client } = require('pg');

const BASE = 'supabase/migrations/20261111000000_apdb_isolated_schema.sql';
const RPC = 'supabase/migrations/20261120000000_apdb_automatic_document_audit_rpc.sql';
const ids = {
  org: '00000000-0000-4000-8000-000000000101', tournament: '00000000-0000-4000-8000-000000000102',
  category: '00000000-0000-4000-8000-000000000103', team: '00000000-0000-4000-8000-000000000104',
  requirement: '00000000-0000-4000-8000-000000000105', document: '00000000-0000-4000-8000-000000000106',
  worker: '00000000-0000-4000-8000-000000000107', delegate: '00000000-0000-4000-8000-000000000108',
  unknown: '00000000-0000-4000-8000-000000000109',
};

async function main() {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL es obligatorio');
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const identity = await db.query('select current_database() as database');
    assert.equal(identity.rows[0].database, process.env.APDB_OCR_DATABASE || 'liga_maxi_ocr', 'OCR debe ejecutarse en su base aislada');
    await db.query(`create schema if not exists auth;
      create or replace function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      do $$ begin
        create role authenticated nologin;
      exception when duplicate_object then null; end $$;
      do $$ begin
        create role anon nologin;
      exception when duplicate_object then null; end $$;`);
    await db.query(fs.readFileSync(BASE, 'utf8'));
    await db.query(fs.readFileSync(RPC, 'utf8'));
    await db.query(`insert into organizaciones(id,nombre,slug) values ($1,'OCR Test Org','ocr-test')`, [ids.org]);
    await db.query(`insert into torneos(id,organizacion_id,nombre,temporada) values ($1,$2,'OCR Test Tournament','2027')`, [ids.tournament, ids.org]);
    await db.query(`insert into categorias(id,torneo_id,nombre) values ($1,$2,'OCR Test Category')`, [ids.category, ids.tournament]);
    await db.query(`insert into equipos(id,categoria_id,nombre) values ($1,$2,'OCR Test Team')`, [ids.team, ids.category]);
    await db.query(`insert into document_requirements(id,organizacion_id,torneo_id,categoria_id,nombre,scope,obligatorio)
      values ($1,$2,$3,$4,'Apto sintético','team',true)`, [ids.requirement, ids.org, ids.tournament, ids.category]);
    await db.query(`insert into team_documents(id,requirement_id,organizacion_id,torneo_id,categoria_id,equipo_id,equipo_nombre,file_name,status)
      values ($1,$2,$3,$4,$5,$6,'OCR Test Team','ocr-test.pdf','cargado')`, [ids.document, ids.requirement, ids.org, ids.tournament, ids.category, ids.team]);
    await db.query(`insert into document_audit_criteria_versions(version,title,criteria) values ('APDB_MAXI_2026_V1','OCR test','{}')`);
    await db.query(`insert into app_users(auth_user_id,organizacion_id,display_name,email,role)
      values ($1,$2,'OCR Worker','worker@ocr-test.invalid','auditor_ocr'),($3,$2,'Delegate','delegate@ocr-test.invalid','delegado')`, [ids.worker, ids.org, ids.delegate]);

    const payload = {
      scope: 'team', team_document_id: ids.document, organizacion_id: ids.org, torneo_id: ids.tournament,
      categoria_id: ids.category, equipo_id: ids.team, equipo_nombre: 'OCR Test Team', requirement_id: ids.requirement,
      requirement_nombre: 'Apto sintético', criteria_version: 'APDB_MAXI_2026_V1', audit_status: 'revisar',
      summary: 'Requiere revisión humana', findings: { human_decision_required: true }, extracted_text: 'sintético',
      detected_dates: [], checks: { name_matches: null }, model: 'local-test', raw_response: { synthetic: true },
      source_kind: 'local_file', source_file_id: 'ocr-test.pdf', source_hash: 'hash-one', page_evidence: [],
      file_name: 'ocr-test.pdf', file_type: 'application/pdf', confidence: 0.91,
    };
    const asRole = async (role, userId, callback) => {
      await db.query('begin');
      try {
        await db.query(`set local role ${role}`);
        await db.query(`select set_config('request.jwt.claim.sub',$1,true)`, [userId || '']);
        const value = await callback();
        await db.query('rollback');
        return value;
      } catch (error) {
        await db.query('rollback');
        throw error;
      }
    };
    const call = () => db.query(`select public.apdb_record_automatic_document_audit($1::jsonb) as id`, [JSON.stringify(payload)]);

    const authorizationDenied = /permission denied for function (public\.)?apdb_record_automatic_document_audit|identidad no autorizada|autenticacion requerida/;
    await assert.rejects(() => asRole('anon', null, call), authorizationDenied);
    console.log('APDB_OCR_NEGATIVE_ANON_OK');
    await assert.rejects(() => asRole('authenticated', ids.delegate, call), /identidad no autorizada/);
    console.log('APDB_OCR_NEGATIVE_DELEGATE_OK');
    await assert.rejects(() => asRole('authenticated', ids.unknown, call), /identidad no autorizada/);
    console.log('APDB_OCR_NEGATIVE_UNAUTHORIZED_USER_OK');

    const first = await asRole('authenticated', ids.worker, call);
    assert.match(first.rows[0].id, /^[0-9a-f-]{36}$/);
    console.log('APDB_OCR_POSITIVE_WORKER_OK');
    const duplicate = await asRole('authenticated', ids.worker, call);
    assert.equal(duplicate.rows[0].id, first.rows[0].id);
    console.log('APDB_OCR_IDEMPOTENCY_OK');
    const reanalysis = { ...payload, source_hash: 'hash-two', raw_response: { synthetic: true, revision: 2 } };
    const second = await asRole('authenticated', ids.worker, () => db.query(`select public.apdb_record_automatic_document_audit($1::jsonb) as id`, [JSON.stringify(reanalysis)]));
    assert.notEqual(second.rows[0].id, first.rows[0].id);
    console.log('APDB_OCR_REANALYSIS_APPEND_ONLY_OK');

    await assert.rejects(() => asRole('authenticated', ids.worker, () => db.query(`select public.apdb_record_automatic_document_audit($1::jsonb)`, [JSON.stringify({ ...payload, team_document_id: '00000000-0000-4000-8000-000000000999' })])), /fuera de contexto|inexistente/);
    await assert.rejects(() => asRole('authenticated', ids.worker, () => db.query(`select public.apdb_record_automatic_document_audit($1::jsonb)`, [JSON.stringify({ ...payload, approved: true })])), /campo no permitido|decision humana/);
    console.log('APDB_OCR_NEGATIVE_SCOPE_AND_HUMAN_DECISION_OK');

    const privileges = await db.query(`select has_function_privilege('authenticated','public.apdb_record_automatic_document_audit(jsonb)','execute') auth_exec,
      has_function_privilege('anon','public.apdb_record_automatic_document_audit(jsonb)','execute') anon_exec,
      has_table_privilege('authenticated','public.document_ai_audits','insert') direct_insert,
      prosecdef, proconfig from pg_proc where oid='public.apdb_record_automatic_document_audit(jsonb)'::regprocedure`);
    assert.equal(privileges.rows[0].auth_exec, true);
    assert.equal(privileges.rows[0].anon_exec, false);
    assert.equal(privileges.rows[0].direct_insert, false);
    assert.equal(privileges.rows[0].prosecdef, true);
    assert.deepEqual(privileges.rows[0].proconfig, ['search_path=public, auth']);
    console.log('APDB_OCR_PRIVILEGE_CONTRACT_OK');
    const documents = await db.query('select status, reviewed_by from team_documents where id=$1', [ids.document]);
    assert.equal(documents.rows[0].status, 'cargado');
    assert.equal(documents.rows[0].reviewed_by, null);
    const audits = await db.query('select count(*)::int count from document_ai_audits where team_document_id=$1', [ids.document]);
    assert.equal(audits.rows[0].count, 2);
    console.log('APDB_OCR_DOCUMENT_IMMUTABILITY_OK');
    console.log('APDB_DOCUMENT_AI_RPC_INTEGRATION_OK');
  } finally { await db.end(); }
}

main().catch((error) => { console.error(`APDB_DOCUMENT_AI_RPC_INTEGRATION_FAILED ${error.message}`); process.exitCode = 1; });
