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
    const list = (token) => http("/rest/v1/rpc/apdb_list_player_eligibility_candidates", {
      token, body: { p_category_id: cA }
    });
    assert.equal((await list(null)).code, 401, "Anonymous candidate listing forbidden");
    assert.equal((await list(ids.delegate.token)).code, 403, "Delegate candidate listing forbidden");
    assert.equal((await list(ids.foreign.token)).code, 403, "Other organization candidate listing forbidden");
    const refereeList = (token) => http("/rest/v1/rpc/apdb_get_referee_eligibility", {
      token, body: { p_category_id: cA }
    });
    assert.equal((await refereeList(null)).code,401,"Anonymous referee list forbidden");
    assert.equal((await refereeList(ids.delegate.token)).code,403,"Delegate referee list forbidden");
    assert.equal((await refereeList(ids.foreign.token)).code,403,"Foreign referee list forbidden");
    assert.equal((await refereeList(ids.association.token)).code,403,"Unscoped referee list forbidden");
    assert.equal((await list(ids.association.token)).code, 403, "Unscoped association candidate listing forbidden");
    await db.query("insert into public.app_user_permissions(user_id,organizacion_id,torneo_id,categoria_id,can_review_documents) values($1,$2,$3,$4,true)",[ids.association.id,orgA,tA,cA]);
    const candidates = await list(ids.association.token);
    assert.equal(candidates.code, 200, JSON.stringify(candidates.data));
    assert.deepEqual(candidates.data.map((row) => row.player_id), [player]);
    assert.equal(candidates.data[0].nombre, "Jugador CI");
    let referee = await refereeList(ids.association.token);
    assert.equal(referee.code,200,JSON.stringify(referee.data));
    assert.equal(referee.data.length,1);
    assert.equal(referee.data[0].documentacion_completa,false);
    assert.equal(referee.data[0].habilitado,false);
    assert.equal((await rpc(ids.association.token,"habilitado","Catalogo pendiente")).code,400,"No catalog must refuse");
    await db.query("insert into public.document_requirements(id,organizacion_id,torneo_id,categoria_id,nombre,scope,obligatorio,activo) values($1,$2,$3,$4,'Aptitud sintetica','player',true,true)",[req,orgA,tA,cA]);
    assert.equal((await rpc(ids.association.token,"habilitado","Falta documento")).code,400,"Missing approved document must refuse");
    const idDocument = crypto.randomUUID();
    await db.query("insert into public.player_documents(id,player_id,requirement_id,organizacion_id,torneo_id,categoria_id,equipo_id,equipo_nombre,status) values($1,$2,$3,$4,$5,$6,$7,'Equipo CI','aprobado')",[idDocument,player,req,orgA,tA,cA,eA]);
    assert.equal((await rpc(ids.association.token,"habilitado"," ")).code,400,"Blank reason must refuse");
    const approve = await rpc(ids.association.token,"habilitado","Revision institucional explicita");
    assert.equal(approve.code,200,JSON.stringify(approve.data));
    referee = await refereeList(ids.association.token);
    assert.equal(referee.code,200,JSON.stringify(referee.data));
    assert.equal(referee.data[0].documentacion_completa,true);
    assert.equal(referee.data[0].habilitado,true);
    assert.equal(referee.data[0].decision_status,"habilitado");
    const suspend = await rpc(ids.association.token,"suspendido","Suspension institucional explicita");
    assert.equal(suspend.code,200,JSON.stringify(suspend.data));
    referee = await refereeList(ids.association.token);
    assert.equal(referee.code,200,JSON.stringify(referee.data));
    assert.equal(referee.data[0].habilitado,false,"Suspension must immediately block referee list");
    assert.equal(referee.data[0].decision_status,"suspendido");
    const resume=await rpc(ids.association.token,"habilitado","Rehabilitacion para verificar revocacion documental");
    assert.equal(resume.code,200,JSON.stringify(resume.data));
    await db.query("update public.player_documents set status='observado' where id=$1",[idDocument]);
    referee = await refereeList(ids.association.token);
    assert.equal(referee.code,200,JSON.stringify(referee.data));
    assert.equal(referee.data[0].habilitado,false,"Revoked document must invalidate previously approved decision");
    assert.equal(referee.data[0].documentacion_completa,false);
    await db.query("update public.player_documents set status='aprobado' where id=$1",[idDocument]);
    const suspendAgain=await rpc(ids.association.token,"suspendido","Suspension definitiva para verificar historial");
    assert.equal(suspendAgain.code,200,JSON.stringify(suspendAgain.data));
    assert.equal((await http("/rest/v1/rpc/apdb_get_player_eligibility",{token:ids.delegate.token,body:{p_category_id:cA}})).code,403,"Delegate cannot view institutional decision RPC");
    const read = await http("/rest/v1/rpc/apdb_get_player_eligibility",{token:ids.association.token,body:{p_category_id:cA}});
    assert.equal(read.code,200,JSON.stringify(read.data));
    assert.equal(read.data.length,1);
    assert.equal(read.data[0].status,"suspendido");
    assert.equal(read.data[0].actor_name,"association");
    const history = (token, playerId = player) => http("/rest/v1/rpc/apdb_get_player_eligibility_history", {
      token, body: { p_player_id: playerId }
    });
    assert.equal((await history(null)).code,401,"Anonymous history forbidden");
    assert.equal((await history(ids.delegate.token)).code,403,"Delegate history forbidden");
    assert.equal((await history(ids.foreign.token)).code,403,"Cross-organization history forbidden");
    const trail=await history(ids.association.token);
    assert.equal(trail.code,200,JSON.stringify(trail.data));
    assert.equal(trail.data.length,4,"All institutional decisions remain available");
    assert.equal(trail.data[0].status,"suspendido");
    assert(trail.data.every(row=>row.actor_name==="association" && row.reason.length>=5));
    assert.equal(new Set(trail.data.map(row=>row.event_id)).size,4);
    const rows = await db.query("select status,reason,actor_auth_user_id from public.apdb_player_eligibility_events where player_id=$1 order by created_at,id",[player]);
    assert.equal(rows.rowCount,4,"Append-only evidence required");
    assert(rows.rows.every(x=>x.actor_auth_user_id===ids.association.id));
    console.log("APDB_PLAYER_ELIGIBILITY_AUTH_HTTP_OK");
  } finally { await db.end(); }
})().catch(error=>{ console.error("APDB_PLAYER_ELIGIBILITY_AUTH_HTTP_FAILED",error.message); process.exitCode=1; });
