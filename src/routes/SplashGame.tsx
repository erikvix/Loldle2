import { ImageIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BonusQuestion } from '@/components/BonusQuestion'
import { GuessForm } from '@/components/GuessForm'
import { GuessList } from '@/components/GuessList'
import { RoundResult } from '@/components/RoundResult'
import { SplashImage, ZoomBadge } from '@/components/SplashImage'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { championDetails, splashUrl } from '@/data/championDetails'
import { championsById, type Champion } from '@/data/quotes'
import { pickOptions, pickSplashRound, splashZoom } from '@/game/details'

export function SplashGame() {
  const [round, setRound] = useState(() => pickSplashRound())
  const [guesses, setGuesses] = useState<Champion[]>([])
  const [roundsWon, setRoundsWon] = useState(0)

  const answer = championsById.get(round.championId)!
  const won = guesses[0]?.id === answer.id
  const wrongGuesses = guesses.length - (won ? 1 : 0)
  const zoom = splashZoom(wrongGuesses, won)
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
          <SplashImage
            url={splashUrl(round.championId, round.skin)}
            focus={round.focus}
            zoom={zoom}
            // Se a imagem não carregar, sorteia outra rodada em vez de travar o jogo.
            onError={() => !won && nextRound()}
          />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">Tentativas: {guesses.length}</Badge>
            <Badge variant="secondary">Acertos: {roundsWon}</Badge>
            {!won && <ZoomBadge zoom={zoom} />}
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
