import { abilityIconUrl, abilityKeyLabels, championDetails, splashUrl } from '@/data/championDetails'
import { items, recipeItemIds } from '@/data/items'
import { abilityRoundFor, splashRoundFor } from '@/game/details'
import { forgeRoundFor, recipeKey } from '@/game/forge'
import { championIdsWithQuotes, randomQuoteFor } from '@/game/quotes'
import type { Challenge, GameMode } from './protocol'

// Rodada como o host a guarda: o desafio enviado aos jogadores e a resposta, que fica só com ele.
export interface HostRound {
  challenge: Challenge
  // Id do campeão ou, na Forja, a receita (recipeKey).
  answer: string
  // Receita completa (com repetições), só na Forja.
  recipe?: string[]
  answerDetail: string | null
}

type Kind = Challenge['kind']
const KINDS: Kind[] = ['quote', 'splash', 'ability', 'forge']

const randomItem = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

function roundFor(kind: Kind, id: string): HostRound {
  if (kind === 'quote') {
    const { championId: _answer, ...quote } = randomQuoteFor(id)
    return { answer: id, challenge: { kind, quote }, answerDetail: null }
  }
  if (kind === 'splash') {
    const { skin, focus } = splashRoundFor(id)
    return {
      answer: id,
      challenge: { kind, imageUrl: splashUrl(id, skin), focus },
      answerDetail: `Skin: ${skin.name}`,
    }
  }
  if (kind === 'ability') {
    const { ability, rotation } = abilityRoundFor(id)
    return {
      answer: id,
      challenge: { kind, imageUrl: abilityIconUrl(ability), rotation },
      answerDetail: `${abilityKeyLabels[ability.key]}: ${ability.name}`,
    }
  }
  const { recipe, options } = forgeRoundFor(id)
  return {
    answer: recipeKey(recipe),
    recipe,
    challenge: { kind, itemId: id, slots: recipe.length, options },
    answerDetail: recipe.map((component) => items[component].name).join(' + '),
  }
}

// Ids de onde sai a resposta de cada tipo de rodada: campeões ou, na Forja, itens.
function poolFor(kind: Kind): string[] {
  if (kind === 'quote') return championIdsWithQuotes
  if (kind === 'forge') return recipeItemIds
  return Object.keys(championDetails)
}

// Sorteia as rodadas de uma partida, sem repetir campeão nem item.
export function pickRounds(mode: GameMode, count: number): HostRound[] {
  const used = new Set<string>()
  const rounds: HostRound[] = []
  for (let i = 0; i < count; i++) {
    const kind = mode === 'mixed' ? randomItem(KINDS) : mode
    const pool = poolFor(kind).filter((id) => !used.has(id))
    if (pool.length === 0) break
    const id = randomItem(pool)
    used.add(id)
    rounds.push(roundFor(kind, id))
  }
  return rounds
}
