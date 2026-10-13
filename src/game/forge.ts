import { items, recipeItemIds } from '@/data/items'

export const FORGE_ATTEMPTS = 3
const DECOYS = 3

// Itens que aparecem como componente em alguma receita: as alternativas falsas saem daqui,
// para parecerem plausíveis.
const componentIds = [...new Set(recipeItemIds.flatMap((id) => items[id].from ?? []))]

const randomItem = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)]
const shuffle = <T,>(list: T[]): T[] => [...list].sort(() => Math.random() - 0.5)

export interface ForgeRound {
  itemId: string
  recipe: string[]
  // Componentes da receita (sem repetição) misturados com alternativas falsas.
  options: string[]
}

export function pickForgeRound(previousId?: string): ForgeRound {
  const itemId = randomItem(recipeItemIds.filter((id) => id !== previousId))
  const recipe = items[itemId].from!
  const decoys = shuffle(componentIds.filter((id) => id !== itemId && !recipe.includes(id))).slice(0, DECOYS)
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
