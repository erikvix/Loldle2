import data from './quotes.json'

export interface Champion {
  id: string
  name: string
  title: string
}

export interface Quote {
  championId: string
  text: string
}

export const ddragonVersion: string = data.ddragonVersion

// Todos os campeões que podem ser chutados, inclusive os que ainda não têm falas.
export const champions: Champion[] = data.champions

export const championsById = new Map(champions.map((champion) => [champion.id, champion]))

export const quotes: Quote[] = Object.entries(data.quotes as Record<string, string[]>).flatMap(
  ([championId, texts]) => texts.map((text) => ({ championId, text })),
)

export function championIconUrl(championId: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${championId}.png`
}
