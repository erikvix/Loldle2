import type { GuessResult } from '../types/champion'

const HEADERS = ['Campeão', 'Gênero', 'Posição', 'Espécie', 'Recurso', 'Alcance', 'Região', 'Lançamento']

interface Props {
  guesses: GuessResult[]
}

export function GuessTable({ guesses }: Props) {
  if (guesses.length === 0) return null

  return (
    <div className="guess-table">
      <div className="row header">
        {HEADERS.map((h) => (
          <div key={h} className="cell">
            {h}
          </div>
        ))}
      </div>
      {guesses.map((g) => (
        <div key={g.champion.id} className="row">
          <div className={`cell ${g.isCorrect ? 'correct' : 'wrong'}`}>{g.champion.name}</div>
          {g.attributes.map((a) => (
            <div key={a.label} className={`cell ${a.status}`}>
              {a.value}
              {a.label === 'Lançamento' && g.yearHint === 'higher' && ' ↑'}
              {a.label === 'Lançamento' && g.yearHint === 'lower' && ' ↓'}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
