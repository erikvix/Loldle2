import Peer, { type DataConnection, type PeerError, type PeerOptions } from 'peerjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HEARTBEAT_MS,
  HEARTBEAT_TIMEOUT_MS,
  hostPeerId,
  MAX_PLAYERS,
  MIN_PLAYERS,
  REVEAL_TIME_MS,
  ROUND_TIME_MS,
  ROUNDS,
  type GameMode,
  type GuestMessage,
  type HostMessage,
  type RoomState,
} from './protocol'
import { countMatches, FORGE_ATTEMPTS } from '@/game/forge'
import { clearConnectionLog, logConnection } from './connectionLog'
import { pickRounds, type HostRound } from './rounds'

export type Role = 'host' | 'guest'

export interface MyGuess {
  // Id do campeão ou, na Forja, a receita tentada (recipeKey).
  answer: string
  correct: boolean
  // Na Forja: quantos componentes estavam certos.
  matches?: number
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
  guess: (answer: string) => void
  restart: () => void
  // Só o host escolhe o modo, no lobby.
  setMode: (mode: GameMode) => void
}

interface Actions {
  start: () => void
  guess: (answer: string) => void
  restart: () => void
  setMode: (mode: GameMode) => void
}

const noop = () => {}

// Por padrão usa o servidor de sinalização gratuito do PeerJS (0.peerjs.com). Para usar outro
// (ex.: um servidor local em testes), defina VITE_PEER_HOST, VITE_PEER_PORT e VITE_PEER_PATH.
const env = import.meta.env
const peerOptions: PeerOptions = {
  ...(env.VITE_PEER_HOST
    ? {
        host: env.VITE_PEER_HOST,
        port: Number(env.VITE_PEER_PORT ?? 443),
        path: env.VITE_PEER_PATH ?? '/',
        secure: env.VITE_PEER_SECURE !== 'false',
      }
    : {}),
  // Avisos e erros internos do PeerJS vão para o log de conexão (nível 2 = avisos e erros).
  debug: 2,
  logFunction: (level, ...parts) =>
    logConnection(level === 1 ? 'error' : 'warn', `PeerJS: ${parts.map((p) => (p instanceof Error ? p.message : String(p))).join(' ')}`),
}

const signalingServer = env.VITE_PEER_HOST ? `${env.VITE_PEER_HOST}:${env.VITE_PEER_PORT ?? 443}` : '0.peerjs.com'

// Mostra só o fim dos ids do PeerJS, que são longos e aleatórios.
const shortId = (id: string) => id.slice(-6)

// Acompanha uma conexão WebRTC no log: estados do ICE e, quando abre, por qual caminho os
// dados estão passando (host = mesma rede, srflx = direto pela internet via STUN, relay = TURN).
function watchConnection(connection: DataConnection, label: string) {
  connection.on('iceStateChanged', (state) => {
    logConnection(state === 'failed' || state === 'disconnected' ? 'warn' : 'info', `${label}: ICE ${state}`)
  })
  connection.on('open', async () => {
    try {
      const stats = await connection.peerConnection.getStats()
      let pairId: string | undefined
      stats.forEach((report) => {
        if (report.type === 'transport' && report.selectedCandidatePairId) pairId = report.selectedCandidatePairId
      })
      const pair = pairId ? stats.get(pairId) : undefined
      const local = pair && stats.get(pair.localCandidateId)
      const remote = pair && stats.get(pair.remoteCandidateId)
      if (local && remote) {
        logConnection(
          'info',
          `${label}: rota ${local.candidateType} → ${remote.candidateType} (${local.protocol ?? '?'}${
            local.candidateType === 'relay' || remote.candidateType === 'relay' ? ', via servidor TURN' : ''
          })`,
        )
      }
    } catch {
      // Estatísticas indisponíveis neste navegador: o log só não mostra a rota.
    }
  })
}

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
  const actions = useRef<Actions>({ start: noop, guess: noop, restart: noop, setMode: noop })

  useEffect(() => {
    let disposed = false
    let failed = false
    // Vale a primeira mensagem de erro (ex.: "sala cheia" não vira "conexão encerrada" logo depois).
    const fail = (message: string) => {
      if (disposed || failed) return
      logConnection('error', `Falha: ${message}`)
      failed = true
      setStatus('error')
      setError(message)
    }
    const receiveState = (next: RoomState) => {
      if (disposed) return
      setState(next)
      setDeadline(next.round?.status === 'playing' ? Date.now() + next.round.remainingMs : null)
    }
    const recordMyGuess = (round: number, answer: string, correct: boolean, matches?: number) => {
      if (disposed) return
      setMyGuesses((prev) => ({
        round,
        guesses: [{ answer, correct, matches }, ...(prev.round === round ? prev.guesses : [])],
      }))
    }

    clearConnectionLog()
    logConnection('info', `Entrando na sala ${code} como ${role === 'host' ? 'host' : 'convidado'}`)
    // Eventos do navegador que costumam derrubar a conexão (ex.: celular trocando de rede ou
    // indo para segundo plano).
    const onOnline = () => logConnection('info', 'Navegador voltou a ficar online')
    const onOffline = () => logConnection('warn', 'Navegador ficou offline')
    const onVisibility = () =>
      logConnection('info', document.hidden ? 'Página foi para segundo plano' : 'Página voltou para primeiro plano')
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisibility)

    const cleanup = role === 'host' ? runHost() : runGuest()
    return () => {
      disposed = true
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisibility)
      cleanup()
    }

    // O host guarda o estado oficial da sala, sorteia as falas, valida os chutes e soma os pontos.
    function runHost() {
      const connections = new Map<string, DataConnection>()
      const lastSeen = new Map<string, number>()
      let peer: Peer | null = null
      let room: RoomState | null = null
      let rounds: HostRound[] = []
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
        update((current) => ({
          ...current,
          phase: 'playing',
          players: current.players.map((player) => ({ ...player, guessCount: 0 })),
          round: {
            index,
            total: rounds.length,
            challenge: rounds[index].challenge,
            status: 'playing',
            winnerId: null,
            answerId: null,
            answerDetail: null,
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
          round: {
            ...round,
            status: 'revealed',
            winnerId,
            answerId: rounds[round.index].answer,
            answerDetail: rounds[round.index].answerDetail,
          },
        }))
        timer = setTimeout(() => {
          if (round.index + 1 < rounds.length) startRound(round.index + 1)
          else update((current) => ({ ...current, phase: 'finished' }))
        }, REVEAL_TIME_MS)
      }

      const handleGuess = (
        playerId: string,
        roundIndex: number,
        answer: string,
        reply: (correct: boolean, matches?: number) => void,
      ) => {
        const round = room?.round
        if (!room || room.phase !== 'playing' || !round || round.status !== 'playing' || round.index !== roundIndex) {
          return
        }
        const playerGuesses = guessed.get(playerId) ?? new Set<string>()
        if (playerGuesses.has(answer)) return

        const { challenge } = round
        const hostRound = rounds[round.index]
        let matches: number | undefined
        if (challenge.kind === 'forge') {
          // Na Forja cada jogador tem um número limitado de tentativas, e a receita precisa
          // ter o tamanho certo e usar só as alternativas mostradas.
          const ids = answer.split(',')
          if (playerGuesses.size >= FORGE_ATTEMPTS) return
          if (ids.length !== challenge.slots || ids.some((id) => !challenge.options.includes(id))) return
          matches = countMatches(ids, hostRound.recipe!)
        }
        playerGuesses.add(answer)
        guessed.set(playerId, playerGuesses)

        const correct = answer === hostRound.answer
        reply(correct, matches)
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
          // Na Forja, se todos os jogadores conectados gastaram as tentativas, a rodada acaba sem ponto.
          const everyoneOut = room.players
            .filter((p) => p.connected)
            .every((p) => (guessed.get(p.id)?.size ?? 0) >= FORGE_ATTEMPTS)
          if (challenge.kind === 'forge' && everyoneOut) reveal(null)
        }
      }

      const handleConnection = (connection: DataConnection) => {
        const label = `Jogador ${shortId(connection.peer)}`
        logConnection('info', `${label}: pedido de conexão recebido`)
        watchConnection(connection, label)
        connection.on('open', () => logConnection('info', `${label}: canal de dados aberto`))
        connection.on('error', (err) => logConnection('error', `${label}: erro na conexão (${err.type ?? err.message})`))
        connection.on('data', (raw) => {
          const message = raw as GuestMessage
          lastSeen.set(connection.peer, Date.now())
          if (!room || message.type === 'ping') return
          if (message.type === 'join') {
            const reject = (text: string) => {
              logConnection('warn', `${label}: entrada recusada (${text})`)
              connection.send({ type: 'error', message: text } satisfies HostMessage)
              setTimeout(() => connection.close(), 500)
            }
            if (room.phase !== 'lobby') return reject('A partida já começou. Espere ela terminar para entrar.')
            if (room.players.length >= MAX_PLAYERS) return reject(`A sala está cheia (máximo de ${MAX_PLAYERS}).`)
            connections.set(connection.peer, connection)
            logConnection('info', `${label}: entrou na sala`)
            update((current) => ({
              ...current,
              players: [
                ...current.players.filter((p) => p.id !== connection.peer),
                { id: connection.peer, name: cleanPlayerName(message.name), score: 0, guessCount: 0, connected: true },
              ],
            }))
          } else if (message.type === 'guess' && connections.get(connection.peer) === connection) {
            handleGuess(connection.peer, message.round, message.answer, (correct, matches) =>
              connection.send({
                type: 'guessResult',
                round: message.round,
                answer: message.answer,
                correct,
                matches,
              } satisfies HostMessage),
            )
          }
        })
        connection.on('close', () => {
          logConnection('warn', `${label}: conexão fechada`)
          removeConnection(connection)
        })
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
          if (now - (lastSeen.get(connection.peer) ?? now) > HEARTBEAT_TIMEOUT_MS) {
            logConnection('warn', `Jogador ${shortId(connection.peer)}: sem sinal de vida há ${HEARTBEAT_TIMEOUT_MS / 1000}s, removido`)
            removeConnection(connection)
          } else if (connection.open) connection.send({ type: 'ping' } satisfies HostMessage)
        }
      }, HEARTBEAT_MS)

      // Em desenvolvimento (StrictMode) ou ao recarregar a página, o id da sala pode demorar
      // alguns segundos para ser liberado no servidor do PeerJS; por isso as novas tentativas.
      const open = (attempt: number) => {
        logConnection('info', `Criando a sala ${code} no servidor de sinalização ${signalingServer} (tentativa ${attempt})`)
        const current = new Peer(hostPeerId(code), peerOptions)
        peer = current
        current.on('open', (id) => {
          if (disposed) return
          logConnection('info', room ? 'Reconectado ao servidor de sinalização' : `Sala ${code} aberta, esperando jogadores`)
          reconnects = 0
          // Depois de uma reconexão, a sala continua a mesma.
          if (room) return
          room = {
            phase: 'lobby',
            mode: 'quote',
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
          if (disposed || current.destroyed) return
          logConnection('warn', 'Conexão com o servidor de sinalização caiu (quem já está na sala continua conectado)')
          if (!room || reconnects >= 5) return
          reconnects++
          logConnection('info', `Reconectando ao servidor de sinalização em ${2 * reconnects}s (tentativa ${reconnects}/5)`)
          retryTimer = setTimeout(() => current.reconnect(), 2000 * reconnects)
        })
        current.on('error', (err) => {
          logConnection('error', `Erro do PeerJS: ${err.type} (${err.message})`)
          if (err.type === 'unavailable-id' && attempt < 5 && !disposed) {
            logConnection('info', 'Código da sala ainda ocupado no servidor; tentando de novo em 2s')
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
          rounds = pickRounds(room.mode, ROUNDS)
          update((current) => ({ ...current, players: current.players.map((p) => ({ ...p, score: 0 })) }))
          startRound(0)
        },
        guess: (answer) => {
          const round = room?.round
          if (!room || !round) return
          handleGuess(room.hostId, round.index, answer, (correct, matches) =>
            recordMyGuess(round.index, answer, correct, matches),
          )
        },
        setMode: (mode) => {
          if (room?.phase === 'lobby') update((current) => ({ ...current, mode }))
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
      logConnection('info', `Conectando ao servidor de sinalização ${signalingServer}`)
      const peer = new Peer(peerOptions)
      let connection: DataConnection | null = null
      let latest: RoomState | null = null
      let connectTimer: ReturnType<typeof setTimeout> | undefined
      let heartbeat: ReturnType<typeof setInterval> | undefined
      let lastHostMessage = Date.now()

      peer.on('open', (id) => {
        if (disposed) return
        setMyId(id)
        logConnection('info', `Servidor de sinalização ok (meu id: ${shortId(id)}); procurando a sala ${code}`)
        const current = peer.connect(hostPeerId(code), { reliable: true })
        connection = current
        watchConnection(current, 'Host')
        connectTimer = setTimeout(
          () =>
            fail(
              'Não foi possível conectar à sala em 15s. A rede pode estar bloqueando a conexão direta; veja o log de conexão.',
            ),
          15_000,
        )
        current.on('error', (err) => logConnection('error', `Host: erro na conexão (${err.type ?? err.message})`))
        current.on('open', () => {
          clearTimeout(connectTimer)
          logConnection('info', 'Host: canal de dados aberto, entrando na sala')
          current.send({ type: 'join', name: cleanPlayerName(name) } satisfies GuestMessage)
          lastHostMessage = Date.now()
          heartbeat = setInterval(() => {
            if (Date.now() - lastHostMessage > HEARTBEAT_TIMEOUT_MS) {
              clearInterval(heartbeat)
              logConnection('warn', `Host: sem sinal de vida há ${HEARTBEAT_TIMEOUT_MS / 1000}s`)
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
            recordMyGuess(message.round, message.answer, message.correct, message.matches)
          } else if (message.type === 'error') {
            fail(message.message)
          }
        })
        current.on('close', () => fail('A conexão com o host foi encerrada. Ele pode ter saído da sala.'))
      })
      peer.on('error', (err) => {
        logConnection('error', `Erro do PeerJS: ${err.type} (${err.message})`)
        fail(describePeerError(err))
      })
      peer.on('disconnected', () => logConnection('warn', 'Conexão com o servidor de sinalização caiu'))

      actions.current = {
        start: noop,
        restart: noop,
        setMode: noop,
        guess: (answer) => {
          const round = latest?.round
          if (!connection?.open || !round || round.status !== 'playing') return
          connection.send({ type: 'guess', round: round.index, answer } satisfies GuestMessage)
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
  const guess = useCallback((answer: string) => actions.current.guess(answer), [])
  const restart = useCallback(() => actions.current.restart(), [])
  const setMode = useCallback((mode: GameMode) => actions.current.setMode(mode), [])

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
    setMode,
  }
}
