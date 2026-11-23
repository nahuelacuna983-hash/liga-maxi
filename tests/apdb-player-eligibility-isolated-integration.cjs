"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { Client } = require("pg");

for (const key of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL"]) {
  assert.ok(process.env[key], key + " is required");
}
const base = process.env.SUPABASE_URL.replace(/\/$/, "");
assert.match(base, /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i, "Refuse nonlocal Supabase");
const pass = "Ci-" + crypto.randomBytes(18).toString("hex") + "!aA";
const run = crypto.randomUUID().slice(0, 8);
const orgA = "10000000-0000-0000-0000-000000000001";
const orgB = "10000000-0000-0000-0000-000000000002";
const tA = crypto.randomUUID(), cA = crypto.randomUUID(), eA = crypto.randomUUID(), player = crypto.randomUUID();
const req = crypto.randomUUID();
const users = [
  ["association", orgA, "asociacion"],
  ["delegate", orgA, "delegado"],
  ["foreign", orgB, "asociacion"],
];
async function http(path, { token, method = "POST", body, service = false } = {}) {
  const key = service ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.SUPABASE_ANON_KEY;
  const response = await fetch(base + path, { method, headers: {
    apikey: key, authorization: "Bearer " + (token || key), "content-type": "application/json",
  }, body: body && JSON.stringify(body) });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { code: response.status, data };
}
async function createUser(email) {
  const r = await http("/auth/v1/admin/users", {service:true,body:{email,password:pass,email_confirm:true}});
  assert.equal(r.code,200,JSON.stringify(r.data));
  return r.data.id;
}
async function login(email) {
  const r=await http("/auth/v1/token?grant_type=password",{body:{email,password:pass}});
  assert.equal(r.code,200,JSON.stringify(r.data));
  return r.data.access_token;
}
(async()=>{
  const db=new Client({connectionString:process.env.DATABASE_URL});
  await db.connect();
  try {
    const ids = {};
    for (const [key, org, role] of users) {
      const email = "eligibility-" + key + "-" + run + "@example.invalid";
      ids[key] = { id: await createUser(email), email, org, role };
      await db.query("insert into public.app_users(id,auth_user_id,organizacion_id,display_name,role) values($1,$1,$2,$3,$4)", [ids[key].id,org,key,role]);
      ids[key].token = await login(email);
    }
    await db.query("insert into public.torneos(id,organizacion_id,nombre,temporada) values($1,$2,'Elegibilidad CI','2027')", [tA,orgA]);
    await db.query("insert into public.categorias(id,torneo_id,nombre) values($1,$2,'Categoria CI')", [cA,tA]);
    await db.query("insert into public.equipos(id,categoria_id,nombre) values($1,$2,'Equipo CI')", [eA,cA]);
    await db.query("insert into public.team_players(id,organizacion_id,torneo_id,categoria_id,equipo_id,equipo_nombre,nombre) values($1,$2,$3,$4,$5,'Equipo CI','Jugador CI')", [player,orgA,tA,cA,eA]);
    const rpc = (token,status,reason) => http("/rest/v1/rpc/apdb_set_player_eligibility",{token,body:{p_player_id:player,p_status:status,p_reason:reason}});
    assert.equal((await rpc(null,"habilitado","Prueba anonimo")).code,401,"Anon must not execute");
    assert.equal((await rpc(ids.delegate.token,"habilitado","Intento delegado")).code,403);
    assert.equal((await rpc(ids.foreign.token,"habilitado","Otra organizacion")).code,403);
    assert.equal((await rpc(ids.association.token,"habilitado","Sin permiso")).code,403);
    await db.query("insert into public.app_user_permissions(user_id,organizacion_id,torneo_id,categoria_id,can_review_documents) values($1,$2,$3,$4,true)",[ids.association.id,orgA,tA,cA]);
    assert.equal((await rpc(ids.association.token,"habilitado","Catalogo pendiente")).code,400,"No catalog must refuse");
    await db.query("insert into public.document_requirements(id,organizacion_id,torneo_id,categoria_id,nombre,scope,obligatorio,activo) values($1,$2,$3,$4,'Aptitud sintetica','player',true,true)",[req,orgA,tA,cA]);
    assert.equal((await rpc(ids.association.token,"habilitado","Falta documento")).code,400,"Missing approved document must refuse");
    const idDocument = crypto.randomUUID();
    await db.query("insert into public.player_documents(id,player_id,requirement_id,organizacion_id,torneo_id,categoria_id,equipo_id,equipo_nombre,status) values($1,$2,$3,$4,$5,$6,$7,'Equipo CI','aprobado')",[idDocument,player,req,orgA,tA,cA,eA]);
    assert.equal((await rpc(ids.association.token,"habilitado"," ")).code,400,"Blank reason must refuse");
    const approve = await rpc(ids.association.token,"habilitado","Revision institucional explicita");
    assert.equal(approve.code,200,JSON.stringify(approve.data));
    const suspend = await rpc(ids.association.token,"suspendido","Suspension institucional explicita");
    assert.equal(suspend.code,200,JSON.stringify(suspend.data));
    assert.equal((await http("/rest/v1/rpc/apdb_get_player_eligibility",{token:ids.delegate.token,body:{p_category_id:cA}})).code,403,"Delegate cannot view institutional decision RPC");
    const read = await http("/rest/v1/rpc/apdb_get_player_eligibility",{token:ids.association.token,body:{p_category_id:cA}});
    assert.equal(read.code,200,JSON.stringify(read.data));
    assert.equal(read.data.length,1);
    assert.equal(read.data[0].status,"suspendido");
    assert.equal(read.data[0].actor_name,"association");
    const rows = await db.query("select status,reason,actor_auth_user_id from public.apdb_player_eligibility_events where player_id=$1 order by created_at,id",[player]);
    assert.equal(rows.rowCount,2,"Append-only evidence required");
    assert(rows.rows.every(x=>x.actor_auth_user_id===ids.association.id));
    console.log("APDB_PLAYER_ELIGIBILITY_AUTH_HTTP_OK");
  } finally { await db.end(); }
})().catch(error=>{ console.error("APDB_PLAYER_ELIGIBILITY_AUTH_HTTP_FAILED",error.message); process.exitCode=1; });
