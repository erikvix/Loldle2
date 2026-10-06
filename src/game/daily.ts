import type { Champion } from '../types/champion'

// Escolhe o mesmo campeão para todos os jogadores no mesmo dia.
export function getDailyChampion(list: Champion[], date = new Date()): Champion {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  let hash = 0
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return list[hash % list.length]
}
