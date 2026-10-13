import { LockIcon, LockOpenIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BonusQuestion } from '@/components/BonusQuestion'
import { GuessForm } from '@/components/GuessForm'
import { GuessList } from '@/components/GuessList'
import { RoundResult } from '@/components/RoundResult'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { abilityIconUrl, abilityKeyLabels, championDetails } from '@/data/championDetails'
import { championsById, type Champion } from '@/data/quotes'
import { pickAbilityRound } from '@/game/details'
import { cn } from '@/lib/utils'

// Chutes errados para liberar cada dica: primeiro a cor do ícone, depois a posição original.
const COLOR_HINT_AFTER = 3
const ROTATION_HINT_AFTER = 6

export function AbilityGame() {
  const [round, setRound] = useState(() => pickAbilityRound())
  const [guesses, setGuesses] = useState<Champion[]>([])
  const [roundsWon, setRoundsWon] = useState(0)

  const answer = championsById.get(round.championId)!
  const won = guesses[0]?.id === answer.id
  const wrongGuesses = guesses.length - (won ? 1 : 0)
  const showColor = won || wrongGuesses >= COLOR_HINT_AFTER
  const showUpright = won || wrongGuesses >= ROTATION_HINT_AFTER
  const guessedIds = useMemo(() => new Set(guesses.map((g) => g.id)), [guesses])

  const keyOptions = championDetails[round.championId].abilities.map((ability) => ({
    id: ability.key,
    label: abilityKeyLabels[ability.key],
  }))

  function handleGuess(champion: Champion) {
    setGuesses((prev) => [champion, ...prev])
    if (champion.id === answer.id) setRoundsWon((n) => n + 1)
  }

  function nextRound() {
    setRound((previous) => pickAbilityRound(previous.championId))
    setGuesses([])
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle>De qual campeão é esta habilidade?</CardTitle>
          <CardDescription>Pode ser a passiva ou Q, W, E, R. Chutes ilimitados.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <img
            key={round.ability.image}
            src={abilityIconUrl(round.ability)}
            alt="Ícone da habilidade a adivinhar"
            draggable={false}
            className={cn(
              'size-32 rounded-xl border-2 transition-[filter,transform] duration-700 select-none',
              !showColor && 'grayscale',
            )}
            style={{ transform: `rotate(${showUpright ? 0 : round.rotation}deg)` }}
            onError={() => !won && nextRound()}
          />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">Tentativas: {guesses.length}</Badge>
            <Badge variant="secondary">Acertos: {roundsWon}</Badge>
          </div>
          {!won && (
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
              <HintStatus label="Cor" unlocked={showColor} remaining={COLOR_HINT_AFTER - wrongGuesses} />
              {round.rotation !== 0 && (
                <HintStatus label="Posição original" unlocked={showUpright} remaining={ROTATION_HINT_AFTER - wrongGuesses} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {won ? (
        <RoundResult champion={answer} attempts={guesses.length} nextLabel="Próxima habilidade" onNext={nextRound}>
          <BonusQuestion
            key={round.ability.image}
            question={`qual é a tecla de "${round.ability.name}"?`}
            options={keyOptions}
            correctId={round.ability.key}
          />
        </RoundResult>
      ) : (
        <GuessForm guessedIds={guessedIds} onGuess={handleGuess} />
      )}

      <GuessList guesses={guesses} answerId={answer.id} />
    </div>
  )
}

function HintStatus({ label, unlocked, remaining }: { label: string; unlocked: boolean; remaining: number }) {
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      {unlocked ? <LockOpenIcon className="size-3.5 text-amber-500" /> : <LockIcon className="size-3.5" />}
      {unlocked ? `${label} liberada` : `${label} em ${remaining} ${remaining === 1 ? 'chute' : 'chutes'}`}
    </span>
  )
}
