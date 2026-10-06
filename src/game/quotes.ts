import { champions, quotes, type Champion, type Quote } from '@/data/quotes'

// Sorteia uma fala, evitando repetir o mesmo campeão da rodada anterior.
export function pickRandomQuote(previous?: Quote): Quote {
  const pool = previous ? quotes.filter((q) => q.championId !== previous.championId) : quotes
  return pool[Math.floor(Math.random() * pool.length)]
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
