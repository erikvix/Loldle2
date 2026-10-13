/**
 * Gera src/data/items.json com os itens da Summoner's Rift e suas receitas,
 * usados pelo modo Forja de Itens.
 *
 * Fonte: Data Dragon da Riot (item.json em pt_BR).
 *
 * Uso: npm run fetch:items
 */
import { writeFile } from 'node:fs/promises'

const DDRAGON = 'https://ddragon.leagueoflegends.com'
const OUTPUT = new URL('../src/data/items.json', import.meta.url)

interface DDragonItem {
  name: string
  from?: string[]
  gold: { total: number; purchasable: boolean }
  maps: Record<string, boolean>
  inStore?: boolean
  hideFromAll?: boolean
  requiredChampion?: string
  tags?: string[]
}

interface Item {
  name: string
  gold: number
  // Componentes diretos da receita (com repetição, ex.: duas Couraças de Pano).
  from?: string[]
  // Nível na árvore de receitas: 0 = básico (sem componentes), 1 = feito de básicos, etc.
  depth: number
  // Atributos que o item dá (ex.: Health, Armor), usados para escolher alternativas parecidas.
  stats: string[]
}

interface ItemsFile {
  ddragonVersion: string
  items: Record<string, Item>
  // Itens que podem ser o alvo de uma rodada (receita com 2 ou mais componentes).
  recipes: string[]
}

const SUMMONERS_RIFT = '11'

// Tags do Data Dragon que são atributos. Sinônimos viram um só (ex.: CooldownReduction e
// AbilityHaste); tags que não são atributo (Lane, Active, Vision...) ficam de fora.
const STAT_TAGS: Record<string, string> = {
  Health: 'Health',
  HealthRegen: 'HealthRegen',
  Armor: 'Armor',
  SpellBlock: 'SpellBlock',
  MagicResist: 'SpellBlock',
  Damage: 'Damage',
  SpellDamage: 'SpellDamage',
  AttackSpeed: 'AttackSpeed',
  CriticalStrike: 'CriticalStrike',
  OnHit: 'OnHit',
  LifeSteal: 'LifeSteal',
  SpellVamp: 'SpellVamp',
  ArmorPenetration: 'ArmorPenetration',
  MagicPenetration: 'MagicPenetration',
  AbilityHaste: 'AbilityHaste',
  CooldownReduction: 'AbilityHaste',
  Mana: 'Mana',
  ManaRegen: 'ManaRegen',
  NonbootsMovement: 'Movement',
  Boots: 'Movement',
  Tenacity: 'Tenacity',
}

// Itens compráveis na loja da Summoner's Rift. Ids acima de 100000 são variantes de outros
// modos (ex.: Arena) que repetem o nome dos itens normais.
const isShopItem = (id: string, item: DDragonItem) =>
  Number(id) < 100_000 &&
  item.maps[SUMMONERS_RIFT] &&
  item.gold.purchasable &&
  item.inStore !== false &&
  !item.hideFromAll &&
  !item.requiredChampion

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Loldle2 data fetcher' } })
  if (!res.ok) throw new Error(`${res.status} ao buscar ${url}`)
  return (await res.json()) as T
}

async function main() {
  const [version] = await getJson<string[]>(`${DDRAGON}/api/versions.json`)
  const { data } = await getJson<{ data: Record<string, DDragonItem> }>(
    `${DDRAGON}/cdn/${version}/data/pt_BR/item.json`,
  )

  const shop = Object.entries(data).filter(([id, item]) => isShopItem(id, item))
  const shopIds = new Set(shop.map(([id]) => id))

  const depthCache = new Map<string, number>()
  const depthOf = (id: string): number => {
    if (!depthCache.has(id)) {
      const from = data[id]?.from ?? []
      depthCache.set(id, from.length === 0 ? 0 : 1 + Math.max(...from.map(depthOf)))
    }
    return depthCache.get(id)!
  }

  const items: ItemsFile['items'] = {}
  const recipes: string[] = []
  for (const [id, item] of shop) {
    const from = item.from?.filter((component) => shopIds.has(component))
    const stats = [...new Set((item.tags ?? []).flatMap((tag) => (STAT_TAGS[tag] ? [STAT_TAGS[tag]] : [])))]
    items[id] = {
      name: item.name,
      gold: item.gold.total,
      ...(from?.length ? { from } : {}),
      depth: depthOf(id),
      stats: stats.sort(),
    }
    // Só entra como alvo se todos os componentes estiverem na loja.
    if (item.from && item.from.length >= 2 && from?.length === item.from.length) recipes.push(id)
  }

  const output: ItemsFile = { ddragonVersion: version, items, recipes: recipes.sort() }
  await writeFile(OUTPUT, JSON.stringify(output, null, 2) + '\n')
  console.log(`Data Dragon ${version}: ${shop.length} itens na loja, ${recipes.length} receitas`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
