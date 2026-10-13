import { ImageIcon, ZoomOutIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BonusQuestion } from '@/components/BonusQuestion'
import { GuessForm } from '@/components/GuessForm'
import { GuessList } from '@/components/GuessList'
import { RoundResult } from '@/components/RoundResult'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { championDetails, splashUrl } from '@/data/championDetails'
import { championsById, type Champion } from '@/data/quotes'
import { pickOptions, pickSplashRound } from '@/game/details'

// Zoom da arte a cada chute errado: começa bem de perto e vai mostrando mais da imagem.
const ZOOM_LEVELS = [6, 4.5, 3.5, 2.7, 2.1, 1.6, 1.25, 1]

export function SplashGame() {
  const [round, setRound] = useState(() => pickSplashRound())
  const [guesses, setGuesses] = useState<Champion[]>([])
  const [roundsWon, setRoundsWon] = useState(0)

  const answer = championsById.get(round.championId)!
  const won = guesses[0]?.id === answer.id
  const wrongGuesses = guesses.length - (won ? 1 : 0)
  const zoom = won ? 1 : ZOOM_LEVELS[Math.min(wrongGuesses, ZOOM_LEVELS.length - 1)]
  const guessedIds = useMemo(() => new Set(guesses.map((g) => g.id)), [guesses])

  const skinOptions = useMemo(() => {
    const skins = championDetails[round.championId].skins
    return pickOptions(round.skin, skins).map((skin) => ({ id: String(skin.num), label: skin.name }))
  }, [round])

  function handleGuess(champion: Champion) {
    setGuesses((prev) => [champion, ...prev])
    if (champion.id === answer.id) setRoundsWon((n) => n + 1)
  }

  function nextRound() {
    setRound((previous) => pickSplashRound(previous.championId))
    setGuesses([])
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle>De qual campeão é esta splash art?</CardTitle>
          <CardDescription>A imagem se afasta a cada chute errado. Chutes ilimitados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-[1215/717] w-full overflow-hidden rounded-lg bg-muted">
            <img
              key={`${round.championId}_${round.skin.num}`}
              src={splashUrl(round.championId, round.skin)}
              alt="Splash art a adivinhar"
              draggable={false}
              className="size-full object-cover transition-transform duration-700 ease-out select-none"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: `${round.focus.x}% ${round.focus.y}%`,
              }}
              // Se a imagem não carregar, sorteia outra rodada em vez de travar o jogo.
              onError={() => !won && nextRound()}
            />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">Tentativas: {guesses.length}</Badge>
            <Badge variant="secondary">Acertos: {roundsWon}</Badge>
            {!won && (
              <Badge variant="outline">
                <ZoomOutIcon />
                Zoom {zoom.toLocaleString('pt-BR')}x
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {won ? (
        <RoundResult champion={answer} attempts={guesses.length} nextLabel="Próxima splash" onNext={nextRound}>
          {skinOptions.length > 1 ? (
            <BonusQuestion
              key={`${round.championId}_${round.skin.num}`}
              question="qual é a skin?"
              options={skinOptions}
              correctId={String(round.skin.num)}
            />
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="size-4" />
              Skin: {round.skin.name}
            </p>
          )}
        </RoundResult>
      ) : (
        <GuessForm guessedIds={guessedIds} onGuess={handleGuess} />
      )}

      <GuessList guesses={guesses} answerId={answer.id} />
    </div>
  )
}
