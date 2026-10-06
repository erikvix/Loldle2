export type Gender = 'Masculino' | 'Feminino' | 'Outro'

export type Position = 'Topo' | 'Selva' | 'Meio' | 'Atirador' | 'Suporte'

export type RangeType = 'Corpo a corpo' | 'Distância'

export interface Champion {
  id: string
  name: string
  gender: Gender
  positions: Position[]
  species: string[]
  resource: string
  rangeType: RangeType[]
  regions: string[]
  releaseYear: number
}

export type MatchStatus = 'correct' | 'partial' | 'wrong'

export type YearHint = 'higher' | 'lower' | null

export interface AttributeResult {
  label: string
  value: string
  status: MatchStatus
}

export interface GuessResult {
  champion: Champion
  attributes: AttributeResult[]
  yearHint: YearHint
  isCorrect: boolean
}
