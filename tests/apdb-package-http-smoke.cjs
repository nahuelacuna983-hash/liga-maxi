"use strict";
// HTTP smoke check against a LOCAL, synthetic static file server.
// Tests packaging/subdirectory URLs; does not assert protection on a real host.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const {spawnSync} = require("node:child_process");
const base = "/apdb-2027-prueba/";
const temp = fs.mkdtempSync(path.join(os.tmpdir(),"apdb-http-smoke-"));
const config = path.join(temp,"config.json"), site = path.join(temp,"site");
const allowed = new Map([
  ["", "index_online.html"],
  ["index_online.html", "index_online.html"],
  ["app_online.js", "app_online.js"],
  ["apdb-administrative-adapter.js", "apdb-administrative-adapter.js"],
  ["manifest.json", "manifest.json"],
  ["sw.js", "sw.js"],
  ["icon-192.png","icon-192.png"],
  ["icon-512.png","icon-512.png"],
  ["release-integrity.json","release-integrity.json"]
]);
const mime = (file) => file.endsWith(".js") ? "text/javascript" :
  file.endsWith(".json") ? "application/json" :
  file.endsWith(".png") ? "image/png" : "text/html";
let server;
(async () => {
  try {
    fs.writeFileSync(config,JSON.stringify({
      environment:"staging",
      supabaseUrl:"https://wffvmthdmmjwspnozyrv.supabase.co",
      supabaseAnonKey:"sb_publishable_test_only_0123456789",
      publicBasePath:base,
      resetDatabaseOnStart:false
    }));
    const built=spawnSync(process.execPath,["tools/build-apdb-staging.cjs",config,site],{encoding:"utf8"});
    assert.equal(built.status,0,built.stderr || built.stdout);
    const verified=spawnSync(process.execPath,["tools/verify-apdb-release.cjs",site],{encoding:"utf8"});
    assert.equal(verified.status,0,verified.stderr || verified.stdout);

    server=http.createServer((req,res)=>{
      const url = new URL(req.url, "http://localhost");
      const raw=url.pathname;
      if(!raw.startsWith(base)){res.writeHead(404);res.end("not found");return;}
      const relative=raw.slice(base.length);
      const name=allowed.get(relative);
      if(!name){res.writeHead(404);res.end("not found");return;}
      const data=fs.readFileSync(path.join(site,name));
      res.writeHead(200,{"content-type":mime(name),"cache-control":"no-store"});
      res.end(data);
    });
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    const origin="http://127.0.0.1:"+server.address().port;
    const read=async (url,expected)=> {
      const result=await fetch(origin+url);
      assert.equal(result.status,expected,url);
      return result;
    };
    const html=await (await read(base,200)).text();
    assert.match(html,/window.APDB_STAGING=true/);
    assert.match(html,/src="app_online\.js\?v=/);
    assert.match(html,/src="apdb-administrative-adapter\.js\?v=/);
    assert.match(html,/navigator\.serviceWorker\.register\("sw\.js"\)/);
    for(const item of ["app_online.js","apdb-administrative-adapter.js","manifest.json","sw.js","icon-192.png","icon-512.png","release-integrity.json"]){
      const r=await read(base+item,200);
      const content=Buffer.from(await r.arrayBuffer());
      assert.ok(content.length>0,item+" is empty");
      assert.equal(content.length,fs.statSync(path.join(site,item)).size);
    }
    await read(base+"app_online.js?v=synthetic",200);
    for(const target of ["/",base+"config.json",base+".env",base+"../../app_online.js",base+"supabase/config.toml",base+"backup.dump"]){
      await read(target,404);
    }
    const manifest=await (await read(base+"manifest.json",200)).json();
    assert.equal(manifest.start_url,base);
    assert.equal(manifest.scope,base);
    console.log("APDB_LOCAL_HTTP_PACKAGE_SMOKE_OK assets=8 forbidden_paths=6");
  } finally {
    if(server) await new Promise(resolve=>server.close(resolve));
    fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(err=>{console.error("APDB_LOCAL_HTTP_PACKAGE_SMOKE_FAILED",err);process.exitCode=1;});
