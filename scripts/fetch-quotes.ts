/**
 * Gera src/data/quotes.json com as falas de cada campeão.
 *
 * - Lista de campeões: Data Dragon da Riot (pt_BR e en_US)
 * - Falas dubladas em PT-BR: Wiki League of Legends PT-BR (CC BY-SA)
 * - Campeões sem falas em PT-BR: Wiki League of Legends em inglês (CC BY-SA),
 *   com as falas traduzidas em scripts/translations.json
 *
 * Falas em inglês ainda sem tradução são gravadas em scripts/untranslated.json
 * e ficam de fora do jogo até serem traduzidas.
 *
 * Uso: npm run fetch:quotes
 */
import { readFile, rm, writeFile } from 'node:fs/promises'

const WIKI_PT = 'https://leagueoflegends.fandom.com/pt-br/api.php'
const WIKI_EN = 'https://leagueoflegends.fandom.com/api.php'
const DDRAGON = 'https://ddragon.leagueoflegends.com'
const OUTPUT = new URL('../src/data/quotes.json', import.meta.url)
const TRANSLATIONS = new URL('./translations.json', import.meta.url)
const UNTRANSLATED = new URL('./untranslated.json', import.meta.url)

interface WikiSource {
  api: string
  // Páginas onde as falas podem estar, em ordem de preferência.
  pages: ((name: string) => string)[]
  // Nome da aba da skin clássica na página de áudio.
  classicTab: string
  maxQuotes: number
}

const PT_SOURCE: WikiSource = {
  api: WIKI_PT,
  pages: [(name) => `${name}/LoL/Áudio`, (name) => `${name}/Falas`],
  classicTab: 'Clássica=',
  maxQuotes: 30,
}

const EN_SOURCE: WikiSource = {
  api: WIKI_EN,
  pages: [(name) => `${name}/LoL/Audio`],
  classicTab: 'Classic=',
  maxQuotes: 15,
}

const MIN_LENGTH = 12
const MAX_LENGTH = 160

interface DDragonChampion {
  id: string
  name: string
  title: string
}

// `original` presente indica fala traduzida automaticamente do inglês.
export interface QuoteEntry {
  text: string
  original?: string
}

interface QuotesFile {
  ddragonVersion: string
  // Todos os campeões do jogo, para a lista de palpites não entregar quais têm falas.
  champions: Pick<DDragonChampion, 'id' | 'name' | 'title'>[]
  quotes: Record<string, QuoteEntry[]>
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Loldle2 quote fetcher' } })
  if (!res.ok) throw new Error(`${res.status} ao buscar ${url}`)
  return (await res.json()) as T
}

async function getChampions(version: string, locale: string) {
  const data = await getJson<{ data: Record<string, DDragonChampion> }>(
    `${DDRAGON}/cdn/${version}/data/${locale}/champion.json`,
  )
  return Object.values(data.data)
}

async function getWikitext(api: string, page: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'parse',
    page,
    prop: 'wikitext',
    format: 'json',
    redirects: '1',
  })
  const data = await getJson<{ parse?: { wikitext: { '*': string } } }>(`${api}?${params}`)
  return data.parse?.wikitext['*'] ?? null
}

// Mantém o cabeçalho e a aba da skin clássica; as abas das outras skins são separadas por "|-|".
function classicSection(wikitext: string, classicTab: string): string {
  const tabberStart = wikitext.indexOf('<tabber>')
  if (tabberStart === -1) return wikitext

  const header = wikitext.slice(0, tabberStart)
  const classicStart = wikitext.indexOf(classicTab, tabberStart)
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

function nameParts(names: string[]): string[] {
  return names.flatMap((name) =>
    name
      .toLowerCase()
      .split(/[\s'.&]+/)
      .filter((part) => part.length >= 3),
  )
}

function extractQuotes(wikitext: string, source: WikiSource, names: string[]): string[] {
  const forbidden = nameParts(names)
  const quotes = new Set<string>()

  for (const line of classicSection(wikitext, source.classicTab).split('\n')) {
    if (!line.startsWith('*')) continue
    // Apenas linhas com uma única fala entre aspas (sem narração no meio).
    if (line.split('"').length !== 3) continue
    const match = line.match(/"([^"]+)"(?:'')?\s*$/)
    if (!match) continue

    const quote = cleanWikiMarkup(match[1])
    if (quote.length < MIN_LENGTH || quote.length > MAX_LENGTH) continue
    // Descarta falas que entregam o nome do campeão.
    const lower = quote.toLowerCase()
    if (forbidden.some((part) => lower.includes(part))) continue

    quotes.add(quote)
  }
  return [...quotes].slice(0, source.maxQuotes)
}

async function fetchQuotes(source: WikiSource, pageNames: string[], names: string[]): Promise<string[]> {
  for (const pageName of new Set(pageNames)) {
    for (const page of source.pages) {
      try {
        const wikitext = await getWikitext(source.api, page(pageName))
        const quotes = wikitext ? extractQuotes(wikitext, source, names) : []
        if (quotes.length > 0) return quotes
      } catch (error) {
        console.warn(`  ! ${page(pageName)}: ${(error as Error).message}`)
      }
      await sleep(150)
    }
  }
  return []
}

async function main() {
  const [version] = await getJson<string[]>(`${DDRAGON}/api/versions.json`)
  const champions = await getChampions(version, 'pt_BR')
  const englishNames = new Map((await getChampions(version, 'en_US')).map((c) => [c.id, c.name]))
  const translations: Record<string, string> = JSON.parse(await readFile(TRANSLATIONS, 'utf8'))
  console.log(`Data Dragon ${version}: ${champions.length} campeões`)

  const quotesById: QuotesFile['quotes'] = {}
  const untranslated: Record<string, string[]> = {}
  const missing: string[] = []

  for (const champion of champions) {
    const englishName = englishNames.get(champion.id) ?? champion.name
    const names = [champion.name, englishName]

    const ptQuotes = await fetchQuotes(PT_SOURCE, [champion.name], names)
    if (ptQuotes.length > 0) {
      quotesById[champion.id] = ptQuotes.map((text) => ({ text }))
      console.log(`  ${champion.name}: ${ptQuotes.length} falas (PT-BR)`)
      continue
    }

    // Algumas páginas usam o id do Data Dragon (ex.: "Nunu" em vez de "Nunu & Willump").
    const enQuotes = await fetchQuotes(EN_SOURCE, [englishName, champion.id], names)
    const forbidden = nameParts(names)
    const translated = enQuotes
      .filter((original) => translations[original])
      .map((original) => ({ text: translations[original], original }))
      // A tradução também não pode entregar o nome do campeão.
      .filter(({ text }) => !forbidden.some((part) => text.toLowerCase().includes(part)))
    const pending = enQuotes.filter((original) => !translations[original])

    if (pending.length > 0) untranslated[champion.id] = pending
    if (translated.length > 0) quotesById[champion.id] = translated
    else missing.push(champion.name)

    console.log(
      `  ${champion.name}: ${translated.length} falas (traduzidas)` +
        (pending.length > 0 ? `, ${pending.length} sem tradução` : ''),
    )
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

  const entries = Object.values(quotesById).flat()
  const translatedCount = entries.filter((q) => q.original).length
  const pendingCount = Object.values(untranslated).flat().length
  console.log(
    `\n${Object.keys(quotesById).length} campeões, ${entries.length} falas ` +
      `(${entries.length - translatedCount} dubladas, ${translatedCount} traduzidas)`,
  )
  if (pendingCount > 0) {
    await writeFile(UNTRANSLATED, JSON.stringify(untranslated, null, 2) + '\n')
    console.log(`${pendingCount} falas aguardando tradução em scripts/untranslated.json`)
  } else {
    await rm(UNTRANSLATED, { force: true })
  }
  if (missing.length > 0) console.log(`Sem falas (${missing.length}): ${missing.join(', ')}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
