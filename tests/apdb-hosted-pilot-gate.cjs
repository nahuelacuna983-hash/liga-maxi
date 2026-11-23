"use strict";
// All scenarios use 127.0.0.1; no hosted requests or credentials.
const assert=require("node:assert/strict");
const http=require("node:http");
const {spawn}=require("node:child_process");
const path=require("node:path");
const allowed=["","app_online.js","manifest.json","release-integrity.json"];
const blocked=[".env","config.json","backup.dump"];
const base="/apdb-2027-staging/";
async function scenario(mode,shouldPass){
  let server;
  try {
    server=http.createServer((req,res)=>{
      const name=(new URL(req.url,"http://localhost")).pathname.slice(base.length);
      if(!req.url.startsWith(base)){res.writeHead(404);res.end();return;}
      const publicLeak=mode==="public-pilot" && name==="";
      const redirectLeak=mode==="redirect" && name==="";
      const leakedConfig=mode==="leaked-config" && name===".env";
      if(redirectLeak){res.writeHead(302,{location:"https://other.example/sign-in"});res.end();return;}
      if(publicLeak || leakedConfig){
        res.writeHead(200,{"cache-control":"public, max-age=3600"});res.end("EXPOSED");return;
      }
      if(allowed.includes(name)){
        const headers=mode==="cacheable" && name==="" ? {"cache-control":"public,max-age=3600"} :
          {"cache-control":"no-store"};
        res.writeHead(401,headers);res.end();return;
      }
      if(blocked.includes(name)){res.writeHead(404,{"cache-control":"no-store"});res.end();return;}
      res.writeHead(404);res.end();
    });
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    const url="http://127.0.0.1:"+server.address().port+base;
    const child=spawn(process.execPath,[path.join("tools","check-apdb-hosted-pilot.cjs"),url],{
      env:{...process.env,APDB_TEST_LOOPBACK:"1"},stdio:["ignore","pipe","pipe"]
    });
    let output="";
    for(const stream of [child.stdout,child.stderr])stream.on("data",buffer=>{output+=buffer.toString()});
    const exitCode=await new Promise((resolve,reject)=>{
      child.on("error",reject);child.on("close",resolve);
    });
    assert.equal(exitCode===0,shouldPass,"Scenario "+mode+": "+output);
    if(shouldPass) assert.match(output,/APDB_HOSTED_ANONYMOUS_GATE_OK/);
  }finally{
    if(server)await new Promise(resolve=>server.close(resolve));
  }
}
(async()=>{
  await scenario("protected",true);
  await scenario("public-pilot",false);
  await scenario("redirect",false);
  await scenario("leaked-config",false);
  await scenario("cacheable",false);
  console.log("APDB_HOSTED_GATE_LOCAL_SCENARIOS_OK passed=5");
})().catch(e=>{console.error("APDB_HOSTED_GATE_TEST_FAILED",e);process.exitCode=1});
