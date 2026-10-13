/**
 * Gera src/data/champion-details.json com as skins e habilidades de cada campeão,
 * usadas pelos modos Splash e Habilidade.
 *
 * Fonte: Data Dragon da Riot (championFull.json em pt_BR).
 *
 * Uso: npm run fetch:champions
 */
import { writeFile } from 'node:fs/promises'

const DDRAGON = 'https://ddragon.leagueoflegends.com'
const OUTPUT = new URL('../src/data/champion-details.json', import.meta.url)

interface DDragonImage {
  full: string
}

interface DDragonChampion {
  id: string
  // Chromas (variações de cor) têm parentSkin e não têm splash art própria.
  skins: { num: number; name: string; parentSkin?: number }[]
  passive: { name: string; image: DDragonImage }
  spells: { name: string; image: DDragonImage }[]
}

export interface Skin {
  num: number
  name: string
}

export interface Ability {
  key: 'P' | 'Q' | 'W' | 'E' | 'R'
  name: string
  // Caminho da imagem no Data Dragon, relativo a /cdn/<versão>/img/ (ex.: "spell/AhriQ.png").
  image: string
}

interface DetailsFile {
  ddragonVersion: string
  champions: Record<string, { skins: Skin[]; abilities: Ability[] }>
}

const SPELL_KEYS = ['Q', 'W', 'E', 'R'] as const

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Loldle2 data fetcher' } })
  if (!res.ok) throw new Error(`${res.status} ao buscar ${url}`)
  return (await res.json()) as T
}

const splashUrl = (championId: string, num: number) =>
  `${DDRAGON}/cdn/img/champion/splash/${championId}_${num}.jpg`

// Confere, em paralelo, quais splash arts existem de fato no CDN.
async function existingSplashes(items: { championId: string; num: number }[]): Promise<Set<string>> {
  const found = new Set<string>()
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const { championId, num } = items[next++]
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await fetch(splashUrl(championId, num), { method: 'HEAD' })
          if (res.ok) found.add(`${championId}_${num}`)
          if (res.ok || res.status === 404 || res.status === 403) break
        } catch {
          // tenta de novo
        }
      }
    }
  }
  await Promise.all(Array.from({ length: 16 }, worker))
  return found
}

async function main() {
  const [version] = await getJson<string[]>(`${DDRAGON}/api/versions.json`)
  const { data } = await getJson<{ data: Record<string, DDragonChampion> }>(
    `${DDRAGON}/cdn/${version}/data/pt_BR/championFull.json`,
  )

  const list = Object.values(data).sort((a, b) => a.id.localeCompare(b.id))
  const candidates = list.flatMap((champion) =>
    champion.skins.filter((skin) => skin.parentSkin === undefined).map(({ num }) => ({ championId: champion.id, num })),
  )
  const splashes = await existingSplashes(candidates)
  console.log(`${splashes.size} de ${candidates.length} splash arts encontradas`)

  const champions: DetailsFile['champions'] = {}
  for (const champion of list) {
    champions[champion.id] = {
      skins: champion.skins
        .filter((skin) => skin.parentSkin === undefined && splashes.has(`${champion.id}_${skin.num}`))
        // A skin padrão vem com o nome "default" no Data Dragon.
        .map(({ num, name }) => ({ num, name: num === 0 ? 'Padrão' : name })),
      abilities: [
        { key: 'P', name: champion.passive.name, image: `passive/${champion.passive.image.full}` },
        ...champion.spells.map((spell, i) => ({
          key: SPELL_KEYS[i],
          name: spell.name,
          image: `spell/${spell.image.full}`,
        })),
      ],
    }
  }

  const output: DetailsFile = { ddragonVersion: version, champions }
  await writeFile(OUTPUT, JSON.stringify(output, null, 2) + '\n')

  const skins = Object.values(champions).reduce((sum, c) => sum + c.skins.length, 0)
  console.log(`Data Dragon ${version}: ${Object.keys(champions).length} campeões, ${skins} skins`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
