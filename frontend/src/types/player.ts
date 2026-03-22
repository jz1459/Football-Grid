/** One autocomplete row from `POST /search_players` (may combine positions for one GSIS id). */
export interface PlayerSuggestion {
  name: string;
  position: string;
}
