import data from './quotes.json'

export interface Champion {
  id: string
  name: string
  title: string
}

export interface Quote {
  championId: string
  text: string
  // Fala original em inglês, quando o texto foi traduzido automaticamente.
  original?: string
}

export const ddragonVersion: string = data.ddragonVersion

// Todos os campeões que podem ser chutados, inclusive os que ainda não têm falas.
export const champions: Champion[] = data.champions

export const championsById = new Map(champions.map((champion) => [champion.id, champion]))

export const quotes: Quote[] = Object.entries(
  data.quotes as Record<string, Omit<Quote, 'championId'>[]>,
).flatMap(([championId, entries]) => entries.map((entry) => ({ championId, ...entry })))

export function championIconUrl(championId: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${championId}.png`
}
