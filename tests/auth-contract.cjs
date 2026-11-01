"use strict";

const assert = require("node:assert/strict");
const { createDevelopmentAuth } = require("../demo_2027_auth.js");

const auth = createDevelopmentAuth({ secret: "synthetic-development-secret", ttlMs: 50, users: { assoc: { id: "assoc", role: "organizer", organizationId: "org-a" } } });
const token = auth.issue("assoc");
assert.equal(auth.verify(token).sub, "assoc");
assert.throws(() => auth.verify("not-a-token"), /Sesión inválida|Autenticación requerida/);
const expiredAuth = createDevelopmentAuth({ secret: "synthetic-development-secret", ttlMs: -1, users: { assoc: { id: "assoc", role: "organizer", organizationId: "org-a" } } });
assert.throws(() => expiredAuth.verify(expiredAuth.issue("assoc")), /Sesión vencida/);
assert.throws(() => auth.issue("unknown"), /Credenciales/);
console.log("AUTH_CONTRACT_OK");
