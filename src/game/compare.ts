import type {
  AttributeResult,
  Champion,
  GuessResult,
  MatchStatus,
} from '../types/champion'

function compareLists(guess: string[], target: string[]): MatchStatus {
  const same =
    guess.length === target.length && guess.every((v) => target.includes(v))
  if (same) return 'correct'
  return guess.some((v) => target.includes(v)) ? 'partial' : 'wrong'
}

function compareValue(guess: string, target: string): MatchStatus {
  return guess === target ? 'correct' : 'wrong'
}

export function compareChampions(guess: Champion, target: Champion): GuessResult {
  const attributes: AttributeResult[] = [
    { label: 'Gênero', value: guess.gender, status: compareValue(guess.gender, target.gender) },
    { label: 'Posição', value: guess.positions.join(', '), status: compareLists(guess.positions, target.positions) },
    { label: 'Espécie', value: guess.species.join(', '), status: compareLists(guess.species, target.species) },
    { label: 'Recurso', value: guess.resource, status: compareValue(guess.resource, target.resource) },
    { label: 'Alcance', value: guess.rangeType.join(', '), status: compareLists(guess.rangeType, target.rangeType) },
    { label: 'Região', value: guess.regions.join(', '), status: compareLists(guess.regions, target.regions) },
    {
      label: 'Lançamento',
      value: String(guess.releaseYear),
      status: guess.releaseYear === target.releaseYear ? 'correct' : 'wrong',
    },
  ]

  const yearHint =
    guess.releaseYear === target.releaseYear
      ? null
      : guess.releaseYear < target.releaseYear
        ? 'higher'
        : 'lower'

  return { champion: guess, attributes, yearHint, isCorrect: guess.id === target.id }
}
