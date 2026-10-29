const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = [
  'docs/ejecutar-en-supabase-documentacion-jugadores.sql',
  'docs/ejecutar-en-supabase-documentacion-revision.sql',
  'docs/ejecutar-en-supabase-documentacion-drive.sql',
  'docs/ejecutar-en-supabase-baja-jugadores.sql',
];
const routines = [
  'add_team_player', 'mark_player_document_uploaded', 'review_player_document',
  'review_team_document', 'review_drive_player_document',
  'create_player_from_drive_review', 'request_team_player_deactivation',
  'deactivate_team_player',
];
const text = files.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
const failures = [];
for (const routine of routines) {
  if (!new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${routine}\\b`, 'i').test(text)) failures.push(`${routine}: missing definition`);
  if (!new RegExp(`grant\\s+execute[\\s\\S]{0,240}public\\.${routine}\\b[\\s\\S]{0,120}to\\s+anon`, 'i').test(text)) failures.push(`${routine}: expected legacy anon grant not found`);
}
const definerCount = (text.match(/security\s+definer/gi) || []).length;
if (definerCount < routines.length) failures.push(`expected at least ${routines.length} SECURITY DEFINER declarations, found ${definerCount}`);
if (!/auth\.uid\s*\(\s*\)/i.test(text)) console.log('DOCUMENT_RPC_STATIC_NOTE: no auth.uid() guard found in historical files');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('DOCUMENT_RPC_STATIC_OK');
