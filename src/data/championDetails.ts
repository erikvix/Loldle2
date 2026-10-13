import data from './champion-details.json'

export interface Skin {
  num: number
  name: string
}

export type AbilityKey = 'P' | 'Q' | 'W' | 'E' | 'R'

export interface Ability {
  key: AbilityKey
  name: string
  // Caminho relativo a /cdn/<versão>/img/ no Data Dragon (ex.: "spell/AhriQ.png").
  image: string
}

interface ChampionDetails {
  skins: Skin[]
  abilities: Ability[]
}

const DDRAGON = 'https://ddragon.leagueoflegends.com'

export const championDetails = data.champions as Record<string, ChampionDetails>

export const abilityKeyLabels: Record<AbilityKey, string> = {
  P: 'Passiva',
  Q: 'Q',
  W: 'W',
  E: 'E',
  R: 'R',
}

export function splashUrl(championId: string, skin: Skin): string {
  return `${DDRAGON}/cdn/img/champion/splash/${championId}_${skin.num}.jpg`
}

export function abilityIconUrl(ability: Ability): string {
  return `${DDRAGON}/cdn/${data.ddragonVersion}/img/${ability.image}`
}
