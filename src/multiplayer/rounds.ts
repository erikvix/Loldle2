import { abilityIconUrl, abilityKeyLabels, championDetails, splashUrl } from '@/data/championDetails'
import { abilityRoundFor, splashRoundFor } from '@/game/details'
import { championIdsWithQuotes, randomQuoteFor } from '@/game/quotes'
import type { Challenge, GameMode } from './protocol'

// Rodada como o host a guarda: o desafio enviado aos jogadores e a resposta, que fica só com ele.
export interface HostRound {
  championId: string
  challenge: Challenge
  answerDetail: string | null
}

type Kind = Challenge['kind']
const KINDS: Kind[] = ['quote', 'splash', 'ability']

const randomItem = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

function roundFor(kind: Kind, championId: string): HostRound {
  if (kind === 'quote') {
    const { championId: _answer, ...quote } = randomQuoteFor(championId)
    return { championId, challenge: { kind, quote }, answerDetail: null }
  }
  if (kind === 'splash') {
    const { skin, focus } = splashRoundFor(championId)
    return {
      championId,
      challenge: { kind, imageUrl: splashUrl(championId, skin), focus },
      answerDetail: `Skin: ${skin.name}`,
    }
  }
  const { ability, rotation } = abilityRoundFor(championId)
  return {
    championId,
    challenge: { kind, imageUrl: abilityIconUrl(ability), rotation },
    answerDetail: `${abilityKeyLabels[ability.key]}: ${ability.name}`,
  }
}

// Sorteia as rodadas de uma partida, sem repetir campeão.
export function pickRounds(mode: GameMode, count: number): HostRound[] {
  const used = new Set<string>()
  const rounds: HostRound[] = []
  for (let i = 0; i < count; i++) {
    const kind = mode === 'mixed' ? randomItem(KINDS) : mode
    // Falas só existem para parte dos campeões; skins e habilidades, para todos.
    const pool = (kind === 'quote' ? championIdsWithQuotes : Object.keys(championDetails)).filter(
      (id) => !used.has(id),
    )
    if (pool.length === 0) break
    const championId = randomItem(pool)
    used.add(championId)
    rounds.push(roundFor(kind, championId))
  }
  return rounds
}
