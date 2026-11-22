(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ApdbAdministrativeAdapter = factory();
}(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  function requireClient(client) {
    if (!client || typeof client.rpc !== "function") throw new Error("Cliente Supabase requerido.");
    return client;
  }
  async function ensureTournamentCategoryTeams(client, input) {
    requireClient(client);
    const { data, error } = await client.rpc("apdb_ensure_tournament_category_teams", {
      p_tournament_name: input.tournamentName,
      p_season: String(input.season),
      p_category_name: input.categoryName,
      p_team_names: input.teamNames,
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }
  async function setDelegateScope(client, input) {
    requireClient(client);
    const { data, error } = await client.rpc("apdb_set_delegate_scope", {
      p_target_auth_user_id: input.targetAuthUserId,
      p_tournament_id: input.tournamentId,
      p_category_id: input.categoryId,
      p_team_id: input.teamId,
      p_can_load_results: input.canLoadResults !== false,
      p_can_load_documents: Boolean(input.canLoadDocuments),
    });
    if (error) throw error;
    return data;
  }
  async function revokeDelegateScope(client, permissionId) {
    requireClient(client);
    const { data, error } = await client.rpc("apdb_revoke_delegate_scope", { p_permission_id: permissionId });
    if (error) throw error;
    return data;
  }
  return Object.freeze({ ensureTournamentCategoryTeams, setDelegateScope, revokeDelegateScope });
}));
