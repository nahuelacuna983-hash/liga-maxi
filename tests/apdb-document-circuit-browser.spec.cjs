const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const local = process.env.SUPABASE_URL || "";
const anonKey = process.env.SUPABASE_ANON_KEY;
const fixtureFile = process.env.APDB_ELIGIBILITY_BROWSER_FILE;

test("Delegado carga y corrige PDF privado; Asociación observa y aprueba", async({page})=>{
  test.setTimeout(180000);
  if(!/^https?:\/\/(localhost|127\.0\.0\.1):\d+\/?$/i.test(local)
    ||!anonKey||!fixtureFile)throw Error("Document browser test requires disposable Supabase");
  const cfg=JSON.parse(fs.readFileSync(fixtureFile,"utf8"));
  await page.addInitScript(({url,key})=>{
    window.APDB_SUPABASE_URL=url;
    window.APDB_SUPABASE_ANON_KEY=key;
  },{url:local,key:anonKey});

  const visit = async(credentials, role) => {
    if(await page.locator("#auth-logout").count() && await page.locator("#auth-logout").isEnabled()) {
      await page.locator("#tab-acceso").click();
      await page.locator("#auth-logout").click();
      await expect(page.locator("#auth-status")).toContainText("Sesion cerrada.",{timeout:20000});
    }
    await page.goto("/index_online.html?secureResults=1",{waitUntil:"domcontentloaded"});
    await page.locator("#tab-acceso").evaluate(e=>{e.hidden=false;e.removeAttribute("aria-hidden");e.click()});
    await page.locator("#auth-email").fill(credentials.email);
    await page.locator("#auth-password").fill(credentials.password);
    await page.locator("#auth-login").click();
    await expect(page.locator("#auth-status")).toContainText("Ingreso correcto",{timeout:25000});
    await page.locator(role==="delegate"?"#tab-delegados":"#tab-asociacion").click();
    await page.locator(role==="delegate"?"#delegado-categoria":"#asociacion-categoria")
      .selectOption({label:cfg.categoryName});
    if(role==="association"){
      await page.locator('.assoc-nav-btn[data-asociacion-panel="documentacion"]').click();
      await expect(page.locator("#habilitados-filtro-equipo")).toContainText(cfg.teamName,{timeout:20000});
      await page.locator("#habilitados-filtro-equipo").selectOption({label:cfg.teamName});
    }
  };
  const docInput=()=>page.locator(`.player-doc-upload-input[data-document-id="${cfg.documentId}"]`);
  const review=(status)=>page.locator(`.doc-review-btn[data-document-id="${cfg.documentId}"][data-document-scope="player"][data-status="${status}"]`);
  const syntheticPDF=(label)=>({name:`synthetic-${label}.pdf`,mimeType:"application/pdf",
    buffer:Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n")});
  const upload=async(label)=>{
    await expect(docInput()).toHaveCount(1,{timeout:25000});
    const stored=page.waitForResponse(r=>r.url().includes("/rest/v1/rpc/mark_player_document_uploaded")
      &&r.request().method()==="POST");
    await docInput().setInputFiles(syntheticPDF(label));
    expect((await stored).status()).toBe(200);
    await expect(page.locator("#delegado-status")).toContainText("cargado correctamente",{timeout:25000});
  };
  const doReview=async(status,reason)=>{
    await expect(review(status)).toBeVisible({timeout:25000});
    const handler=async(d)=>{
      if(d.type()==="prompt")await d.accept(reason);
      else await d.accept();
    };
    page.on("dialog",handler);
    try{
      const reviewed=page.waitForResponse(r=>r.url().includes("/rest/v1/rpc/review_player_document")
        &&r.request().method()==="POST");
      await review(status).click();
      expect((await reviewed).status()).toBe(200);
    }finally{page.off("dialog",handler);}
  };
  await visit(cfg.delegate,"delegate");
  await upload("first");

  await visit(cfg.association,"association");
  await doReview("observado","Falta documento sintético complementario");
  await expect(page.locator("#documentacion-tabla")).toContainText("Falta documento sintético",{timeout:20000});

  await visit(cfg.delegate,"delegate");
  await upload("corrected");

  await visit(cfg.association,"association");
  await doReview("aprobado","");
  await expect(page.locator("#documentacion-tabla")).toContainText("Aprobado",{timeout:20000});
  console.log("APDB_2027_DOCUMENT_BROWSER_FULL_CIRCUIT_OK");
});
