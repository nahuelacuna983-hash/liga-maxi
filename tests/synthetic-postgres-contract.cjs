const fs = require('node:fs');
const assert = require('node:assert/strict');

const schema = fs.readFileSync('docs/synthetic-persistence-schema.sql', 'utf8');
const tests = fs.readFileSync('docs/synthetic-persistence-tests.sql', 'utf8');
const roles = fs.readFileSync('docs/synthetic-persistence-roles.sql', 'utf8');
const workflow = fs.readFileSync('.github/workflows/synthetic-postgres-local.yml', 'utf8');

assert.match(schema, /errcode = '55000'/);
assert.match(schema, /security definer\s+set search_path = public/);
assert.match(schema, /user_id = lm_uid\(\) or lm_is_admin\(\)/);
assert.match(tests, /set role lm_app/);
assert.match(tests, /exception when sqlstate '55000'/);
assert.doesNotMatch(tests, /exception when sqlstate 'P0001'/);
assert.match(roles, /grant insert on lm_document_events to lm_app/);
assert.match(workflow, /postgres:16/);
assert.match(workflow, /with:[\s\S]*ref: \$\{\{ inputs\.ref \}\}/);
assert.match(workflow, /synthetic-persistence-tests\.sql/);
console.log('SYNTHETIC_POSTGRES_CONTRACT_OK');
