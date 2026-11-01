"use strict";

const crypto = require("node:crypto");

function createDevelopmentAuth({ secret, ttlMs = 15 * 60 * 1000, users = {} } = {}) {
  if (!secret || secret.length < 16) throw new Error("La autenticación requiere un secreto de desarrollo de al menos 16 caracteres.");
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const sign = (value) => crypto.createHmac("sha256", secret).update(value).digest("base64url");
  const issue = (userId) => {
    const user = users[userId];
    if (!user) throw new Error("Credenciales de desarrollo inválidas.");
    const payload = { sub: user.id, role: user.role, organizationId: user.organizationId || null, exp: Date.now() + ttlMs };
    const body = encode(payload);
    return `${body}.${sign(body)}`;
  };
  const verify = (token) => {
    if (!token || typeof token !== "string") throw new Error("Autenticación requerida.");
    const [body, signature] = token.split(".");
    if (!body || !signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(sign(body)))) throw new Error("Sesión inválida.");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp <= Date.now()) throw new Error("Sesión vencida.");
    const current = users[payload.sub];
    if (!current || current.role !== payload.role || (current.organizationId || null) !== (payload.organizationId || null)) throw new Error("Identidad revocada.");
    return { ...payload };
  };
  return { issue, verify };
}

module.exports = { createDevelopmentAuth };
