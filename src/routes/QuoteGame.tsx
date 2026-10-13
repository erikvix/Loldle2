import { useMemo, useState } from 'react'
import { AudioHint } from '@/components/AudioHint'
import { GuessForm } from '@/components/GuessForm'
import { GuessList } from '@/components/GuessList'
import { QuoteCard } from '@/components/QuoteCard'
import { RoundResult } from '@/components/RoundResult'
import { Badge } from '@/components/ui/badge'
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
        <RoundResult champion={answer} attempts={guesses.length} nextLabel="Próxima fala" onNext={nextQuote}>
          <AudioHint quote={quote} wrongGuesses={wrongGuesses} revealed />
        </RoundResult>
      ) : (
        <GuessForm guessedIds={guessedIds} onGuess={handleGuess} />
      )}

      <GuessList guesses={guesses} answerId={answer.id} />
    </div>
  )
}
