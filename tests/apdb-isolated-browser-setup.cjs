"use strict";
const crypto = require("node:crypto");
const { Client } = require("pg");

for (const key of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL", "GITHUB_ENV"]) {
  if (!process.env[key]) throw new Error(`${key} is required`);
}
if (/supabase\.co$/i.test(process.env.SUPABASE_URL)) throw new Error("Hosted Supabase target refused");
const run = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
const email = `browser-association-${run}@example.invalid`;
const delegateEmail = `browser-delegate-${run}@example.invalid`;
const password = `Browser-${crypto.randomBytes(12).toString("hex")}!a1`;
const browserCategories = [];

(async () => {
  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true })
  });
  if (response.status !== 200) throw new Error(`browser auth setup failed: ${response.status}`);
  const user = await response.json();
  const delegateResponse = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ email: delegateEmail, password, email_confirm: true })
  });
  if (delegateResponse.status !== 200) throw new Error(`browser delegate setup failed: ${delegateResponse.status}`);
  const delegate = await delegateResponse.json();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("insert into app_users (id, auth_user_id, organizacion_id, display_name, role) values ($1,$1,'10000000-0000-0000-0000-000000000001',$2,'asociacion')", [user.id, `Browser Asociación ${run}`]);
    await client.query("insert into app_user_permissions (user_id, organizacion_id, torneo_id, categoria_id, can_view, can_load_results, can_correct_results, can_manage_tournaments) values ($1,'10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',true,true,true,true)", [user.id]);
    await client.query("insert into app_users (id, auth_user_id, organizacion_id, display_name, role) values ($1,$1,'10000000-0000-0000-0000-000000000001',$2,'delegado')", [delegate.id, `Browser Delegado ${run}`]);
    await client.query("insert into app_user_permissions (user_id, organizacion_id, torneo_id, categoria_id, equipo_id, equipo_nombre, can_view, can_load_results) values ($1,'10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','Equipo sintético A',true,true)", [delegate.id]);
    const formats = [4, 6, 8];
    for (const format of formats) {
      const categoryId = crypto.randomUUID();
      browserCategories.push({ categoryId, name: `Chromium Top ${format} ${run}`, format });
      await client.query(
        "insert into categorias (id, torneo_id, nombre, estado, formato, playoffs, clasificados, series_playoff) values ($1,'20000000-0000-0000-0000-000000000001',$2,'en_juego',$3,true,$4,'{}'::jsonb)",
        [categoryId, `Chromium Top ${format} ${run}`, `Top ${format}`, format]
      );
      const teams = [];
      for (let index = 1; index <= format; index += 1) {
        const teamId = crypto.randomUUID();
        const teamName = `C${format} Equipo ${index} ${run}`;
        teams.push(teamName);
        await client.query("insert into equipos (id, categoria_id, nombre, orden_inicial) values ($1,$2,$3,$4)", [teamId, categoryId, teamName, index]);
      }
      let matchNumber = 0;
      for (let local = 0; local < teams.length; local += 1) {
        for (let visitor = local + 1; visitor < teams.length; visitor += 1) {
          matchNumber += 1;
          await client.query(
            "insert into partidos (id, categoria_id, local, visitante, jornada, fecha, puntos_local, puntos_visitante, estado_resultado) values ($1,$2,$3,$4,$5,$6,80,70,'cargado')",
            [crypto.randomUUID(), categoryId, teams[local], teams[visitor], matchNumber, `2027-07-${String(Math.min(matchNumber, 28)).padStart(2, "0")}`]
          );
        }
      }
      await client.query("insert into app_user_permissions (user_id, organizacion_id, torneo_id, categoria_id, can_view, can_load_results, can_correct_results, can_manage_tournaments) values ($1,'10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',$2,true,true,true,true)", [user.id, categoryId]);
    }
  } finally { await client.end(); }
  const credentialsFile = require("node:path").join(process.env.RUNNER_TEMP || require("node:os").tmpdir(), `apdb-browser-${run}.json`);
  require("node:fs").writeFileSync(credentialsFile, JSON.stringify({ association: { email, password }, delegate: { email: delegateEmail, password } }), { encoding: "utf8", mode: 0o600 });
  require("node:fs").appendFileSync(process.env.GITHUB_ENV, `APDB_BROWSER_CREDENTIALS_FILE=${credentialsFile}\nAPDB_BROWSER_PLAYOFF_CATEGORIES=${Buffer.from(JSON.stringify(browserCategories)).toString("base64")}\n`);
  console.log("APDB_ISOLATED_BROWSER_USER_READY");
})().catch((error) => { console.error(`APDB_ISOLATED_BROWSER_SETUP_FAILED ${error.message}`); process.exitCode = 1; });
