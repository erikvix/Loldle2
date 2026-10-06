import { champions, quotes, type Champion, type Quote } from '@/data/quotes'

const quotesByChampion = new Map<string, Quote[]>()
for (const quote of quotes) {
  quotesByChampion.set(quote.championId, [...(quotesByChampion.get(quote.championId) ?? []), quote])
}
const championIdsWithQuotes = [...quotesByChampion.keys()]

const randomItem = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

// Sorteia primeiro o campeão e depois a fala, para todos terem a mesma chance
// independentemente de quantas falas têm. Evita repetir o campeão da rodada anterior.
export function pickRandomQuote(previous?: Quote): Quote {
  const pool = previous
    ? championIdsWithQuotes.filter((id) => id !== previous.championId)
    : championIdsWithQuotes
  return randomItem(quotesByChampion.get(randomItem(pool))!)
}

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/gi, '')
    .toLowerCase()
    .trim()
}

// Campeões cujo nome (ou alguma palavra do nome) começa com o texto digitado.
export function searchChampions(search: string, exclude: Set<string>): Champion[] {
  const query = normalize(search)
  if (!query) return []
  return champions.filter((champion) => {
    if (exclude.has(champion.id)) return false
    const name = normalize(champion.name)
    return name.startsWith(query) || name.split(' ').some((word) => word.startsWith(query))
  })
}
