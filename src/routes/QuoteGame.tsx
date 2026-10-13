import { RefreshCwIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AudioHint } from '@/components/AudioHint'
import { ChampionIcon } from '@/components/ChampionIcon'
import { GuessForm } from '@/components/GuessForm'
import { GuessList } from '@/components/GuessList'
import { QuoteCard } from '@/components/QuoteCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { championsById, type Champion } from '@/data/quotes'
import { pickRandomQuote } from '@/game/quotes'

export function QuoteGame() {
  const [quote, setQuote] = useState(() => pickRandomQuote())
  const [guesses, setGuesses] = useState<Champion[]>([])
  const [roundsWon, setRoundsWon] = useState(0)

  const answer = championsById.get(quote.championId)!
  const won = guesses[0]?.id === answer.id
  const guessedIds = useMemo(() => new Set(guesses.map((g) => g.id)), [guesses])
  const wrongGuesses = guesses.length - (won ? 1 : 0)

  function handleGuess(champion: Champion) {
    setGuesses((prev) => [champion, ...prev])
    if (champion.id === answer.id) setRoundsWon((n) => n + 1)
  }

  function nextQuote() {
    setQuote((previous) => pickRandomQuote(previous))
    setGuesses([])
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6">
      <QuoteCard quote={quote} description="Chutes ilimitados. Acerte e passe para a próxima fala.">
        <div className="mt-4 flex justify-center gap-2">
          <Badge variant="secondary">Tentativas: {guesses.length}</Badge>
          <Badge variant="secondary">Acertos: {roundsWon}</Badge>
        </div>
        {!won && (
          <div className="mt-4 flex justify-center">
            <AudioHint quote={quote} wrongGuesses={wrongGuesses} revealed={false} />
          </div>
        )}
      </QuoteCard>

      {won ? (
        <Card className="w-full border-emerald-500">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <ChampionIcon champion={answer} className="size-20" />
            <div>
              <p className="text-xl font-bold">Você acertou! É {answer.name}</p>
              <p className="text-muted-foreground capitalize">{answer.title}</p>
              <p className="text-sm text-muted-foreground">
                {guesses.length} {guesses.length === 1 ? 'tentativa' : 'tentativas'}
              </p>
            </div>
            <AudioHint quote={quote} wrongGuesses={wrongGuesses} revealed />
            <Button size="lg" onClick={nextQuote} autoFocus>
              <RefreshCwIcon data-icon="inline-start" />
              Próxima fala
            </Button>
          </CardContent>
        </Card>
      ) : (
        <GuessForm guessedIds={guessedIds} onGuess={handleGuess} />
      )}

      <GuessList guesses={guesses} answerId={answer.id} />
    </div>
  )
}
