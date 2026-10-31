"use strict";

class PostgresRepository {
  constructor(pool) { if (!pool || typeof pool.connect !== "function") throw new Error("Se requiere un pool PostgreSQL compatible."); this.pool = pool; }
  async transaction(work) {
    const client = await this.pool.connect();
    try { await client.query("BEGIN"); const result = await work(client); await client.query("COMMIT"); return result; }
    catch (error) { try { await client.query("ROLLBACK"); } catch {} throw error; }
    finally { client.release(); }
  }
  async createTournament({ id, organizationId, name, season, state = "draft" }) { return this.transaction(async (db) => { const { rows } = await db.query("insert into lm_demo_tournaments(id, organization_id, name, season, state) values($1,$2,$3,$4,$5) returning *", [id, organizationId, name, season, state]); return rows[0]; }); }
  async createCategory({ id, tournamentId, name }) { return this.transaction(async (db) => { const { rows } = await db.query("insert into lm_demo_categories(id, tournament_id, name) values($1,$2,$3) returning *", [id, tournamentId, name]); return rows[0]; }); }
  async addTeam({ id, categoryId, name }) { return this.transaction(async (db) => { const { rows } = await db.query("insert into lm_demo_teams(id, category_id, name) values($1,$2,$3) returning *", [id, categoryId, name]); return rows[0]; }); }
  async saveFixture(categoryId, matches, actorId) { return this.transaction(async (db) => { for (const match of matches) await db.query("insert into lm_demo_matches(id, category_id, round_no, home_team_id, away_team_id) values($1,$2,$3,$4,$5)", [match.id, categoryId, match.round, match.homeTeamId, match.awayTeamId]); await db.query("insert into lm_demo_match_history(match_id, actor_id, action, payload) select id, $2, 'fixture_saved', jsonb_build_object('category_id',$1::uuid) from lm_demo_matches where category_id=$1::uuid", [categoryId, actorId]); return matches.length; }); }
  async scheduleMatch({ matchId, actorId, scheduledAt, court }) { return this.transaction(async (db) => { const { rows } = await db.query("update lm_demo_matches set scheduled_at=$1, court=$2 where id=$3 and result_state='pending' returning *", [scheduledAt, court, matchId]); if (!rows[0]) throw new Error("Partido inexistente o ya disputado."); await db.query("insert into lm_demo_match_history(match_id, actor_id, action, payload) values($1,$2,'schedule_updated',$3)", [matchId, actorId, JSON.stringify({ scheduledAt, court })]); return rows[0]; }); }
  async saveResult({ matchId, actorId, homeScore, awayScore, state = "played" }) { return this.transaction(async (db) => { const locked = await db.query("select * from lm_demo_matches where id=$1 for update", [matchId]); if (!locked.rows[0] || locked.rows[0].result_state !== 'pending') throw new Error("Partido inexistente o ya disputado."); const { rows } = await db.query("update lm_demo_matches set home_score=$1, away_score=$2, result_state=$3 where id=$4 returning *", [homeScore, awayScore, state, matchId]); await db.query("insert into lm_demo_match_history(match_id, actor_id, action, payload) values($1,$2,'result_saved',$3)", [matchId, actorId, JSON.stringify({ homeScore, awayScore, state })]); return rows[0]; }); }
  async readCategory(categoryId) { const client = await this.pool.connect(); try { const category = await client.query("select * from lm_demo_categories where id=$1", [categoryId]); const matches = await client.query("select * from lm_demo_matches where category_id=$1 order by round_no, id", [categoryId]); const history = await client.query("select * from lm_demo_match_history where match_id in (select id from lm_demo_matches where category_id=$1) order by created_at", [categoryId]); return { category: category.rows[0], matches: matches.rows, history: history.rows }; } finally { client.release(); } }
  async readTournaments() { const client = await this.pool.connect(); try { const { rows } = await client.query("select * from lm_demo_tournaments order by season, id"); return rows; } finally { client.release(); } }
  async readCategories(tournamentId) { const client = await this.pool.connect(); try { const { rows } = await client.query("select * from lm_demo_categories where tournament_id=$1 order by id", [tournamentId]); return rows; } finally { client.release(); } }
  async close() { return this.pool.end(); }
}
module.exports = PostgresRepository;
