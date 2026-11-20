'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync('supabase/migrations/20261120000000_apdb_automatic_document_audit_rpc.sql', 'utf8');
const adapter = fs.readFileSync('tools/document-audit-local/src/document-ai-adapter.cjs', 'utf8');

for (const fragment of [
  'security definer', 'set search_path = public, auth', "role = 'auditor_ocr'",
  "raise exception 'autenticacion requerida'", "raise exception 'identidad no autorizada",
  'document_audit_criteria_versions', 'team_documents', 'player_documents',
  'human_decision_required', 'source_hash', 'return existing_id',
  'revoke all on function', 'grant execute on function', 'revoke all on public.document_ai_audits',
]) assert.match(migration, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), fragment);
assert.match(adapter, /raw_response/);
assert.match(adapter, /page_evidence/);
assert.match(adapter, /human_decision_required/);
assert.doesNotMatch(migration, /insert into public\.team_documents|update public\.team_documents|delete from public\.team_documents/i);
assert.doesNotMatch(migration, /service_role|sb_secret|DATABASE_URL|PGPASSWORD/i);
console.log('APDB_DOCUMENT_AUDIT_RPC_CONTRACT_OK restricted_worker=true no_direct_document_write=true');
