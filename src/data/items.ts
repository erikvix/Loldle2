import data from './items.json'

export interface Item {
  id: string
  name: string
  gold: number
  // Componentes diretos da receita (com repetição).
  from?: string[]
}

export const items: Record<string, Item> = Object.fromEntries(
  Object.entries(data.items as Record<string, Omit<Item, 'id'>>).map(([id, item]) => [id, { id, ...item }]),
)

// Itens que podem ser o alvo de uma rodada da Forja.
export const recipeItemIds: string[] = data.recipes

export function itemIconUrl(itemId: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${data.ddragonVersion}/img/item/${itemId}.png`
}
