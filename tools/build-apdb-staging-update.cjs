'use strict';

const fs = require('node:fs');
const path = require('node:path');

const output = path.resolve(process.argv[2] || 'dist/apdb-2027-staging-update');
if (fs.existsSync(output)) throw new Error(`Refusing to overwrite ${output}`);
fs.mkdirSync(output, { recursive: true });

const stagingUrl = 'https://wffvmthdmmjwspnozyrv.supabase.co';
let html = fs.readFileSync('index_online.html', 'utf8');
let app = fs.readFileSync('app_online.js', 'utf8');
app = app.replace(/const APDB_PRODUCTION_SUPABASE_URL = "https:\/\/[^\"]+\.supabase\.co";/, 'const APDB_PRODUCTION_SUPABASE_URL = "";');
app = app.replace(/window\.APDB_SUPABASE_URL \|\| "https:\/\/[^\"]+\.supabase\.co"/g, 'window.APDB_SUPABASE_URL || ""');
app = app.replace(/window\.APDB_SUPABASE_ANON_KEY \|\| "sb_publishable_[^\"]+"/g, 'window.APDB_SUPABASE_ANON_KEY || ""');
const bootstrap = `<script>window.APDB_STAGING=true;window.APDB_SECURE_RESULT_RPC=true;window.APDB_SUPABASE_URL=${JSON.stringify(stagingUrl)};window.APDB_SUPABASE_ANON_KEY="";</script>`;
html = html.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', `${bootstrap}\n<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`);
fs.writeFileSync(path.join(output, 'index_online.html'), html);
fs.writeFileSync(path.join(output, 'app_online.js'), app);
fs.writeFileSync(path.join(output, 'INSTALL_REQUIRED.txt'), 'Antes de publicar, inyectar únicamente la clave publishable/anon de APdB staging mediante el constructor aprobado. No insertar service_role ni claves de producción.\n');
fs.writeFileSync(path.join(output, 'MANIFEST.json'), `${JSON.stringify({ package: 'apdb-2027-staging-update', target: '/apdb-2027-staging/', stagingUrl, sourceCommit: require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), files: ['index_online.html', 'app_online.js'], keyRequired: true }, null, 2)}\n`);
console.log(`APDB_STAGING_UPDATE_BUILD_OK output=${output} key_required=true`);
