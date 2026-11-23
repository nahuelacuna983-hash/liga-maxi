"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Client } = require("pg");

for (const key of ["SUPABASE_URL","SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","DATABASE_URL","GITHUB_ENV"]) {
  assert.ok(process.env[key], key+" required for isolated browser setup");
}
assert.match(process.env.SUPABASE_URL, /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i);
const base = process.env.SUPABASE_URL.replace(/\/$/,"");
const run = crypto.randomUUID().slice(0,8);
const password = "Browser-"+crypto.randomBytes(16).toString("hex")+"!aA";
const org = "10000000-0000-0000-0000-000000000001";
const tournamentId = crypto.randomUUID(), categoryId = crypto.randomUUID(), teamId = crypto.randomUUID(), playerId = crypto.randomUUID();
const categoryName = "Elegibilidad Chromium "+run, teamName = "Equipo elegibilidad "+run;
async function auth(pathname, body, token) {
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res=await fetch(base+pathname,{method:"POST",headers:{
    apikey:token?process.env.SUPABASE_ANON_KEY:key,
    authorization:"Bearer "+(token||key),"content-type":"application/json"
  },body:JSON.stringify(body)});
  const data=await res.json();
  assert.equal(res.status,200,JSON.stringify(data));
  return data;
}
(async()=>{
  const associationEmail="eligibility-association-"+run+"@example.invalid";
  const delegateEmail="eligibility-delegate-"+run+"@example.invalid";
  const association=await auth("/auth/v1/admin/users",{email:associationEmail,password,email_confirm:true});
  const delegate=await auth("/auth/v1/admin/users",{email:delegateEmail,password,email_confirm:true});
  const db=new Client({connectionString:process.env.DATABASE_URL});
  await db.connect();
  try {
    await db.query("insert into public.app_users(id,auth_user_id,organizacion_id,display_name,role) values ($1,$1,$3,'Asociacion eligibility','asociacion'),($2,$2,$3,'Delegado eligibility','delegado')",[association.id,delegate.id,org]);
    await db.query("insert into public.torneos(id,organizacion_id,nombre,temporada,estado) values ($1,$2,$3,'2027','en_juego')",[tournamentId,org,"Elegibilidad CI "+run]);
    await db.query("insert into public.categorias(id,torneo_id,nombre,estado) values($1,$2,$3,'en_juego')",[categoryId,tournamentId,categoryName]);
    await db.query("insert into public.equipos(id,categoria_id,nombre) values($1,$2,$3)",[teamId,categoryId,teamName]);
    await db.query("insert into public.team_players(id,organizacion_id,torneo_id,categoria_id,equipo_id,equipo_nombre,nombre) values($1,$2,$3,$4,$5,$6,'Jugador de prueba')",[playerId,org,tournamentId,categoryId,teamId,teamName]);
    await db.query("insert into public.app_user_permissions(user_id,organizacion_id,torneo_id,categoria_id,can_view,can_review_documents) values($1,$2,$3,$4,true,true)",[association.id,org,tournamentId,categoryId]);
    await db.query("insert into public.app_user_permissions(user_id,organizacion_id,torneo_id,categoria_id,equipo_id,equipo_nombre,can_view,can_load_documents) values($1,$2,$3,$4,$5,$6,true,true)",[delegate.id,org,tournamentId,categoryId,teamId,teamName]);
    for(const [name,scope] of [["Lista de buena fe","team"],["Seguro","team"],["Certificado medico","player"],["Declaracion deslinde","player"]]){
      const requirementId=crypto.randomUUID(),documentId=crypto.randomUUID();
      await db.query("insert into public.document_requirements(id,organizacion_id,torneo_id,categoria_id,nombre,scope,obligatorio,activo) values($1,$2,$3,$4,$5,$6,true,true)",[requirementId,org,tournamentId,categoryId,name,scope]);
      if(scope==="team"){
        await db.query("insert into public.team_documents(id,requirement_id,organizacion_id,torneo_id,categoria_id,equipo_id,equipo_nombre,status) values($1,$2,$3,$4,$5,$6,$7,'aprobado')",[documentId,requirementId,org,tournamentId,categoryId,teamId,teamName]);
      }else{
        await db.query("insert into public.player_documents(id,player_id,requirement_id,organizacion_id,torneo_id,categoria_id,equipo_id,equipo_nombre,status) values($1,$2,$3,$4,$5,$6,$7,$8,'aprobado')",[documentId,playerId,requirementId,org,tournamentId,categoryId,teamId,teamName]);
      }
    }
    // A visible fixture ensures the official application discovers this 2027 season.
    await db.query("insert into public.partidos(id,categoria_id,local,visitante,jornada,fecha) values($1,$2,$3,'Rival sintetico',1,'2027-07-01')",[crypto.randomUUID(),categoryId,teamName]);
  }finally{await db.end();}
  const file=path.join(process.env.RUNNER_TEMP||os.tmpdir(),"apdb-eligibility-browser-"+run+".json");
  fs.writeFileSync(file,JSON.stringify({
    association:{email:associationEmail,password},
    delegate:{email:delegateEmail,password},
    categoryName,playerId,teamName
  }),{mode:0o600});
  fs.appendFileSync(process.env.GITHUB_ENV,"APDB_ELIGIBILITY_BROWSER_FILE="+file+"\n");
  console.log("APDB_ELIGIBILITY_BROWSER_FIXTURE_READY");
})().catch(error=>{console.error("APDB_ELIGIBILITY_BROWSER_SETUP_FAILED "+error.message);process.exitCode=1;});
