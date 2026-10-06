import { useMemo, useState } from 'react'
import { GuessInput } from './components/GuessInput'
import { GuessTable } from './components/GuessTable'
import { champions } from './data/champions'
import { compareChampions } from './game/compare'
import { getDailyChampion } from './game/daily'
import type { Champion, GuessResult } from './types/champion'

function App() {
  const target = useMemo(() => getDailyChampion(champions), [])
  const [guesses, setGuesses] = useState<GuessResult[]>([])

  const won = guesses.some((g) => g.isCorrect)
  const guessedIds = new Set(guesses.map((g) => g.champion.id))
  const remaining = champions.filter((c) => !guessedIds.has(c.id))

  function handleGuess(champion: Champion) {
    setGuesses((prev) => [compareChampions(champion, target), ...prev])
  }

  return (
    <main className="app">
      <h1>Loldle2</h1>
      <p className="subtitle">Adivinhe o campeão de League of Legends de hoje</p>

      <GuessInput options={remaining} disabled={won} onGuess={handleGuess} />

      {won && (
        <p className="victory">
          Você acertou! Era <strong>{target.name}</strong> em {guesses.length}{' '}
          {guesses.length === 1 ? 'tentativa' : 'tentativas'}.
        </p>
      )}

      <GuessTable guesses={guesses} />

      <footer className="legend">
        <span className="cell correct">Correto</span>
        <span className="cell partial">Parcial</span>
        <span className="cell wrong">Errado</span>
      </footer>
    </main>
  )
}

export default App
