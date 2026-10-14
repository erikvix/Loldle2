import { zodResolver } from '@hookform/resolvers/zod'
import { LogInIcon, PlusIcon, UsersIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { loadPlayerName, savePlayerName } from '@/multiplayer/playerName'
import {
  CODE_LENGTH,
  createRoomCode,
  MAX_PLAYERS,
  MIN_PLAYERS,
  normalizeRoomCode,
  ROUNDS,
} from '@/multiplayer/protocol'

const schema = z.object({
  name: z.string().trim().min(1, 'Digite seu nome.').max(16, 'Use no máximo 16 caracteres.'),
  code: z.string(),
})

type FormValues = z.infer<typeof schema>

export function MultiplayerHome() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: loadPlayerName(), code: '' },
  })

  const createRoom = handleSubmit(({ name }) => {
    savePlayerName(name)
    navigate(`/multi/${createRoomCode()}`, { state: { role: 'host', name } })
  })

  const joinRoom = handleSubmit(({ name, code }) => {
    const roomCode = normalizeRoomCode(code)
    if (roomCode.length !== CODE_LENGTH) {
      setError('code', { message: `O código tem ${CODE_LENGTH} caracteres.` })
      return
    }
    savePlayerName(name)
    navigate(`/multi/${roomCode}`, { state: { role: 'guest', name } })
  })

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <UsersIcon className="size-5 text-amber-500" />
            Multiplayer
          </CardTitle>
          <CardDescription>
            De {MIN_PLAYERS} a {MAX_PLAYERS} jogadores, {ROUNDS} rodadas de Falas, Splash, Habilidade, Forja de Itens ou tudo misturado.
            Quem acertar primeiro leva o ponto da rodada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createRoom}>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="player-name">Seu nome</FieldLabel>
                <Input id="player-name" autoComplete="nickname" maxLength={16} {...register('name')} />
                <FieldError errors={[errors.name]} />
              </Field>
              <Button type="submit" size="lg">
                <PlusIcon data-icon="inline-start" />
                Criar sala
              </Button>
            </FieldGroup>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou entre numa sala
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={joinRoom}>
            <FieldGroup>
              <Field data-invalid={!!errors.code}>
                <FieldLabel htmlFor="room-code">Código da sala</FieldLabel>
                <Input
                  id="room-code"
                  autoComplete="off"
                  maxLength={CODE_LENGTH}
                  placeholder="Ex.: K7QX2"
                  className="uppercase tracking-widest"
                  {...register('code')}
                />
                <FieldError errors={[errors.code]} />
              </Field>
              <Button type="submit" variant="outline" size="lg">
                <LogInIcon data-icon="inline-start" />
                Entrar
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
