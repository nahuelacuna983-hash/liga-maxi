"use strict";

class PostgresHttpClient {
  constructor(baseUrl) { this.baseUrl = baseUrl.replace(/\/$/, ""); }
  async request(path, method = "GET", payload) {
    const response = await fetch(`${this.baseUrl}${path}`, { method, headers: { "content-type": "application/json" }, body: payload === undefined ? undefined : JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Error HTTP ${response.status}`);
    return data;
  }
  health() { return this.request("/health"); }
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
  playoffs(categoryId) { return this.request(`/api/categories/${categoryId}/playoffs`); }
}

if (typeof module !== "undefined") module.exports = PostgresHttpClient;
else window.PostgresHttpClient = PostgresHttpClient;
