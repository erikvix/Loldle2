import { zodResolver } from '@hookform/resolvers/zod'
import {
  CheckIcon,
  CopyIcon,
  CrownIcon,
  LoaderCircleIcon,
  LogOutIcon,
  PlayIcon,
  RotateCcwIcon,
  TimerIcon,
  TrophyIcon,
  WifiOffIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useParams } from 'react-router'
import { z } from 'zod'
import { AbilityIcon } from '@/components/AbilityIcon'
import { AudioHint } from '@/components/AudioHint'
import { ChampionIcon } from '@/components/ChampionIcon'
import { ForgeAttempts, ForgePicker, ForgeTarget, RecipeReveal } from '@/components/ForgeBoard'
import { GuessForm } from '@/components/GuessForm'
import { GuessList } from '@/components/GuessList'
import { QuoteCard } from '@/components/QuoteCard'
import { SplashImage, ZoomBadge } from '@/components/SplashImage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { championsById, type Champion } from '@/data/quotes'
import { splashZoom } from '@/game/details'
import { FORGE_ATTEMPTS, recipeKey } from '@/game/forge'
import { cn } from '@/lib/utils'
import { loadPlayerName, savePlayerName } from '@/multiplayer/playerName'
import {
  CODE_LENGTH,
  GAME_MODES,
  MAX_PLAYERS,
  MIN_PLAYERS,
  normalizeRoomCode,
  type Challenge,
  type PlayerState,
  type RoomState,
  type RoundState,
} from '@/multiplayer/protocol'
import { useRoom, type Role, type Room } from '@/multiplayer/useRoom'

interface LocationState {
  role?: Role
  name?: string
}

export function MultiplayerRoom() {
  const params = useParams()
  const location = useLocation()
  const entry = (location.state ?? {}) as LocationState
  const code = normalizeRoomCode(params.code ?? '')
  // Quem abre o link de convite chega sem nome: pede o nome antes de entrar.
  const [name, setName] = useState(entry.name ?? '')

  if (code.length !== CODE_LENGTH) {
    return <Message title="Código de sala inválido" text={`O código tem ${CODE_LENGTH} caracteres.`} />
  }
  if (!name) return <NameGate code={code} onSubmit={setName} />
  const role = entry.role ?? 'guest'
  // A key recria a sala do zero se o código, o papel ou o nome mudarem.
  return <RoomView key={`${role}:${code}:${name}`} role={role} code={code} name={name} />
}

function NameGate({ code, onSubmit }: { code: string; onSubmit: (name: string) => void }) {
  const schema = z.object({
    name: z.string().trim().min(1, 'Digite seu nome.').max(16, 'Use no máximo 16 caracteres.'),
  })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: loadPlayerName() } })

  const submit = handleSubmit(({ name }) => {
    savePlayerName(name)
    onSubmit(name)
  })

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Entrar na sala {code}</CardTitle>
        <CardDescription>Como os outros jogadores vão te ver?</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="gate-name">Seu nome</FieldLabel>
              <Input id="gate-name" autoFocus autoComplete="nickname" maxLength={16} {...register('name')} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Button type="submit" size="lg">
              Entrar
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

function RoomView({ role, code, name }: { role: Role; code: string; name: string }) {
  const room = useRoom(role, code, name)

  if (room.status === 'error') return <Message title="Não foi possível jogar" text={room.error ?? ''} />
  if (room.status === 'connecting' || !room.state || !room.myId) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <LoaderCircleIcon className="size-8 animate-spin" />
        {role === 'host' ? 'Criando a sala...' : `Conectando à sala ${code}...`}
      </div>
    )
  }

  const { state, myId } = room
  const isHost = state.hostId === myId
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6">
      {state.phase === 'lobby' && <Lobby room={room} state={state} myId={myId} isHost={isHost} code={code} />}
      {state.phase === 'playing' && <Playing room={room} state={state} myId={myId} />}
      {state.phase === 'finished' && <Finished room={room} state={state} myId={myId} isHost={isHost} />}
    </div>
  )
}

function Lobby({
  room,
  state,
  myId,
  isHost,
  code,
}: {
  room: Room
  state: RoomState
  myId: string
  isHost: boolean
  code: string
}) {
  const connected = state.players.filter((p) => p.connected).length
  const canStart = connected >= MIN_PLAYERS

  return (
    <>
      <Invite code={code} />
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            Jogadores ({state.players.length}/{MAX_PLAYERS})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {Array.from({ length: MAX_PLAYERS }, (_, i) => state.players[i]).map((player, i) =>
            player ? (
              <PlayerRow key={player.id} player={player} myId={myId} hostId={state.hostId} />
            ) : (
              <div key={`empty-${i}`} className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                Esperando jogador...
              </div>
            ),
          )}
        </CardContent>
      </Card>
      <ModePicker room={room} state={state} isHost={isHost} />
      {isHost ? (
        <div className="flex flex-col items-center gap-2">
          <Button size="lg" onClick={room.start} disabled={!canStart}>
            <PlayIcon data-icon="inline-start" />
            Começar partida
          </Button>
          {!canStart && (
            <p className="text-sm text-muted-foreground">Mande o convite: é preciso pelo menos {MIN_PLAYERS} jogadores.</p>
          )}
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircleIcon className="size-4 animate-spin" />
          Esperando o host começar a partida...
        </p>
      )}
    </>
  )
}

function ModePicker({ room, state, isHost }: { room: Room; state: RoomState; isHost: boolean }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Modo de jogo</CardTitle>
        {!isHost && <CardDescription>Escolhido pelo host.</CardDescription>}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Modo de jogo">
        {GAME_MODES.map((mode) => {
          const selected = state.mode === mode.id
          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!isHost}
              onClick={() => room.setMode(mode.id)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                selected ? 'border-amber-500 bg-amber-500/10' : 'enabled:hover:bg-muted',
                !isHost && !selected && 'opacity-50',
              )}
            >
              <span className="font-medium">{mode.label}</span>
              <span className="block text-xs text-muted-foreground">{mode.description}</span>
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}

function Invite({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/multi/${code}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sem permissão de área de transferência: o link continua visível para copiar à mão.
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardDescription>Código da sala</CardDescription>
        <CardTitle className="text-4xl tracking-[0.3em] text-amber-400">{code}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2">
        <Button variant="outline" onClick={copy}>
          {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
          {copied ? 'Link copiado!' : 'Copiar link de convite'}
        </Button>
        <p className="break-all text-center text-xs text-muted-foreground">{link}</p>
      </CardContent>
    </Card>
  )
}

function PlayerRow({
  player,
  myId,
  hostId,
  extra,
  highlight,
}: {
  player: PlayerState
  myId: string
  hostId: string
  extra?: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border p-3',
        highlight && 'border-emerald-500 bg-emerald-600/20',
        !player.connected && 'opacity-50',
      )}
    >
      {player.id === hostId && <CrownIcon className="size-4 text-amber-400" aria-label="Host" />}
      <span className="font-medium">{player.name}</span>
      {player.id === myId && <Badge variant="secondary">você</Badge>}
      {!player.connected && (
        <Badge variant="outline">
          <WifiOffIcon />
          saiu
        </Badge>
      )}
      <span className="ml-auto flex items-center gap-2">{extra}</span>
    </div>
  )
}

function useCountdown(deadline: number | null): number | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (deadline === null) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [deadline])
  return deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000))
}

function Playing({ room, state, myId }: { room: Room; state: RoomState; myId: string }) {
  const round = state.round!
  const secondsLeft = useCountdown(room.deadline)
  const revealed = round.status === 'revealed'
  const isForge = round.challenge.kind === 'forge'
  const answer = !isForge && round.answerId ? championsById.get(round.answerId) : undefined
  const winner = state.players.find((p) => p.id === round.winnerId)

  const myGuesses = useMemo(
    () => room.myGuesses.map((g) => championsById.get(g.answer)).filter((c): c is Champion => !!c),
    [room.myGuesses],
  )
  const guessedIds = useMemo(() => new Set(room.myGuesses.map((g) => g.answer)), [room.myGuesses])
  const myCorrect = room.myGuesses.find((g) => g.correct)?.answer ?? round.answerId ?? ''
  const wrongGuesses = room.myGuesses.filter((g) => !g.correct).length
  const ranking = [...state.players].sort((a, b) => b.score - a.score)

  return (
    <>
      <div className="flex w-full items-center justify-between">
        <Badge variant="secondary" className="text-sm">
          Rodada {round.index + 1}/{round.total} · {KIND_LABELS[round.challenge.kind]}
        </Badge>
        {!revealed && secondsLeft !== null && (
          <Badge variant={secondsLeft <= 10 ? 'destructive' : 'outline'} className="text-sm tabular-nums">
            <TimerIcon />
            {secondsLeft}s
          </Badge>
        )}
      </div>

      <div className="grid w-full grid-cols-2 gap-2">
        {ranking.map((player) => (
          <PlayerRow
            key={player.id}
            player={player}
            myId={myId}
            hostId={state.hostId}
            highlight={revealed && player.id === round.winnerId}
            extra={
              <>
                {!revealed && (
                  <span className="text-xs text-muted-foreground">
                    {isForge ? `${player.guessCount}/${FORGE_ATTEMPTS}` : `${player.guessCount} chutes`}
                  </span>
                )}
                <span className="font-bold tabular-nums">{player.score}</span>
              </>
            }
          />
        ))}
      </div>

      {round.challenge.kind === 'forge' ? (
        <ForgeRoundView room={room} round={round} challenge={round.challenge} revealed={revealed} />
      ) : (
        <ChallengeView round={round} wrongGuesses={wrongGuesses} revealed={revealed} />
      )}

      {revealed ? (
        <Card className={cn('w-full', winner ? 'border-emerald-500' : 'border-amber-500')}>
          <CardContent className="flex flex-col items-center gap-3 text-center">
            {answer && <ChampionIcon champion={answer} className="size-20" />}
            <p className="text-xl font-bold">
              {winner
                ? winner.id === myId
                  ? 'Você acertou primeiro! +1 ponto'
                  : `${winner.name} acertou primeiro!`
                : isForge
                  ? 'Ninguém forjou o item.'
                  : 'Tempo esgotado! Ninguém acertou.'}
            </p>
            {isForge && round.answerId && <RecipeReveal recipe={round.answerId.split(',')} />}
            {answer && (
              <p className="text-muted-foreground">
                Era <strong className="text-foreground">{answer.name}</strong>, <span>{answer.title}</span>
              </p>
            )}
            {!isForge && round.answerDetail && <p className="text-sm text-muted-foreground">{round.answerDetail}</p>}
            {round.challenge.kind === 'quote' && (
              <AudioHint quote={round.challenge.quote} wrongGuesses={wrongGuesses} revealed />
            )}
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" />
              {round.index + 1 < round.total ? 'Próxima rodada em instantes...' : 'Calculando o resultado...'}
            </p>
          </CardContent>
        </Card>
      ) : (
        !isForge && <GuessForm guessedIds={guessedIds} onGuess={(champion) => room.guess(champion.id)} />
      )}

      {!isForge && <GuessList guesses={myGuesses} answerId={myCorrect} />}
    </>
  )
}

const KIND_LABELS: Record<Challenge['kind'], string> = {
  quote: 'Falas',
  splash: 'Splash',
  ability: 'Habilidade',
  forge: 'Forja',
}

type ForgeChallenge = Extract<Challenge, { kind: 'forge' }>

// Rodada da Forja: o item, o seletor de componentes e as tentativas deste jogador.
function ForgeRoundView({
  room,
  round,
  challenge,
  revealed,
}: {
  room: Room
  round: RoundState
  challenge: ForgeChallenge
  revealed: boolean
}) {
  const attempts = room.myGuesses.map((g) => ({ ids: g.answer.split(','), matches: g.matches ?? 0 }))
  const triedKeys = new Set(room.myGuesses.map((g) => g.answer))
  const outOfAttempts = room.myGuesses.length >= FORGE_ATTEMPTS && !room.myGuesses.some((g) => g.correct)

  return (
    <>
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle>Monte a receita deste item</CardTitle>
          <CardDescription>
            Quem forjar primeiro leva o ponto. Você tem {FORGE_ATTEMPTS} tentativas nesta rodada.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-5">
          <ForgeTarget itemId={challenge.itemId} slots={challenge.slots} />
          {!revealed &&
            (outOfAttempts ? (
              <p className="text-center text-sm text-muted-foreground">
                Você usou suas {FORGE_ATTEMPTS} tentativas. Aguarde o fim da rodada.
              </p>
            ) : (
              <ForgePicker
                key={round.index}
                slots={challenge.slots}
                options={challenge.options}
                triedKeys={triedKeys}
                onForge={(ids) => room.guess(recipeKey(ids))}
              />
            ))}
        </CardContent>
      </Card>
      {!revealed && <ForgeAttempts attempts={attempts} slots={challenge.slots} />}
    </>
  )
}

const RACE_HINT = 'Quem acertar primeiro leva o ponto. Chutes ilimitados.'

// Mostra a fala, a splash art ou o ícone da rodada, com as dicas de cada jogador.
function ChallengeView({ round, wrongGuesses, revealed }: { round: RoundState; wrongGuesses: number; revealed: boolean }) {
  const { challenge } = round
  if (challenge.kind === 'forge') return null
  if (challenge.kind === 'quote') {
    return (
      <QuoteCard quote={challenge.quote} description={RACE_HINT}>
        {!revealed && (
          <div className="mt-4 flex justify-center">
            <AudioHint quote={challenge.quote} wrongGuesses={wrongGuesses} revealed={false} />
          </div>
        )}
      </QuoteCard>
    )
  }

  const zoom = splashZoom(wrongGuesses, revealed)
  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle>
          {challenge.kind === 'splash' ? 'De qual campeão é esta splash art?' : 'De qual campeão é esta habilidade?'}
        </CardTitle>
        <CardDescription>{RACE_HINT}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        {challenge.kind === 'splash' ? (
          <>
            <SplashImage url={challenge.imageUrl} focus={challenge.focus} zoom={zoom} />
            {!revealed && <ZoomBadge zoom={zoom} />}
          </>
        ) : (
          <AbilityIcon
            url={challenge.imageUrl}
            rotation={challenge.rotation}
            wrongGuesses={wrongGuesses}
            revealed={revealed}
          />
        )}
      </CardContent>
    </Card>
  )
}

function Finished({
  room,
  state,
  myId,
  isHost,
}: {
  room: Room
  state: RoomState
  myId: string
  isHost: boolean
}) {
  const ranking = [...state.players].sort((a, b) => b.score - a.score)
  const best = ranking[0]?.score ?? 0
  const winners = ranking.filter((p) => p.score === best)
  const title =
    best === 0
      ? 'Ninguém pontuou!'
      : winners.length > 1
        ? `Empate entre ${winners.map((p) => p.name).join(' e ')}!`
        : winners[0].id === myId
          ? 'Você venceu!'
          : `${winners[0].name} venceu!`

  return (
    <>
      <Card className="w-full">
        <CardHeader className="text-center">
          <TrophyIcon className="mx-auto size-10 text-amber-400" />
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>Placar final</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {ranking.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              myId={myId}
              hostId={state.hostId}
              highlight={best > 0 && player.score === best}
              extra={
                <>
                  {/* Empatados dividem a posição (ex.: dois 1º lugares). */}
                  <span className="text-xs text-muted-foreground">
                    {ranking.filter((p) => p.score > player.score).length + 1}º
                  </span>
                  <span className="font-bold tabular-nums">
                    {player.score} {player.score === 1 ? 'ponto' : 'pontos'}
                  </span>
                </>
              }
            />
          ))}
        </CardContent>
      </Card>
      <div className="flex flex-wrap justify-center gap-2">
        {isHost ? (
          <Button size="lg" onClick={room.restart}>
            <RotateCcwIcon data-icon="inline-start" />
            Jogar de novo
          </Button>
        ) : (
          <p className="w-full text-center text-sm text-muted-foreground">Esperando o host decidir se joga de novo...</p>
        )}
        <Button size="lg" variant="outline" asChild>
          <Link to="/multi">
            <LogOutIcon data-icon="inline-start" />
            Sair da sala
          </Link>
        </Button>
      </div>
    </>
  )
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <Card className="mx-auto w-full max-w-md text-center">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{text}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/multi">Voltar</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
