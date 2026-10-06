/**
 * Gera src/data/quotes.json com as falas de cada campeão.
 *
 * - Lista de campeões: Data Dragon da Riot (pt_BR e en_US)
 * - Falas dubladas em PT-BR: Wiki League of Legends PT-BR (CC BY-SA)
 * - Campeões sem falas em PT-BR: Wiki League of Legends em inglês (CC BY-SA),
 *   com as falas traduzidas em scripts/translations.json
 * - Fala oficial de cada campeão em PT-BR: Riot Universe (biografia do campeão)
 * - Áudio das falas dubladas: arquivos .ogg da wiki PT-BR, baixados para public/audio.
 *   O CDN da wiki bloqueia hotlink, por isso os arquivos ficam no próprio projeto.
 *
 * Falas em inglês ainda sem tradução são gravadas em scripts/untranslated.json
 * e ficam de fora do jogo até serem traduzidas.
 *
 * Uso: npm run fetch:quotes
 */
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'

const WIKI_PT = 'https://leagueoflegends.fandom.com/pt-br/api.php'
const WIKI_EN = 'https://leagueoflegends.fandom.com/api.php'
const DDRAGON = 'https://ddragon.leagueoflegends.com'
const UNIVERSE = 'https://universe-meeps.leagueoflegends.com/v1/pt_br'
const OUTPUT = new URL('../src/data/quotes.json', import.meta.url)
const TRANSLATIONS = new URL('./translations.json', import.meta.url)
const UNTRANSLATED = new URL('./untranslated.json', import.meta.url)
const AUDIO_DIR = new URL('../public/audio/', import.meta.url)

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
// `source: 'universe'` indica a fala oficial da biografia do campeão no Riot Universe.
// `audio` é o nome do arquivo .ogg da fala dublada em public/audio/.
export interface QuoteEntry {
  text: string
  original?: string
  source?: 'universe'
  audio?: string
}

interface WikiQuote {
  text: string
  file?: string
}

interface QuotesFile {
  ddragonVersion: string
  // Todos os campeões do jogo, para a lista de palpites não entregar quais têm falas.
  champions: Pick<DDragonChampion, 'id' | 'name' | 'title'>[]
  quotes: Record<string, QuoteEntry[]>
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function getJson<T>(url: string, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Loldle2 quote fetcher' } })
      // 404 não adianta repetir.
      if (res.status === 404) throw new Error(`404 ao buscar ${url}`)
      if (!res.ok) throw new Error(`${res.status} ao buscar ${url}`)
      return (await res.json()) as T
    } catch (error) {
      if (attempt >= attempts || (error as Error).message.startsWith('404')) throw error
      await sleep(1000 * attempt)
    }
  }
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

function extractQuotes(wikitext: string, source: WikiSource, names: string[]): WikiQuote[] {
  const forbidden = nameParts(names)
  const quotes = new Map<string, WikiQuote>()

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

    // O primeiro {{sm2|arquivo.ogg}} da linha é o áudio da skin clássica.
    const file = line.match(/\{\{sm2\|([^|}]+\.ogg)/i)?.[1].trim()
    if (!quotes.has(quote)) quotes.set(quote, { text: quote, file })
  }
  return [...quotes.values()].slice(0, source.maxQuotes)
}

const AUDIO_BASE = 'https://static.wikia.nocookie.net/leagueoflegends/images/'

// Resolve nomes de arquivo de áudio para caminhos no CDN da wiki (ex.: "f/f0/Ahri_Seleção.ogg").
async function resolveAudio(api: string, files: string[]): Promise<Map<string, string>> {
  const paths = new Map<string, string>()
  const unique = [...new Set(files)]
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50)
    const params = new URLSearchParams({
      action: 'query',
      titles: batch.map((file) => `File:${file}`).join('|'),
      prop: 'imageinfo',
      iiprop: 'url',
      format: 'json',
    })
    try {
      const data = await getJson<{
        query: {
          normalized?: { from: string; to: string }[]
          pages: Record<string, { title: string; imageinfo?: { url: string }[] }>
        }
      }>(`${api}?${params}`)
      const urlByTitle = new Map(
        Object.values(data.query.pages).map((page) => [page.title, page.imageinfo?.[0]?.url]),
      )
      const titleByRequest = new Map(data.query.normalized?.map(({ from, to }) => [from, to]))
      for (const file of batch) {
        const requested = `File:${file}`
        const url = urlByTitle.get(titleByRequest.get(requested) ?? requested)
        if (url?.startsWith(AUDIO_BASE)) paths.set(file, url.slice(AUDIO_BASE.length).split('/revision/')[0])
      }
    } catch (error) {
      console.warn(`  ! áudio: ${(error as Error).message}`)
    }
  }
  return paths
}

// Nome do arquivo local, só com ASCII (ex.: "f/f0/Ahri_Sele%C3%A7%C3%A3o.ogg" -> "Ahri_Selecao.ogg").
function localAudioName(path: string): string {
  return decodeURIComponent(path.split('/').pop()!)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]/g, '_')
}

const fileExists = (url: URL) => stat(url).then(() => true, () => false)

// Baixa o áudio da wiki PT-BR para public/audio, se ainda não estiver lá.
async function downloadAudio(path: string): Promise<string | null> {
  const name = localAudioName(path)
  const dest = new URL(name, AUDIO_DIR)
  if (await fileExists(dest)) return name
  try {
    const res = await fetch(`${AUDIO_BASE}${path}/revision/latest?path-prefix=pt-br`, {
      headers: { 'User-Agent': 'Loldle2 quote fetcher' },
    })
    if (!res.ok) throw new Error(`${res.status}`)
    await writeFile(dest, Buffer.from(await res.arrayBuffer()))
    await sleep(100)
    return name
  } catch (error) {
    console.warn(`  ! áudio ${name}: ${(error as Error).message}`)
    return null
  }
}

async function withAudio(quotes: WikiQuote[]): Promise<QuoteEntry[]> {
  const paths = await resolveAudio(
    PT_SOURCE.api,
    quotes.flatMap(({ file }) => (file ? [file] : [])),
  )
  const entries: QuoteEntry[] = []
  for (const { text, file } of quotes) {
    const path = file ? paths.get(file) : undefined
    const audio = path ? await downloadAudio(path) : null
    entries.push(audio ? { text, audio } : { text })
  }
  return entries
}

async function fetchQuotes(source: WikiSource, pageNames: string[], names: string[]): Promise<WikiQuote[]> {
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

// Slugs do Riot Universe que não são só o id do Data Dragon em minúsculas.
const UNIVERSE_SLUGS: Record<string, string> = { Renata: 'renataglasc' }

interface UniverseChampion {
  champion: { biography: { quote?: string; 'quote-author'?: string } }
}

function normalizeName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
}

// Remove as aspas que envolvem a fala no Universe, que variam: "...", “...”, ''...'', “...”.
function stripWrappingQuotes(text: string): string {
  let quote = text
    .replace(/<[^>]+>/g, ' ') // tags HTML como <i> e <br/>
    .trim()
    .replace(/["”'’]+([.!?…])$/, '$1') // aspas antes do ponto final
  const opener = ["''", '"', '“', "'", '‘'].find((token) => quote.startsWith(token))
  if (opener) quote = quote.slice(opener.length)
  const closer = ["''", '"', '”', "'", '’'].find((token) => quote.endsWith(token))
  if (closer) quote = quote.slice(0, -closer.length)
  // Aspas que sobram no meio separam falas de um diálogo (ex.: Kindred).
  quote = quote.replace(/''|"/g, ' ')
  // Aspa simples sem par antes de pontuação (ex.: Heimerdinger, "Impossível', você diz?").
  if ((quote.match(/'/g) ?? []).length % 2 === 1) quote = quote.replace(/'(?=[,.!?])/, '')
  return quote.replace(/\s+/g, ' ').trim()
}

// Fala oficial da biografia do campeão no Riot Universe, se for dita pelo próprio campeão.
async function fetchUniverseQuote(championId: string, names: string[]): Promise<string | null> {
  const slug = UNIVERSE_SLUGS[championId] ?? championId.toLowerCase()
  let biography: UniverseChampion['champion']['biography']
  try {
    biography = (await getJson<UniverseChampion>(`${UNIVERSE}/champions/${slug}/index.json`)).champion.biography
  } catch (error) {
    console.warn(`  ! Universe ${slug}: ${(error as Error).message}`)
    return null
  }

  // Autor vazio é o próprio campeão; outro autor (ex.: Ryze na página do Bardo) fica de fora.
  const author = biography['quote-author']?.trim()
  if (author && !names.some((name) => normalizeName(name) === normalizeName(author))) return null

  const quote = stripWrappingQuotes(biography.quote ?? '')
  if (quote.length < MIN_LENGTH) return null
  const lower = quote.toLowerCase()
  if (nameParts(names).some((part) => lower.includes(part))) return null
  return quote
}

async function main() {
  await mkdir(AUDIO_DIR, { recursive: true })
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

    let voiceQuotes: QuoteEntry[]
    const ptQuotes = await fetchQuotes(PT_SOURCE, [champion.name], names)
    if (ptQuotes.length > 0) {
      voiceQuotes = await withAudio(ptQuotes)
    } else {
      // Algumas páginas usam o id do Data Dragon (ex.: "Nunu" em vez de "Nunu & Willump").
      const enQuotes = await fetchQuotes(EN_SOURCE, [englishName, champion.id], names)
      const forbidden = nameParts(names)
      const translatable = enQuotes.filter(({ text }) => translations[text])
      voiceQuotes = translatable
        .map(({ text }) => ({ text: translations[text], original: text }))
        // A tradução também não pode entregar o nome do campeão.
        .filter(({ text }) => !forbidden.some((part) => text.toLowerCase().includes(part)))
      const pending = enQuotes.filter(({ text }) => !translations[text]).map(({ text }) => text)
      if (pending.length > 0) untranslated[champion.id] = pending
    }

    const universeQuote = await fetchUniverseQuote(champion.id, names)
    const quotes: QuoteEntry[] = universeQuote ? [{ text: universeQuote, source: 'universe' }] : []
    // A fala oficial substitui uma igual vinda da wiki (ex.: tradução nossa da mesma frase).
    const official = universeQuote ? normalizeName(universeQuote) : null
    quotes.push(...voiceQuotes.filter(({ text }) => normalizeName(text) !== official))

    if (quotes.length > 0) quotesById[champion.id] = quotes
    else missing.push(champion.name)

    const dubbed = quotes.filter((q) => !q.original && !q.source).length
    console.log(
      `  ${champion.name}: ${universeQuote ? '1 oficial, ' : ''}${dubbed} dubladas, ` +
        `${quotes.length - dubbed - (universeQuote ? 1 : 0)} traduzidas`,
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

  // Remove áudios que não são mais usados por nenhuma fala.
  const used = new Set(Object.values(quotesById).flatMap((quotes) => quotes.map((q) => q.audio)))
  for (const file of await readdir(AUDIO_DIR)) {
    if (!used.has(file)) await rm(new URL(file, AUDIO_DIR))
  }

  const entries = Object.values(quotesById).flat()
  const translatedCount = entries.filter((q) => q.original).length
  const officialCount = entries.filter((q) => q.source === 'universe').length
  const audioCount = entries.filter((q) => q.audio).length
  const pendingCount = Object.values(untranslated).flat().length
  console.log(
    `\n${Object.keys(quotesById).length} campeões, ${entries.length} falas ` +
      `(${officialCount} oficiais, ${entries.length - translatedCount - officialCount} dubladas, ` +
      `${translatedCount} traduzidas), ${audioCount} com áudio`,
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
