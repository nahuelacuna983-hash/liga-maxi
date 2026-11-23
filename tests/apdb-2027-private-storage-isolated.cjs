"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { Client } = require("pg");

const base = (process.env.SUPABASE_URL || "").replace(/\/$/,"");
assert.match(base,/^https?:\/\/(127\.0\.0\.1|localhost):\d+$/i,"No remote Supabase");
for (const k of ["SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","DATABASE_URL"]) assert(process.env[k],k);
const anon = process.env.SUPABASE_ANON_KEY,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
const org="10000000-0000-0000-0000-000000000001";
const foreignOrg="10000000-0000-0000-0000-000000000002";
const tournament=crypto.randomUUID(),category=crypto.randomUUID(),teams=[crypto.randomUUID(),crypto.randomUUID()];
const player=crypto.randomUUID(),req=crypto.randomUUID(),doc=crypto.randomUUID(),run=crypto.randomUUID().slice(0,8);
const filename=`apdb/2027/maxi-35-a/${teams[0]}/jugadores/${player}/${req}/aptitud-${run}.pdf`;
const otherName=`apdb/2027/maxi-35-a/${teams[1]}/jugadores/${player}/${req}/intruso-${run}.pdf`;
const pdf=Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n");
const password="Storage-"+crypto.randomBytes(14).toString("hex")+"!aA";
async function call(endpoint,{token=anon,method="POST",body,json=true}={}){
  const res=await fetch(base+endpoint,{method,headers:{
    apikey:token===service?service:anon,
    authorization:"Bearer "+token,
    "content-type":json?"application/json":"application/pdf",
    ...(json?{}:{"x-upsert":"false"})
  },body:body==null?undefined:json?JSON.stringify(body):body});
  const text=await res.text();let data;try{data=JSON.parse(text)}catch{data=text}
  return {status:res.status,data};
}
async function create(role,organization,team,review){
  const email=`storage-${role}-${crypto.randomUUID().slice(0,7)}@example.invalid`;
  const user=await call("/auth/v1/admin/users",{token:service,body:{email,password,email_confirm:true}});
  assert.equal(user.status,200,JSON.stringify(user.data));
  const token=await call("/auth/v1/token?grant_type=password",{body:{email,password}});
  assert.equal(token.status,200,JSON.stringify(token.data));
  return {id:user.data.id,token:token.data.access_token,organization,team,role,review};
}
(async()=>{
  const db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();
  try{
    // Browser uses "apdb"; isolate this slug only in the disposable database.
    await db.query("update public.organizaciones set slug='apdb' where id=$1",[org]);
    const delegates=[await create("delegado",org,teams[0],false),await create("delegado",org,teams[1],false)];
    const association=await create("asociacion",org,null,true);
    const foreign=await create("asociacion",foreignOrg,null,true);
    const nobody=await create("asociacion",org,null,false);
    for(const u of [...delegates,association,foreign,nobody]){
      await db.query("insert into public.app_users(id,auth_user_id,organizacion_id,display_name,role) values($1,$1,$2,'Storage synthetic',$3)",[u.id,u.organization,u.role]);
    }
    await db.query("insert into public.torneos(id,organizacion_id,nombre,temporada) values($1,$2,'Storage 2027 synthetic','2027')",[tournament,org]);
    await db.query("insert into public.categorias(id,torneo_id,nombre) values($1,$2,'Maxi +35 A')",[category,tournament]);
    for(const [i,id] of teams.entries()) await db.query("insert into public.equipos(id,categoria_id,nombre) values($1,$2,$3)",[id,category,"Equipo sintético "+i]);
    await db.query("insert into public.team_players(id,organizacion_id,torneo_id,categoria_id,equipo_id,equipo_nombre,nombre) values($1,$2,$3,$4,$5,'Equipo sintético 0','Jugador Storage')",[player,org,tournament,category,teams[0]]);
    await db.query("insert into public.document_requirements(id,organizacion_id,torneo_id,categoria_id,nombre,scope,activo,obligatorio) values($1,$2,$3,$4,'Aptitud sintética','player',true,true)",[req,org,tournament,category]);
    await db.query("insert into public.player_documents(id,player_id,requirement_id,organizacion_id,torneo_id,categoria_id,equipo_id,equipo_nombre) values($1,$2,$3,$4,$5,$6,$7,'Equipo sintético 0')",[doc,player,req,org,tournament,category,teams[0]]);
    for(const u of [...delegates,association]){
      await db.query("insert into public.app_user_permissions(user_id,organizacion_id,torneo_id,categoria_id,equipo_id,can_view,can_load_documents,can_review_documents) values($1,$2,$3,$4,$5,true,$6,$7)",
        [u.id,org,tournament,category,u.team,u.role==="delegado",u.review]);
    }
    const object=(name)=>"/storage/v1/object/documentos/"+name;
    const sign=(name)=>"/storage/v1/object/sign/documentos/"+name;
    const noAuth=await call(object(filename),{token:anon,body:pdf,json:false});
    assert.notEqual(noAuth.status,200,"No anonymous upload");
    const intruder=await call(object(filename),{token:delegates[1].token,body:pdf,json:false});
    assert.notEqual(intruder.status,200,"Other team cannot upload this file");
    const foreignAttempt=await call(object(filename),{token:foreign.token,body:pdf,json:false});
    assert.notEqual(foreignAttempt.status,200,"Other org cannot upload");
    const noPermission=await call(object(filename),{token:nobody.token,body:pdf,json:false});
    assert.notEqual(noPermission.status,200,"No permission cannot upload");
    const rogue=await call(object(otherName),{token:delegates[1].token,body:pdf,json:false});
    assert.notEqual(rogue.status,200,"Wrong team/player mapping cannot upload");
    const created=await call(object(filename),{token:delegates[0].token,body:pdf,json:false});
    assert.ok([200,201].includes(created.status),"Authorized upload "+JSON.stringify(created));
    const privateDirect=await call(object(filename),{token:anon,method:"GET"});
    assert.notEqual(privateDirect.status,200,"Direct anonymous download forbidden");
    await db.query("update public.player_documents set storage_path=$1,status='cargado',file_name='aptitud.pdf',file_type='application/pdf',file_size=$2 where id=$3",[filename,pdf.length,doc]);
    for(const token of [anon,delegates[1].token,foreign.token,nobody.token]){
      const forbidden=await call(sign(filename),{token,body:{expiresIn:90}});
      assert.notEqual(forbidden.status,200,"Unauthorized signed URL forbidden");
    }
    for(const u of [delegates[0],association]){
      const signed=await call(sign(filename),{token:u.token,body:{expiresIn:90}});
      assert.equal(signed.status,200,"Scoped signed URL expected "+JSON.stringify(signed.data));
      assert(signed.data.signedURL || signed.data.signedUrl,"Signed URL missing");
    }
    const edit=await call(object(filename),{token:delegates[0].token,method:"DELETE"});
    assert.notEqual(edit.status,200,"No deletion of previously uploaded records");
    console.log("APDB_2027_PRIVATE_STORAGE_AUTH_HTTP_OK");
  }finally{await db.end();}
})().catch(e=>{console.error("APDB_2027_PRIVATE_STORAGE_AUTH_HTTP_FAILED",e.message);process.exitCode=1;});
