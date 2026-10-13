import { items, recipeItemIds, type Item } from '@/data/items'

export const FORGE_ATTEMPTS = 3
const DECOYS = 3

// Itens que aparecem como componente em alguma receita (com algum atributo): as
// alternativas falsas saem daqui, para parecerem peças de verdade.
const componentIds = [...new Set(recipeItemIds.flatMap((id) => items[id].from ?? []))].filter(
  (id) => items[id].stats.length > 0,
)

const randomItem = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)]
const shuffle = <T,>(list: T[]): T[] => [...list].sort(() => Math.random() - 0.5)

// Famílias de atributos: quando não há item com o mesmo atributo, um da mesma família ainda
// engana (ex.: velocidade de ataque para um item de dano físico).
const STAT_FAMILIES: Record<string, string> = {
  Damage: 'physical',
  AttackSpeed: 'physical',
  CriticalStrike: 'physical',
  ArmorPenetration: 'physical',
  LifeSteal: 'physical',
  OnHit: 'physical',
  SpellDamage: 'magic',
  MagicPenetration: 'magic',
  Mana: 'magic',
  ManaRegen: 'magic',
  SpellVamp: 'magic',
  Health: 'defense',
  HealthRegen: 'defense',
  Armor: 'defense',
  SpellBlock: 'defense',
  Tenacity: 'defense',
  AbilityHaste: 'utility',
  Movement: 'utility',
}

const families = (item: Item) => new Set(item.stats.map((stat) => STAT_FAMILIES[stat]))

// Semelhança com o alvo: atributo igual vale 2, atributo da mesma família vale 1.
function similarity(candidate: Item, target: Item): number {
  const sameStats = candidate.stats.filter((stat) => target.stats.includes(stat)).length
  const targetFamilies = families(target)
  const sameFamilies = [...families(candidate)].filter((family) => targetFamilies.has(family)).length
  return sameStats * 2 + sameFamilies
}

export interface ForgeRound {
  itemId: string
  recipe: string[]
  // Componentes da receita (sem repetição) misturados com alternativas falsas.
  options: string[]
}

// Alternativas falsas difíceis: do mesmo nível que algum componente certo (básico com básico,
// intermediário com intermediário) e com atributos em comum com o item alvo (ou, na falta,
// da mesma família). Um item com vida, armadura e resistência mágica recebe, por exemplo,
// outros componentes de vida ou resistência.
function pickDecoys(target: Item, recipe: string[]): string[] {
  const recipeIds = new Set(recipe)
  const recipeDepths = shuffle([...new Set(recipe.map((id) => items[id].depth))])
  const decoys: string[] = []

  for (let i = 0; decoys.length < DECOYS && i < DECOYS * 3; i++) {
    const depth = recipeDepths[i % recipeDepths.length]
    const candidates = componentIds
      .map((id) => items[id])
      .filter(
        (item) =>
          item.depth === depth &&
          item.depth < target.depth &&
          item.id !== target.id &&
          !recipeIds.has(item.id) &&
          !decoys.includes(item.id),
      )
    if (candidates.length === 0) continue

    // Fica entre os mais parecidos com o alvo, com alguma variação para não repetir sempre os mesmos.
    const best = Math.max(...candidates.map((item) => similarity(item, target)))
    const similar = candidates.filter((item) => similarity(item, target) >= Math.max(1, best - 1))
    decoys.push(randomItem(similar.length > 0 ? similar : candidates).id)
  }
  return decoys
}

export function pickForgeRound(previousId?: string): ForgeRound {
  const itemId = randomItem(recipeItemIds.filter((id) => id !== previousId))
  const recipe = items[itemId].from!
  const decoys = pickDecoys(items[itemId], recipe)
  return { itemId, recipe, options: shuffle([...new Set(recipe), ...decoys]) }
}

// Quantos componentes escolhidos batem com a receita, contando repetições e ignorando a ordem.
export function countMatches(selected: string[], recipe: string[]): number {
  const remaining = [...recipe]
  let matches = 0
  for (const id of selected) {
    const index = remaining.indexOf(id)
    if (index !== -1) {
      remaining.splice(index, 1)
      matches++
    }
  }
  return matches
}

export const recipeKey = (ids: string[]) => [...ids].sort().join(',')
