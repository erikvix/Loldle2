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
}

interface Item {
  name: string
  gold: number
  // Componentes diretos da receita (com repetição, ex.: duas Couraças de Pano).
  from?: string[]
}

interface ItemsFile {
  ddragonVersion: string
  items: Record<string, Item>
  // Itens que podem ser o alvo de uma rodada (receita com 2 ou mais componentes).
  recipes: string[]
}

const SUMMONERS_RIFT = '11'

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

  const items: ItemsFile['items'] = {}
  const recipes: string[] = []
  for (const [id, item] of shop) {
    const from = item.from?.filter((component) => shopIds.has(component))
    items[id] = { name: item.name, gold: item.gold.total, ...(from?.length ? { from } : {}) }
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
