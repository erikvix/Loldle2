import Peer, { type DataConnection, type PeerError, type PeerOptions } from 'peerjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Quote } from '@/data/quotes'
import { pickRoundQuotes } from '@/game/quotes'
import {
  HEARTBEAT_MS,
  HEARTBEAT_TIMEOUT_MS,
  hostPeerId,
  MAX_PLAYERS,
  MIN_PLAYERS,
  REVEAL_TIME_MS,
  ROUND_TIME_MS,
  ROUNDS,
  type GuestMessage,
  type HostMessage,
  type RoomState,
} from './protocol'

export type Role = 'host' | 'guest'

export interface MyGuess {
  championId: string
  correct: boolean
}

export interface Room {
  status: 'connecting' | 'ready' | 'error'
  error: string | null
  myId: string | null
  state: RoomState | null
  // Momento (no relógio deste aparelho) em que a rodada atual termina.
  deadline: number | null
  // Chutes deste jogador na rodada atual, do mais recente para o mais antigo.
  myGuesses: MyGuess[]
  start: () => void
  guess: (championId: string) => void
  restart: () => void
}

interface Actions {
  start: () => void
  guess: (championId: string) => void
  restart: () => void
}

const noop = () => {}

// Por padrão usa o servidor de sinalização gratuito do PeerJS (0.peerjs.com). Para usar outro
// (ex.: um servidor local em testes), defina VITE_PEER_HOST, VITE_PEER_PORT e VITE_PEER_PATH.
const env = import.meta.env
const peerOptions: PeerOptions = env.VITE_PEER_HOST
  ? {
      host: env.VITE_PEER_HOST,
      port: Number(env.VITE_PEER_PORT ?? 443),
      path: env.VITE_PEER_PATH ?? '/',
      secure: env.VITE_PEER_SECURE !== 'false',
    }
  : {}

export function cleanPlayerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 16) || 'Jogador'
}

function describePeerError(error: PeerError<string>): string {
  switch (error.type) {
    case 'peer-unavailable':
      return 'Sala não encontrada. Confira o código ou peça um link novo ao host.'
    case 'unavailable-id':
      return 'Este código de sala já está em uso. Crie outra sala.'
    case 'browser-incompatible':
      return 'Seu navegador não suporta o modo multiplayer.'
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed':
      return 'Não foi possível falar com o servidor de conexão. Verifique sua internet e tente de novo.'
    default:
      return `Erro de conexão (${error.type}).`
  }
}

export function useRoom(role: Role, code: string, name: string): Room {
  const [status, setStatus] = useState<Room['status']>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [state, setState] = useState<RoomState | null>(null)
  const [deadline, setDeadline] = useState<number | null>(null)
  const [myGuesses, setMyGuesses] = useState<{ round: number; guesses: MyGuess[] }>({ round: -1, guesses: [] })
  const actions = useRef<Actions>({ start: noop, guess: noop, restart: noop })

  useEffect(() => {
    let disposed = false
    let failed = false
    // Vale a primeira mensagem de erro (ex.: "sala cheia" não vira "conexão encerrada" logo depois).
    const fail = (message: string) => {
      if (disposed || failed) return
      failed = true
      setStatus('error')
      setError(message)
    }
    const receiveState = (next: RoomState) => {
      if (disposed) return
      setState(next)
      setDeadline(next.round?.status === 'playing' ? Date.now() + next.round.remainingMs : null)
    }
    const recordMyGuess = (round: number, championId: string, correct: boolean) => {
      if (disposed) return
      setMyGuesses((prev) => ({
        round,
        guesses: [{ championId, correct }, ...(prev.round === round ? prev.guesses : [])],
      }))
    }

    const cleanup = role === 'host' ? runHost() : runGuest()
    return () => {
      disposed = true
      cleanup()
    }

    // O host guarda o estado oficial da sala, sorteia as falas, valida os chutes e soma os pontos.
    function runHost() {
      const connections = new Map<string, DataConnection>()
      const lastSeen = new Map<string, number>()
      let peer: Peer | null = null
      let room: RoomState | null = null
      let quotes: Quote[] = []
      let guessed = new Map<string, Set<string>>()
      let roundEndsAt = 0
      let timer: ReturnType<typeof setTimeout> | undefined
      let retryTimer: ReturnType<typeof setTimeout> | undefined
      let reconnects = 0

      const snapshot = (current: RoomState): RoomState => ({
        ...current,
        round: current.round && {
          ...current.round,
          remainingMs: current.round.status === 'playing' ? Math.max(0, roundEndsAt - Date.now()) : 0,
        },
      })

      const update = (change: (current: RoomState) => RoomState) => {
        if (!room) return
        room = change(room)
        const message: HostMessage = { type: 'state', state: snapshot(room) }
        receiveState(message.state)
        for (const connection of connections.values()) if (connection.open) connection.send(message)
      }

      const startRound = (index: number) => {
        clearTimeout(timer)
        guessed = new Map()
        roundEndsAt = Date.now() + ROUND_TIME_MS
        const { championId: _answer, ...quote } = quotes[index]
        update((current) => ({
          ...current,
          phase: 'playing',
          players: current.players.map((player) => ({ ...player, guessCount: 0 })),
          round: {
            index,
            total: quotes.length,
            quote,
            status: 'playing',
            winnerId: null,
            answerId: null,
            remainingMs: ROUND_TIME_MS,
          },
        }))
        timer = setTimeout(() => reveal(null), ROUND_TIME_MS)
      }

      // Fecha a rodada: com vencedor (quem acertou primeiro) ou por tempo esgotado.
      const reveal = (winnerId: string | null) => {
        const round = room?.round
        if (!round || round.status !== 'playing') return
        clearTimeout(timer)
        update((current) => ({
          ...current,
          players: current.players.map((player) =>
            player.id === winnerId ? { ...player, score: player.score + 1 } : player,
          ),
          round: { ...round, status: 'revealed', winnerId, answerId: quotes[round.index].championId },
        }))
        timer = setTimeout(() => {
          if (round.index + 1 < quotes.length) startRound(round.index + 1)
          else update((current) => ({ ...current, phase: 'finished' }))
        }, REVEAL_TIME_MS)
      }

      const handleGuess = (
        playerId: string,
        roundIndex: number,
        championId: string,
        reply: (correct: boolean) => void,
      ) => {
        const round = room?.round
        if (!room || room.phase !== 'playing' || !round || round.status !== 'playing' || round.index !== roundIndex) {
          return
        }
        const playerGuesses = guessed.get(playerId) ?? new Set<string>()
        if (playerGuesses.has(championId)) return
        playerGuesses.add(championId)
        guessed.set(playerId, playerGuesses)

        const correct = championId === quotes[round.index].championId
        reply(correct)
        // Chutes chegam um de cada vez ao host, então o primeiro acerto que chega leva o ponto.
        if (correct) {
          room = {
            ...room,
            players: room.players.map((p) => (p.id === playerId ? { ...p, guessCount: p.guessCount + 1 } : p)),
          }
          reveal(playerId)
        } else {
          update((current) => ({
            ...current,
            players: current.players.map((p) => (p.id === playerId ? { ...p, guessCount: p.guessCount + 1 } : p)),
          }))
        }
      }

      const handleConnection = (connection: DataConnection) => {
        connection.on('data', (raw) => {
          const message = raw as GuestMessage
          lastSeen.set(connection.peer, Date.now())
          if (!room || message.type === 'ping') return
          if (message.type === 'join') {
            const reject = (text: string) => {
              connection.send({ type: 'error', message: text } satisfies HostMessage)
              setTimeout(() => connection.close(), 500)
            }
            if (room.phase !== 'lobby') return reject('A partida já começou. Espere ela terminar para entrar.')
            if (room.players.length >= MAX_PLAYERS) return reject(`A sala está cheia (máximo de ${MAX_PLAYERS}).`)
            connections.set(connection.peer, connection)
            update((current) => ({
              ...current,
              players: [
                ...current.players.filter((p) => p.id !== connection.peer),
                { id: connection.peer, name: cleanPlayerName(message.name), score: 0, guessCount: 0, connected: true },
              ],
            }))
          } else if (message.type === 'guess' && connections.get(connection.peer) === connection) {
            handleGuess(connection.peer, message.round, message.championId, (correct) =>
              connection.send({
                type: 'guessResult',
                round: message.round,
                championId: message.championId,
                correct,
              } satisfies HostMessage),
            )
          }
        })
        connection.on('close', () => removeConnection(connection))
      }

      // No lobby, quem sai some da lista; durante a partida, fica marcado como "saiu" com seus pontos.
      const removeConnection = (connection: DataConnection) => {
        if (connections.get(connection.peer) !== connection) return
        connections.delete(connection.peer)
        lastSeen.delete(connection.peer)
        update((current) =>
          current.phase === 'lobby'
            ? { ...current, players: current.players.filter((p) => p.id !== connection.peer) }
            : {
                ...current,
                players: current.players.map((p) => (p.id === connection.peer ? { ...p, connected: false } : p)),
              },
        )
        connection.close()
      }

      // Sinal de vida para os convidados e remoção de quem parou de responder.
      const heartbeat = setInterval(() => {
        const now = Date.now()
        for (const connection of [...connections.values()]) {
          if (now - (lastSeen.get(connection.peer) ?? now) > HEARTBEAT_TIMEOUT_MS) removeConnection(connection)
          else if (connection.open) connection.send({ type: 'ping' } satisfies HostMessage)
        }
      }, HEARTBEAT_MS)

      // Em desenvolvimento (StrictMode) ou ao recarregar a página, o id da sala pode demorar
      // alguns segundos para ser liberado no servidor do PeerJS; por isso as novas tentativas.
      const open = (attempt: number) => {
        const current = new Peer(hostPeerId(code), peerOptions)
        peer = current
        current.on('open', (id) => {
          if (disposed) return
          reconnects = 0
          // Depois de uma reconexão, a sala continua a mesma.
          if (room) return
          room = {
            phase: 'lobby',
            hostId: id,
            players: [{ id, name: cleanPlayerName(name), score: 0, guessCount: 0, connected: true }],
            round: null,
          }
          setMyId(id)
          setStatus('ready')
          update((r) => r)
        })
        current.on('connection', handleConnection)
        // Se a sala já estava aberta e a conexão com o servidor de sinalização cair, as conexões
        // com os jogadores continuam; reconecta só para novos jogadores conseguirem entrar.
        // Antes de abrir, quem trata a falha é o evento 'error'.
        current.on('disconnected', () => {
          if (disposed || current.destroyed || !room || reconnects >= 5) return
          reconnects++
          retryTimer = setTimeout(() => current.reconnect(), 2000 * reconnects)
        })
        current.on('error', (err) => {
          if (err.type === 'unavailable-id' && attempt < 5 && !disposed) {
            current.destroy()
            retryTimer = setTimeout(() => open(attempt + 1), 2000)
            return
          }
          // Erro de uma conexão individual não derruba a sala.
          if (err.type === 'peer-unavailable' && room) return
          fail(describePeerError(err))
        })
      }
      open(1)

      actions.current = {
        start: () => {
          if (!room || room.phase !== 'lobby') return
          if (room.players.filter((p) => p.connected).length < MIN_PLAYERS) return
          quotes = pickRoundQuotes(ROUNDS)
          update((current) => ({ ...current, players: current.players.map((p) => ({ ...p, score: 0 })) }))
          startRound(0)
        },
        guess: (championId) => {
          const round = room?.round
          if (!room || !round) return
          handleGuess(room.hostId, round.index, championId, (correct) =>
            recordMyGuess(round.index, championId, correct),
          )
        },
        restart: () => {
          clearTimeout(timer)
          update((current) => ({
            ...current,
            phase: 'lobby',
            round: null,
            players: current.players
              .filter((p) => p.connected)
              .map((p) => ({ ...p, score: 0, guessCount: 0 })),
          }))
        },
      }

      return () => {
        clearInterval(heartbeat)
        clearTimeout(timer)
        clearTimeout(retryTimer)
        for (const connection of connections.values()) connection.close()
        peer?.destroy()
      }
    }

    function runGuest() {
      const peer = new Peer(peerOptions)
      let connection: DataConnection | null = null
      let latest: RoomState | null = null
      let connectTimer: ReturnType<typeof setTimeout> | undefined
      let heartbeat: ReturnType<typeof setInterval> | undefined
      let lastHostMessage = Date.now()

      peer.on('open', (id) => {
        if (disposed) return
        setMyId(id)
        const current = peer.connect(hostPeerId(code), { reliable: true })
        connection = current
        connectTimer = setTimeout(() => fail('Não foi possível conectar à sala. Tente de novo.'), 15_000)
        current.on('open', () => {
          clearTimeout(connectTimer)
          current.send({ type: 'join', name: cleanPlayerName(name) } satisfies GuestMessage)
          lastHostMessage = Date.now()
          heartbeat = setInterval(() => {
            if (Date.now() - lastHostMessage > HEARTBEAT_TIMEOUT_MS) {
              clearInterval(heartbeat)
              fail('A conexão com o host foi encerrada. Ele pode ter saído da sala.')
            } else if (current.open) {
              current.send({ type: 'ping' } satisfies GuestMessage)
            }
          }, HEARTBEAT_MS)
        })
        current.on('data', (raw) => {
          const message = raw as HostMessage
          lastHostMessage = Date.now()
          if (message.type === 'state') {
            latest = message.state
            setStatus('ready')
            receiveState(message.state)
          } else if (message.type === 'guessResult') {
            recordMyGuess(message.round, message.championId, message.correct)
          } else if (message.type === 'error') {
            fail(message.message)
          }
        })
        current.on('close', () => fail('A conexão com o host foi encerrada. Ele pode ter saído da sala.'))
      })
      peer.on('error', (err) => fail(describePeerError(err)))

      actions.current = {
        start: noop,
        restart: noop,
        guess: (championId) => {
          const round = latest?.round
          if (!connection?.open || !round || round.status !== 'playing') return
          connection.send({ type: 'guess', round: round.index, championId } satisfies GuestMessage)
        },
      }

      return () => {
        clearInterval(heartbeat)
        clearTimeout(connectTimer)
        connection?.close()
        peer.destroy()
      }
    }
  }, [role, code, name])

  const start = useCallback(() => actions.current.start(), [])
  const guess = useCallback((championId: string) => actions.current.guess(championId), [])
  const restart = useCallback(() => actions.current.restart(), [])

  const roundIndex = state?.round?.index ?? -1
  return {
    status,
    error,
    myId,
    state,
    deadline,
    myGuesses: myGuesses.round === roundIndex ? myGuesses.guesses : [],
    start,
    guess,
    restart,
  }
}
