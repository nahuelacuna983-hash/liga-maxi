"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const http=require("node:http");
const { spawnSync,spawn }=require("node:child_process");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"apdb-cpanel-test-"));
const site=path.join(tmp,"release");
const config=path.join(tmp,"config.json");
const creds="Basic "+Buffer.from("apdb_test:synthetic_password").toString("base64");
const served=new Set(["index.html","index_online.html","app_online.js","apdb-administrative-adapter.js","sw.js",
"manifest.json","icon-192.png","icon-512.png","release-integrity.json"]);
const mime=f=>f.endsWith(".js")?"application/javascript":f.endsWith(".json")?"application/json":
f.endsWith(".png")?"image/png":"text/html";
let server;
async function checkRelease(base,corrupt) {
  const env={...process.env,APDB_TEST_LOOPBACK:"1",
    APDB_HOST_BASIC_USER:"apdb_test",APDB_HOST_BASIC_PASSWORD:"synthetic_password"};
  const child=spawn(process.execPath,["tools/check-apdb-hosted-release.cjs",base,site],{env,stdio:["ignore","pipe","pipe"]});
  let stdout="",stderr="";
  child.stdout.on("data",chunk=>stdout+=chunk);
  child.stderr.on("data",chunk=>stderr+=chunk);
  const code=await new Promise((resolve,reject)=>{child.on("error",reject);child.on("exit",resolve);});
  assert.equal(code,corrupt?1:0,stderr||stdout);
  if(!corrupt)assert.match(stdout,/APDB_CPANEL_AUTHENTICATED_RELEASE_OK files=9/);
}
(async()=>{
 try {
   fs.writeFileSync(config,JSON.stringify({environment:"staging",
     supabaseUrl:"https://wffvmthdmmjwspnozyrv.supabase.co",
     supabaseAnonKey:"sb_publishable_test_only_0123456789",
     publicBasePath:"/apdb-2027-prueba/",resetDatabaseOnStart:false}));
   const build=spawnSync(process.execPath,["tools/build-apdb-staging.cjs",config,site],{encoding:"utf8"});
   assert.equal(build.status,0,build.stderr||build.stdout);
   let corrupt=false; let mode="ok";
   server=http.createServer((req,res)=>{
     const u=new URL(req.url,"http://localhost");
     if(!u.pathname.startsWith("/apdb-2027-prueba/")){res.writeHead(404);res.end();return;}
     if(req.headers.authorization!==creds){res.writeHead(401,{"cache-control":"no-store","www-authenticate":"Basic realm=APdB"});res.end();return;}
     const file=u.pathname.slice("/apdb-2027-prueba/".length) || "index.html";
     if(!served.has(file)){res.writeHead(404);res.end();return;}
     if(mode==="redirect"){res.writeHead(302,{location:"https://example.invalid/"});res.end();return;}
     if(mode==="wrong-password"){res.writeHead(401);res.end();return;}
     let data=fs.readFileSync(path.join(site,file));
     if(corrupt && file==="app_online.js")data=Buffer.concat([data,Buffer.from("// altered")]);
     res.writeHead(200,{"content-type":mode==="wrong-mime"?"text/plain":mime(file),
       "cache-control":mode==="cacheable"?"public, max-age=3600":"private, no-store",
       ...(mode==="broad-sw" && file==="sw.js"?{"service-worker-allowed":"/"}:{})});
     res.end(data);
   });
   await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
   const base="http://127.0.0.1:"+server.address().port+"/apdb-2027-prueba/";
   await checkRelease(base,false);
   corrupt=true;
   await checkRelease(base,true);
   corrupt=false;
   for(mode of ["redirect","wrong-password","wrong-mime","cacheable","broad-sw"]) await checkRelease(base,true);
   console.log("APDB_CPANEL_AUTH_HTTP_CONTRACT_OK synthetic=true negative_cases=6 matching_bytes=true altered_bytes_denied=true");
 }finally{
   if(server)await new Promise(resolve=>server.close(resolve));
   fs.rmSync(tmp,{recursive:true,force:true});
 }
})().catch(e=>{console.error("APDB_CPANEL_AUTH_HTTP_CONTRACT_FAILED",e);process.exitCode=1;});
