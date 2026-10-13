// Lembra o nome usado na última partida, só neste navegador.
const KEY = 'loldle2:player-name'

export function loadPlayerName(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function savePlayerName(name: string) {
  try {
    localStorage.setItem(KEY, name)
  } catch {
    // Sem localStorage (ex.: janela anônima com bloqueio): só não lembra o nome.
  }
}
