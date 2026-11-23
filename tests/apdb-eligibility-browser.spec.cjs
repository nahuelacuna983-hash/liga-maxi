const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const isolatedUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const file = process.env.APDB_ELIGIBILITY_BROWSER_FILE;
test.beforeEach(async ({page})=>{
  if(!isolatedUrl||!anonKey||!file)throw Error("Isolated browser fixture missing");
  if(!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(isolatedUrl))throw Error("Hosted target forbidden");
  await page.addInitScript(({url,key})=>{
    window.APDB_SUPABASE_URL=url;
    window.APDB_SUPABASE_ANON_KEY=key;
  },{url:isolatedUrl,key:anonKey});
});
async function signIn(page,credentials){
  await page.locator("#tab-acceso").evaluate(e=>{e.hidden=false;e.removeAttribute("aria-hidden");e.click()});
  await page.locator("#auth-email").fill(credentials.email);
  await page.locator("#auth-password").fill(credentials.password);
  await page.locator("#auth-login").click();
  await expect(page.locator("#auth-status")).toContainText("Ingreso correcto",{timeout:25000});
}
test("Asociación habilita, suspende y recupera decisión; delegado no modifica",async({page})=>{
  test.setTimeout(120000);
  const data=JSON.parse(fs.readFileSync(file,"utf8"));
  await page.goto("/index_online.html?secureResults=1",{waitUntil:"domcontentloaded"});
  await signIn(page,data.association);
  await page.locator("#tab-asociacion").click();
  await expect(page.locator("#asociacion-categoria option")).not.toHaveCount(0,{timeout:20000});
  await page.locator("#asociacion-categoria").selectOption({label:data.categoryName});
  await page.locator('.assoc-nav-btn[data-asociacion-panel="documentacion"]').click();
  await expect(page.locator("#apdb-eligibility-section")).toBeVisible({timeout:20000});
  await expect(page.locator('#apdb-eligibility-player option[value="'+data.playerId+'"]')).toHaveCount(1,{timeout:20000});
  await page.locator("#apdb-eligibility-player").selectOption(data.playerId);
  await expect(page.locator("#apdb-eligibility-summary")).toContainText("Sin decisión");
  await page.locator("#apdb-eligibility-reason").fill("Revisión institucional completa de prueba");
  page.once("dialog",d=>d.accept());
  const approve=page.waitForResponse(r=>r.url().includes("/rest/v1/rpc/apdb_set_player_eligibility")&&r.request().method()==="POST");
  await page.locator("#apdb-eligibility-approve").click();
  expect((await approve).status()).toBe(200);
  await expect(page.locator("#apdb-eligibility-status")).toContainText("Decisión institucional registrada.");
  await page.locator("#apdb-eligibility-player").selectOption(data.playerId);
  await expect(page.locator("#apdb-eligibility-summary")).toContainText("habilitado");
  await expect(page.locator("#apdb-eligibility-history li")).toHaveCount(1,{timeout:20000});
  const approvedForReferee = await page.evaluate((category) => window.calcularHabilitadosCategoria(category), data.categoryName);
  expect(approvedForReferee).toHaveLength(1);
  expect(approvedForReferee[0].habilitado).toBe("SI");
  await page.locator("#apdb-eligibility-reason").fill("Suspensión cautelar de prueba");
  page.once("dialog",d=>d.accept());
  const suspend=page.waitForResponse(r=>r.url().includes("/rest/v1/rpc/apdb_set_player_eligibility")&&r.request().method()==="POST");
  await page.locator("#apdb-eligibility-suspend").click();
  expect((await suspend).status()).toBe(200);
  await page.locator("#apdb-eligibility-player").selectOption(data.playerId);
  await expect(page.locator("#apdb-eligibility-summary")).toContainText("suspendido");
  const suspendedForReferee = await page.evaluate((category) => window.calcularHabilitadosCategoria(category), data.categoryName);
  expect(suspendedForReferee).toHaveLength(1);
  expect(suspendedForReferee[0].habilitado).toBe("NO");
  expect(suspendedForReferee[0].faltantes).toContain("Habilitación suspendida");

  await page.reload({waitUntil:"domcontentloaded"});
  await signIn(page,data.association);
  await page.locator("#tab-asociacion").click();
  await page.locator("#asociacion-categoria").selectOption({label:data.categoryName});
  await page.locator('.assoc-nav-btn[data-asociacion-panel="documentacion"]').click();
  await expect(page.locator("#apdb-eligibility-section")).toBeVisible({timeout:20000});
  await page.locator("#apdb-eligibility-player").selectOption(data.playerId);
  await expect(page.locator("#apdb-eligibility-summary")).toContainText("suspendido");
  console.log("APDB_ELIGIBILITY_BROWSER_RECOVERY_OK");

  // Desde la pantalla real de árbitros: el club debe provenir de la lista
  // autorizada y el CSV debe refrescar la decisión justo antes de emitirse.
  await page.locator('.assoc-shortcut-btn[data-asociacion-shortcut="habilitados"]').click();
  await expect(page.locator("#habilitados-filtro-equipo")).toContainText(data.teamName);
  await page.locator("#habilitados-filtro-equipo").selectOption({label:data.teamName});
  await expect(page.locator("#habilitados-tabla")).toContainText("Jugador de prueba", {timeout:20000});
  await expect(page.locator("#habilitados-tabla")).toContainText("Habilitación suspendida");
  const refresh=page.waitForResponse(r=>r.url().includes("/rest/v1/rpc/apdb_get_referee_eligibility")
      &&r.request().method()==="POST");
  const exported=page.waitForEvent("download");
  await page.locator("#habilitados-exportar-csv").click();
  expect((await refresh).status()).toBe(200);
  const csv=await exported;
  expect(csv.suggestedFilename()).toMatch(/habilitados-arbitros.*\.csv$/);
  const bytes=fs.readFileSync(await csv.path(),"utf8");
  expect(bytes).toContain("Jugador de prueba");
  expect(bytes).toContain("Habilitación suspendida");
  console.log("APDB_ELIGIBILITY_BROWSER_REFEREE_CSV_VERIFIED");

  await page.locator("#tab-acceso").evaluate(e=>{e.hidden=false;e.removeAttribute("aria-hidden");e.click()});
  await page.locator("#auth-logout").click();
  await expect(page.locator("#auth-status")).toContainText("Sesion cerrada.",{timeout:20000});
  await expect(page.locator("#apdb-eligibility-section")).toBeHidden();
  await expect(page.locator("#apdb-eligibility-history")).toBeEmpty();
  await expect(page.locator("#apdb-eligibility-summary")).toBeEmpty();
  await expect(page.locator("#habilitados-tabla")).toBeEmpty();
  await expect(page.locator("#apdb-eligibility-player option")).toHaveCount(1);
  await signIn(page,data.delegate);
  await page.locator("#tab-delegados").click();
  await expect(page.locator("#apdb-eligibility-section")).toBeHidden();
  const denied=await page.evaluate(async({url,key,playerId,delegateEmail,delegatePassword})=>{
    const auth=await fetch(url+"/auth/v1/token?grant_type=password",{
      method:"POST",headers:{apikey:key,"content-type":"application/json"},
      body:JSON.stringify({email:delegateEmail,password:delegatePassword})
    });
    if(auth.status!==200)throw Error("Delegate authentication failed");
    const session=await auth.json();
    const r=await fetch(url+"/rest/v1/rpc/apdb_set_player_eligibility",{
      method:"POST",headers:{apikey:key,authorization:"Bearer "+session.access_token,"content-type":"application/json"},
      body:JSON.stringify({p_player_id:playerId,p_status:"habilitado",p_reason:"Intento delegado sin autorización"})
    });return r.status;
  },{url:isolatedUrl.replace(/\/$/,""),key:anonKey,playerId:data.playerId,delegateEmail:data.delegate.email,delegatePassword:data.delegate.password});
  expect(denied).toBe(403);
  console.log("APDB_ELIGIBILITY_BROWSER_DELEGATE_DENIED_OK");
});
