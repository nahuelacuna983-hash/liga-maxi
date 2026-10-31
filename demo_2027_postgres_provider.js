"use strict";

const sports = require("./demo_2027_sports.js");

class PostgresProvider {
  constructor(client) { this.client = client; this.cache = new Map(); }
  async loadCategory(categoryId) {
    const state = await this.client.categoryState(categoryId);
    const names = new Map(state.teams.map((team) => [team.id, team.name]));
    const matches = state.matches.map((match) => ({ ...match, local: names.get(match.home_team_id), visitante: names.get(match.away_team_id), puntos_local: match.home_score, puntos_visitante: match.away_score, estado_resultado: match.result_state }));
    const result = { ...state, matches, table: sports.calcularTabla(matches) };
    this.cache.set(categoryId, result);
    return result;
  }
  async createTournament(input) { return this.client.tournament(input); }
  async createCategory(input) { return this.client.category(input); }
  async addTeam(input) { return this.client.team(input); }
  async saveFixture(input) { return this.client.fixture(input); }
  async schedule(matchId, input) { return this.client.schedule(matchId, input); }
  async saveResult(matchId, input) { return this.client.result(matchId, input); }
}

module.exports = PostgresProvider;
