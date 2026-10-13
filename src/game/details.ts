import { championDetails, type Ability, type Skin } from '@/data/championDetails'

const championIds = Object.keys(championDetails)

const randomItem = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

// Sorteia um campeão diferente do anterior (todos com a mesma chance).
function pickChampion(previousId?: string): string {
  return randomItem(championIds.filter((id) => id !== previousId))
}

export interface SplashRound {
  championId: string
  skin: Skin
  // Ponto da imagem onde o zoom começa, em % (longe das bordas).
  focus: { x: number; y: number }
}

export function pickSplashRound(previousId?: string): SplashRound {
  const championId = pickChampion(previousId)
  return {
    championId,
    skin: randomItem(championDetails[championId].skins),
    focus: { x: 20 + Math.random() * 60, y: 20 + Math.random() * 60 },
  }
}

export interface AbilityRound {
  championId: string
  ability: Ability
  rotation: 0 | 90 | 180 | 270
}

export function pickAbilityRound(previousId?: string): AbilityRound {
  const championId = pickChampion(previousId)
  return {
    championId,
    ability: randomItem(championDetails[championId].abilities),
    rotation: randomItem([0, 90, 180, 270] as const),
  }
}

// Alternativas de uma pergunta bônus: a correta e até `count - 1` outras, embaralhadas.
export function pickOptions<T>(correct: T, others: T[], count = 4): T[] {
  const pool = others.filter((item) => item !== correct)
  const picked = [correct]
  while (picked.length < count && pool.length > 0) {
    picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
  }
  return picked.sort(() => Math.random() - 0.5)
}
