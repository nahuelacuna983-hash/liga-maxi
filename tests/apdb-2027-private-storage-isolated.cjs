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
    // The official app consumes this view directly; test its effective scope.
    const viewPath="/rest/v1/v_player_documents_admin?categoria_id=eq."+category+"&select=id,equipo_id";
    const view = (token) => call(viewPath,{token,method:"GET"});
    const own = await view(delegates[0].token);
    assert.equal(own.status,200,JSON.stringify(own.data));
    assert.equal(own.data.length,1,"Delegado can see only own team's player documents");
    const another = await view(delegates[1].token);
    assert.equal(another.status,200,JSON.stringify(another.data));
    assert.equal(another.data.length,0,"Delegate cannot inspect another club's metadata");
    const associationDocs = await view(association.token);
    assert.equal(associationDocs.status,200,JSON.stringify(associationDocs.data));
    assert.equal(associationDocs.data.length,1);
    const foreignDocs = await view(foreign.token);
    assert.equal(foreignDocs.status,200,JSON.stringify(foreignDocs.data));
    assert.equal(foreignDocs.data.length,0);
    const anonDocs = await view(anon);
    assert.notEqual(anonDocs.status,200,"Anonymous access to medical metadata forbidden");
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
    const uploadDocument = (token,id,name) => call("/rest/v1/rpc/mark_player_document_uploaded",{
      token,body:{p_document_id:id,p_uploaded_by:"Usuario falso",p_storage_path:name,
        p_file_name:"aptitud.pdf",p_file_type:"application/pdf",p_file_size:pdf.length,p_vencimiento:null}
    });
    const reviewDocument = (token,status,reason) => call("/rest/v1/rpc/review_player_document",{
      token,body:{p_document_id:doc,p_status:status,p_actor:"Administrador falso",p_observacion:reason}
    });
    const badMark=await uploadDocument(delegates[1].token,doc,filename);
    assert.notEqual(badMark.status,200,"Wrong team cannot attach another club file");
    const registered=await uploadDocument(delegates[0].token,doc,filename);
    assert.equal(registered.status,200,"Correct delegate can register document "+JSON.stringify(registered.data));
    const noReview=await reviewDocument(delegates[0].token,"aprobado",null);
    assert.notEqual(noReview.status,200,"Delegate cannot approve documentary evidence");
    const noReason=await reviewDocument(association.token,"observado"," ");
    assert.notEqual(noReason.status,200,"Association must explain observations");
    const observed=await reviewDocument(association.token,"observado","Falta constancia complementaria");
    assert.equal(observed.status,200,"Association can observe document "+JSON.stringify(observed.data));
    const correctedName=filename.replace("aptitud-","correccion-");
    const correctedUpload=await call(object(correctedName),{token:delegates[0].token,body:pdf,json:false});
    assert.ok([200,201].includes(correctedUpload.status),"Delegate can correct observation");
    const corrected=await uploadDocument(delegates[0].token,doc,correctedName);
    assert.equal(corrected.status,200,"Correction registration must succeed");
    const approved=await reviewDocument(association.token,"aprobado",null);
    assert.equal(approved.status,200,"Association can approve corrected file");
    const saved=await db.query("select status,storage_path,uploaded_by,reviewed_by from public.player_documents where id=$1",[doc]);
    assert.equal(saved.rows[0].status,"aprobado");
    assert.equal(saved.rows[0].storage_path,correctedName);
    assert.notEqual(saved.rows[0].uploaded_by,"Usuario falso");
    assert.notEqual(saved.rows[0].reviewed_by,"Administrador falso");
    const trace=await db.query("select event_type from public.player_document_events where player_document_id=$1 order by created_at,id",[doc]);
    assert.equal(trace.rowCount,4);
    const newPlayer=await call("/rest/v1/rpc/add_team_player",{token:delegates[0].token,body:{
      p_organizacion_id:null,p_torneo_id:tournament,p_categoria_id:category,p_equipo_id:teams[0],
      p_equipo_nombre:"Equipo sintético 0",p_nombre:"Jugador nuevo 2027",p_dni:"synthetic-987",
      p_dorsal:"23",p_created_by:"Nombre suplantado"
    }});
    assert.equal(newPlayer.status,200,"Delegate should register scoped player "+JSON.stringify(newPlayer.data));
    const newId=String(newPlayer.data);
    const placeholders=await db.query("select count(*)::int n from public.player_documents where player_id=$1",[newId]);
    assert.equal(placeholders.rows[0].n,1,"Player registration automatically creates requirement placeholder");
    const unauthorizedPlayer=await call("/rest/v1/rpc/add_team_player",{token:delegates[1].token,body:{
      p_organizacion_id:null,p_torneo_id:tournament,p_categoria_id:category,p_equipo_id:teams[0],
      p_equipo_nombre:"Equipo sintético 0",p_nombre:"Jugador intruso",p_dni:null,
      p_dorsal:null,p_created_by:"Intruso"
    }});
    assert.notEqual(unauthorizedPlayer.status,200,"Other team cannot register player");
    for(const token of [anon,delegates[1].token,foreign.token,nobody.token]){
      const forbidden=await call(sign(correctedName),{token,body:{expiresIn:90}});
      assert.notEqual(forbidden.status,200,"Unauthorized signed URL forbidden");
    }
    for(const u of [delegates[0],association]){
      const signed=await call(sign(correctedName),{token:u.token,body:{expiresIn:90}});
      assert.equal(signed.status,200,"Scoped signed URL expected "+JSON.stringify(signed.data));
      assert(signed.data.signedURL || signed.data.signedUrl,"Signed URL missing");
    }
    const edit=await call(object(filename),{token:delegates[0].token,method:"DELETE"});
    assert.notEqual(edit.status,200,"No deletion of previously uploaded records");
    console.log("APDB_2027_PRIVATE_STORAGE_AUTH_HTTP_OK");
  }finally{await db.end();}
})().catch(e=>{console.error("APDB_2027_PRIVATE_STORAGE_AUTH_HTTP_FAILED",e.message);process.exitCode=1;});
