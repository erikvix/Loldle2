/**
 * Gera src/data/quotes.json com as falas dubladas em PT-BR de cada campeão.
 *
 * - Lista de campeões: Data Dragon da Riot (pt_BR)
 * - Falas: Wiki League of Legends PT-BR (CC BY-SA), páginas "<Campeão>/LoL/Áudio"
 *
 * Uso: npm run fetch:quotes
 */
import { writeFile } from 'node:fs/promises'

const WIKI_API = 'https://leagueoflegends.fandom.com/pt-br/api.php'
const DDRAGON = 'https://ddragon.leagueoflegends.com'
const OUTPUT = new URL('../src/data/quotes.json', import.meta.url)

// Páginas da wiki onde as falas podem estar, em ordem de preferência.
const AUDIO_PAGES = [(name: string) => `${name}/LoL/Áudio`, (name: string) => `${name}/Falas`]

const MIN_LENGTH = 12
const MAX_LENGTH = 160
const MAX_QUOTES_PER_CHAMPION = 30

interface DDragonChampion {
  id: string
  name: string
  title: string
}

interface QuotesFile {
  ddragonVersion: string
  // Todos os campeões do jogo, para a lista de palpites não entregar quais têm falas.
  champions: Pick<DDragonChampion, 'id' | 'name' | 'title'>[]
  quotes: Record<string, string[]>
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Loldle2 quote fetcher' } })
  if (!res.ok) throw new Error(`${res.status} ao buscar ${url}`)
  return (await res.json()) as T
}

async function getChampions() {
  const [version] = await getJson<string[]>(`${DDRAGON}/api/versions.json`)
  const data = await getJson<{ data: Record<string, DDragonChampion> }>(
    `${DDRAGON}/cdn/${version}/data/pt_BR/champion.json`,
  )
  return { version, champions: Object.values(data.data) }
}

async function getWikitext(page: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'parse',
    page,
    prop: 'wikitext',
    format: 'json',
    redirects: '1',
  })
  const data = await getJson<{ parse?: { wikitext: { '*': string } } }>(`${WIKI_API}?${params}`)
  return data.parse?.wikitext['*'] ?? null
}

// Mantém o cabeçalho e a aba da skin clássica; as abas das outras skins são separadas por "|-|".
function classicSection(wikitext: string): string {
  const tabberStart = wikitext.indexOf('<tabber>')
  if (tabberStart === -1) return wikitext

  const header = wikitext.slice(0, tabberStart)
  const classicStart = wikitext.indexOf('Clássica=', tabberStart)
  if (classicStart === -1) return header

  const classicEnd = wikitext.indexOf('|-|', classicStart)
  return header + wikitext.slice(classicStart, classicEnd === -1 ? undefined : classicEnd)
}

function cleanWikiMarkup(text: string): string {
  return text
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1') // [[Link|Texto]] -> Texto
    .replace(/\{\{[^}]*\}\}/g, '') // templates
    .replace(/<[^>]+>/g, '') // tags HTML
    .replace(/'{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractQuotes(wikitext: string, championName: string): string[] {
  const nameParts = championName
    .toLowerCase()
    .split(/[\s'.&]+/)
    .filter((part) => part.length >= 3)

  const quotes = new Set<string>()
  for (const line of classicSection(wikitext).split('\n')) {
    if (!line.startsWith('*')) continue
    // Apenas linhas com uma única fala entre aspas (sem narração no meio).
    if (line.split('"').length !== 3) continue
    const match = line.match(/"([^"]+)"(?:'')?\s*$/)
    if (!match) continue

    const quote = cleanWikiMarkup(match[1])
    if (quote.length < MIN_LENGTH || quote.length > MAX_LENGTH) continue
    // Descarta falas que entregam o nome do campeão.
    const lower = quote.toLowerCase()
    if (nameParts.some((part) => lower.includes(part))) continue

    quotes.add(quote)
  }
  return [...quotes].slice(0, MAX_QUOTES_PER_CHAMPION)
}

async function main() {
  const { version, champions } = await getChampions()
  console.log(`Data Dragon ${version}: ${champions.length} campeões`)

  const quotesById: QuotesFile['quotes'] = {}
  const missing: string[] = []

  for (const champion of champions) {
    let quotes: string[] = []
    for (const page of AUDIO_PAGES) {
      try {
        const wikitext = await getWikitext(page(champion.name))
        if (wikitext) quotes = extractQuotes(wikitext, champion.name)
      } catch (error) {
        console.warn(`  ! ${champion.name}: ${(error as Error).message}`)
      }
      if (quotes.length > 0) break
      await sleep(150)
    }

    if (quotes.length === 0) {
      missing.push(champion.name)
    } else {
      quotesById[champion.id] = quotes
      console.log(`  ${champion.name}: ${quotes.length} falas`)
    }
    await sleep(150)
  }

  const output: QuotesFile = {
    ddragonVersion: version,
    champions: champions
      .map(({ id, name, title }) => ({ id, name, title }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    quotes: quotesById,
  }
  await writeFile(OUTPUT, JSON.stringify(output, null, 2) + '\n')

  const withQuotes = Object.values(quotesById)
  const total = withQuotes.reduce((sum, quotes) => sum + quotes.length, 0)
  console.log(`\n${withQuotes.length} campeões, ${total} falas salvas em src/data/quotes.json`)
  if (missing.length > 0) console.log(`Sem falas (${missing.length}): ${missing.join(', ')}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
