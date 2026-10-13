import type { PublicQuote } from '@/data/quotes'

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 4
export const ROUNDS = 10
// Tempo máximo de cada rodada; se ninguém acertar, a resposta é revelada sem pontos.
export const ROUND_TIME_MS = 90_000
// Pausa mostrando a resposta antes da próxima rodada.
export const REVEAL_TIME_MS = 6_000

// Cada lado manda um sinal de vida a cada HEARTBEAT_MS; sem sinal por HEARTBEAT_TIMEOUT_MS,
// considera que o outro saiu (o WebRTC nem sempre avisa quando uma aba é fechada).
export const HEARTBEAT_MS = 2_000
export const HEARTBEAT_TIMEOUT_MS = 8_000

// Prefixo dos ids no servidor do PeerJS, para não colidir com outros apps.
const PEER_PREFIX = 'loldle2-room-'
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem 0/O e 1/I
export const CODE_LENGTH = 5

export function createRoomCode(): string {
  const values = crypto.getRandomValues(new Uint32Array(CODE_LENGTH))
  return Array.from(values, (v) => CODE_ALPHABET[v % CODE_ALPHABET.length]).join('')
}

export function normalizeRoomCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH)
}

export const hostPeerId = (code: string) => `${PEER_PREFIX}${code}`

export interface PlayerState {
  id: string
  name: string
  score: number
  // Chutes na rodada atual (só a quantidade, para não entregar pistas aos outros).
  guessCount: number
  connected: boolean
}

export type GameMode = 'quote' | 'splash' | 'ability' | 'mixed'

export const GAME_MODES: { id: GameMode; label: string; description: string }[] = [
  { id: 'quote', label: 'Falas', description: 'Qual campeão disse esta fala?' },
  { id: 'splash', label: 'Splash', description: 'De quem é esta splash art? O zoom diminui a cada erro.' },
  { id: 'ability', label: 'Habilidade', description: 'De quem é esta habilidade? Cor e posição voltam com os erros.' },
  { id: 'mixed', label: 'Misto', description: 'Cada rodada sorteia um dos três modos.' },
]

// O que os jogadores veem na rodada. Nunca inclui o campeão da resposta diretamente.
export type Challenge =
  | { kind: 'quote'; quote: PublicQuote }
  | { kind: 'splash'; imageUrl: string; focus: { x: number; y: number } }
  | { kind: 'ability'; imageUrl: string; rotation: number }

export interface RoundState {
  index: number
  total: number
  challenge: Challenge
  status: 'playing' | 'revealed'
  winnerId: string | null
  // Só são preenchidos quando a rodada é revelada.
  answerId: string | null
  // Informação extra da resposta (ex.: nome da skin ou da habilidade).
  answerDetail: string | null
  // Tempo restante no momento do envio (o relógio de cada aparelho pode estar diferente).
  remainingMs: number
}

export interface RoomState {
  phase: 'lobby' | 'playing' | 'finished'
  mode: GameMode
  hostId: string
  players: PlayerState[]
  round: RoundState | null
}

// Convidado -> host
export type GuestMessage =
  | { type: 'join'; name: string }
  | { type: 'guess'; round: number; championId: string }
  | { type: 'ping' }

// Host -> convidado
export type HostMessage =
  | { type: 'state'; state: RoomState }
  | { type: 'guessResult'; round: number; championId: string; correct: boolean }
  | { type: 'error'; message: string }
  | { type: 'ping' }
