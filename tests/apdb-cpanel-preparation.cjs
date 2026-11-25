"use strict";
// Synthetic, offline; no configuration from a real project is used.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {validate,zip,crc32}=require('../tools/prepare-apdb-cpanel.cjs');
const c={environment:'staging',resetDatabaseOnStart:false,publicBasePath:'/apdb-2027-prueba/',
  supabaseUrl:'https://wffvmthdmmjwspnozyrv.supabase.co',supabaseAnonKey:'sb_publishable_0123456789abcdef0123456789abcdef'};
validate(c); // Syntax only; this value is NOT an authorized key.
let negatives=0;
for(const change of [
  {environment:'production'},{resetDatabaseOnStart:true},{publicBasePath:'/liga/'},
  {publicBasePath:'/apdb-2027-prueba/../liga/'},{publicBasePath:'/'},
  {supabaseUrl:'https://eshbydpsmypflfxpmhyk.supabase.co'},
  {supabaseAnonKey:'sb_publishable_test_only_0123456789'},
  {supabaseAnonKey:'sb_secret_0123456789abcdef0123456789'},
  {supabaseAnonKey:'service_role'},{password:'must-never-be-packaged'},
  {supabaseAnonKey:'sb_publishable_HtooEUIqEorzX3ODPOwLXQ_iulhXEdL'}
]) { assert.throws(()=>validate({...c,...change})); negatives++; }
assert.equal(crc32(Buffer.from('123456789')),0xcbf43926);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'apdb-zip-'));
try {
  fs.writeFileSync(path.join(dir,'b.txt'),'second'); fs.writeFileSync(path.join(dir,'a.txt'),'first');
  const a=zip(dir); fs.utimesSync(path.join(dir,'a.txt'),new Date(),new Date());
  assert.deepEqual(zip(dir),a);
  assert.equal(a.readUInt32LE(0),0x04034b50);
  assert.equal(a.subarray(30,35).toString(),'a.txt');
  assert.equal(a.readUInt16LE(a.length-12),2);
  assert.equal(a.readUInt32LE(a.length-22),0x06054b50);
} finally { fs.rmSync(dir,{recursive:true,force:true}); }
console.log('APDB_CPANEL_PREPARATION_SYNTHETIC_OK negatives='+negatives+' deterministic_zip=true');
