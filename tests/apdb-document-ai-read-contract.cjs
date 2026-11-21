'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync('supabase/migrations/20261121000000_apdb_document_ai_read_rpc.sql', 'utf8');
const app = fs.readFileSync('app_online.js', 'utf8');

assert.match(migration, /apdb_list_document_ai_audits/);
assert.match(migration, /security definer/i);
assert.match(migration, /auth\.uid\(\)/);
assert.match(migration, /actor\.organizacion_id/);
assert.match(migration, /can_review_documents/);
assert.match(migration, /can_load_documents/);
assert.match(migration, /revoke all on function public\.apdb_list_document_ai_audits/);
assert.match(migration, /grant execute on function public\.apdb_list_document_ai_audits\(uuid\) to authenticated/);
assert.match(app, /rpc\("apdb_list_document_ai_audits"/);
assert.doesNotMatch(app, /from\("v_document_ai_audits_latest"\)/);

console.log('APDB_DOCUMENT_AI_READ_CONTRACT_OK scoped_rpc=true anon_blocked=true');
