import { BadgeCheckIcon, LanguagesIcon, QuoteIcon, RefreshCwIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ChampionIcon } from '@/components/ChampionIcon'
import { GuessForm } from '@/components/GuessForm'
import { GuessList } from '@/components/GuessList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { championsById, type Champion } from '@/data/quotes'
import { pickRandomQuote } from '@/game/quotes'

export function QuoteGame() {
  const [quote, setQuote] = useState(() => pickRandomQuote())
  const [guesses, setGuesses] = useState<Champion[]>([])
  const [roundsWon, setRoundsWon] = useState(0)
  const [showOriginal, setShowOriginal] = useState(false)

  const answer = championsById.get(quote.championId)!
  const won = guesses[0]?.id === answer.id
  const guessedIds = useMemo(() => new Set(guesses.map((g) => g.id)), [guesses])

  function handleGuess(champion: Champion) {
    setGuesses((prev) => [champion, ...prev])
    if (champion.id === answer.id) setRoundsWon((n) => n + 1)
  }

  function nextQuote() {
    setQuote((previous) => pickRandomQuote(previous))
    setGuesses([])
    setShowOriginal(false)
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle>Qual campeão disse isto?</CardTitle>
          <CardDescription>Chutes ilimitados. Acerte e passe para a próxima fala.</CardDescription>
        </CardHeader>
        <CardContent>
          <blockquote className="flex gap-3 rounded-lg bg-muted p-4 text-lg italic">
            <QuoteIcon className="size-5 shrink-0 text-amber-500" />
            <p>“{showOriginal && quote.original ? quote.original : quote.text}”</p>
          </blockquote>
          {quote.source === 'universe' && (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <BadgeCheckIcon className="size-3.5 text-amber-500" />
              <span>Fala oficial do Riot Universe</span>
            </div>
          )}
          {quote.original && (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <LanguagesIcon className="size-3.5" />
              <span>Tradução automática</span>
              <Button variant="link" size="xs" onClick={() => setShowOriginal((v) => !v)}>
                {showOriginal ? 'Ver tradução' : 'Ver original em inglês'}
              </Button>
            </div>
          )}
          <div className="mt-4 flex justify-center gap-2">
            <Badge variant="secondary">Tentativas: {guesses.length}</Badge>
            <Badge variant="secondary">Acertos: {roundsWon}</Badge>
          </div>
        </CardContent>
      </Card>

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
