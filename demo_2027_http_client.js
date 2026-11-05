"use strict";

class PostgresHttpClient {
  constructor(baseUrl) { this.baseUrl = baseUrl.replace(/\/$/, ""); this.token = null; }
  async request(path, method = "GET", payload) {
    const headers = { ...(payload === undefined ? {} : { "content-type": "application/json" }), ...(this.token ? { authorization: `Bearer ${this.token}` } : {}) };
    let response;
    try { response = await fetch(`${this.baseUrl}${path}`, { method, headers, body: payload === undefined ? undefined : JSON.stringify(payload) }); }
    catch (error) { throw new Error(`No se pudo conectar con el backend local (red o CORS): ${error.message}`); }
    const data = await response.json();
    if (!response.ok) throw new Error(`Error HTTP ${response.status}: ${data.error || "respuesta rechazada"}`);
    return data;
  }
  health() { return this.request("/health"); }
  async login(userId) { const result = await this.request("/api/auth/dev-login", "POST", { userId }); this.token = result.token; return result; }
  logout() { this.token = null; }
  tournaments() { return this.request("/api/tournaments"); }
  categories(tournamentId) { return this.request(`/api/tournaments/${tournamentId}/categories`); }
  tournament(input) { return this.request("/api/tournaments", "POST", input); }
  category(input) { return this.request("/api/categories", "POST", input); }
  team(input) { return this.request("/api/teams", "POST", input); }
  fixture(input) { return this.request("/api/fixtures", "POST", input); }
  schedule(matchId, input) { return this.request(`/api/matches/${matchId}/schedule`, "POST", input); }
  result(matchId, input) { return this.request(`/api/matches/${matchId}/result`, "POST", input); }
  categoryState(categoryId) { return this.request(`/api/categories/${categoryId}`); }
  competition(categoryId) { return this.request(`/api/categories/${categoryId}/competition`); }
  savePlayoffs(input) { return this.request("/api/playoffs", "POST", input); }
  officializePlayoffs(categoryId) { return this.request(`/api/categories/${categoryId}/playoffs/officialize`, "POST", {}); }
  playoffRule(categoryId, crossingMode) { return this.request(`/api/categories/${categoryId}/playoffs/rule`, crossingMode ? "POST" : "GET", crossingMode ? { crossingMode } : undefined); }
  playoffs(categoryId) { return this.request(`/api/categories/${categoryId}/playoffs`); }
  season(input) { return this.request("/api/seasons", "POST", input); }
  seasons() { return this.request("/api/seasons"); }
  lifecycle(categoryId, state) { return this.request(`/api/categories/${categoryId}/lifecycle`, state ? "POST" : "GET", state ? { state } : undefined); }
  organizationUsers(organizationId) { return this.request(`/api/organizations/${organizationId}/users`); }
  membership(input) { return this.request("/api/memberships", "POST", input); }
  revokeMembership(input) { return this.request("/api/memberships", "DELETE", input); }
  delegateAssignment(input) { return this.request("/api/delegate-assignments", "POST", input); }
  revokeDelegateAssignment(input) { return this.request("/api/delegate-assignments", "DELETE", input); }
  player(input) { return this.request("/api/players", "POST", input); }
  reviewDocument(input) { return this.request("/api/documents/reviews", "POST", input); }
  documents(categoryId) { return this.request(`/api/categories/${categoryId}/documents`); }
}

if (typeof module !== "undefined") module.exports = PostgresHttpClient;
else window.PostgresHttpClient = PostgresHttpClient;
