"use strict";
// Exercises the REAL packaged index_online.html with JavaScript ON.
// Synthetic in-memory Supabase transport is used; no external requests, credentials,
// real sessions or hosted database connections are permitted.
const {test,expect}=require("@playwright/test");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),http=require("node:http");
const {spawnSync}=require("node:child_process");
const base="/apdb-2027-prueba/";
const allowed=new Set(["index.html","index_online.html","app_online.js","apdb-administrative-adapter.js","manifest.json","sw.js","release-integrity.json","icon-192.png","icon-512.png"]);
const jsStub=`
(function(){
const torneo={id:"test-tournament",nombre:"Torneo sintético",temporada:"2027",estado:"en_juego",tipo:"clausura"};
const categoria={id:"test-category",nombre:"Maxi +35 A",torneo_id:torneo.id,estado:"activo",formato:"liga",playoffs:4,clasificados:4,series_playoff:{}};
const partido={id:"test-match",categoria_id:categoria.id,jornada:1,local:"Equipo A",visitante:"Equipo B",puntos_local:65,puntos_visitante:59,estado:"finalizado",fecha:"2027-03-10"};
function query(table){
  const filter={};
  const obj={
    select(){return obj},eq(k,v){filter[k]=v;return obj},in(k,v){filter[k]=v;return obj},order(){return obj},limit(){return obj},
    neq(){return obj},gte(){return obj},lte(){return obj},is(){return obj},not(){return obj},range(){return obj},
    maybeSingle(){return Promise.resolve({data:table==="torneos"?torneo:null,error:null,count:1})},
    single(){return Promise.resolve({data:null,error:null,count:0})},
    insert(){return Promise.resolve({data:null,error:null})},update(){return obj},upsert(){return obj},delete(){return obj},
    then(resolve,reject){
      let data=[];
      if(table==="torneos")data=[torneo];
      if(table==="categorias")data=[categoria];
      if(table==="partidos")data=[partido];
      if(table==="app_usage_events")data=[];
      return Promise.resolve({data,error:null,count:data.length}).then(resolve,reject);
    }
  };
  return obj;
}
window.supabase={
  createClient(){
    return {
      from:query,
      rpc(name){ return Promise.resolve({data:[],error:null}); },
      auth:{
        getSession(){return Promise.resolve({data:{session:null},error:null})},
        onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},
        signInWithPassword(){return Promise.resolve({data:{user:null,session:null},error:{message:"Sesión sintética deshabilitada"}})},
        signOut(){return Promise.resolve({error:null})}
      },
      storage:{from(){return {list:async()=>({data:[],error:null}),download:async()=>({data:null,error:null}),upload:async()=>({data:null,error:null})}}}
    };
  }
};
})();`;
function build(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"apdb-js-on-")),config=path.join(root,"config.json"),site=path.join(root,"site");
 fs.writeFileSync(config,JSON.stringify({environment:"staging",supabaseUrl:"https://wffvmthdmmjwspnozyrv.supabase.co",supabaseAnonKey:"sb_publishable_test_only_0123456789",publicBasePath:base,resetDatabaseOnStart:false}));
 const r=spawnSync(process.execPath,["tools/build-apdb-staging.cjs",config,site],{encoding:"utf8"});
 if(r.status!==0)throw Error("Synthetic package build failed: "+r.stderr);
 return {root,site};
}
async function serve(site){
 const server=http.createServer((req,res)=>{
   let url;try{url=new URL(req.url,"http://localhost")}catch{return res.writeHead(400).end()}
   if(!url.pathname.startsWith(base))return res.writeHead(404).end();
   const relative=url.pathname.slice(base.length)||"index.html";
   if(!allowed.has(relative))return res.writeHead(404).end();
   const target=path.join(site,relative);
   if(!fs.existsSync(target))return res.writeHead(404).end();
   const mime=relative.endsWith(".js")?"text/javascript":relative.endsWith(".json")?"application/json":relative.endsWith(".png")?"image/png":"text/html";
   res.writeHead(200,{"content-type":mime,"cache-control":"no-store"});fs.createReadStream(target).pipe(res);
 });
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 return {server,url:"http://127.0.0.1:"+server.address().port+base};
}
for(const v of [{name:"desktop",width:1440,height:900},{name:"mobile",width:390,height:844}]){
 test("aplicación institucional con JavaScript y datos sintéticos: "+v.name,async({browser})=>{
  const pkg=build();const host=await serve(pkg.site);const context=await browser.newContext({viewport:{width:v.width,height:v.height},serviceWorkers:"block"});
  const page=await context.newPage(),errors=[],external=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/*",route=>{
    const url=route.request().url();
    if(url.startsWith(host.url))return route.continue();
    if(url.startsWith("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"))return route.fulfill({status:200,contentType:"text/javascript",body:jsStub});
    external.push(url);
    return route.abort();
  });
  try{
   const res=await page.goto(host.url,{waitUntil:"domcontentloaded"});
   expect(res.status()).toBe(200);
   await expect(page.locator("#publico-categoria option")).toHaveCount(1,{timeout:12000});
   await expect(page.locator("#publico-categoria")).toHaveValue("Maxi +35 A");
   await page.locator("#tab-delegados").click();
   await expect(page.locator("#vista-delegados")).toHaveClass(/activa/);
   await page.locator("#tab-asociacion").click();
   await expect(page.locator("#vista-asociacion")).toHaveClass(/activa/);
   await page.locator("#tab-publico").click();
   await expect(page.locator("#vista-publico")).toHaveClass(/activa/);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
   expect(errors).toEqual([]);
   expect(external.filter(u=>!u.includes("api.qrserver.com"))).toEqual([]);
   console.log("APDB_PACKAGED_JS_ENABLED_SYNTHETIC_OK "+v.name);
  }finally{
   await context.close();
   await new Promise(ok=>host.server.close(ok));
   fs.rmSync(pkg.root,{recursive:true,force:true});
  }
 });
}
