import { CheckIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Option {
  id: string
  label: string
}

interface Props {
  question: string
  options: Option[]
  correctId: string
}

// Pergunta bônus depois do acerto (ex.: qual é a skin, qual é a tecla). Vale só uma tentativa.
export function BonusQuestion({ question, options, correctId }: Props) {
  const [chosen, setChosen] = useState<string | null>(null)
  const answered = chosen !== null

  return (
    <div className="flex w-full flex-col items-center gap-3 rounded-lg border p-4">
      <p className="font-medium">Bônus: {question}</p>
      <div className="flex w-full flex-wrap justify-center gap-2">
        {options.map((option) => {
          const isCorrect = option.id === correctId
          return (
            <Button
              key={option.id}
              variant="outline"
              disabled={answered && !isCorrect && option.id !== chosen}
              onClick={() => setChosen(option.id)}
              className={cn(
                answered && isCorrect && 'border-emerald-500 bg-emerald-600 text-white disabled:opacity-100',
                answered && option.id === chosen && !isCorrect && 'border-red-500 bg-red-700 text-white',
                answered && 'pointer-events-none',
              )}
            >
              {answered && isCorrect && <CheckIcon data-icon="inline-start" />}
              {answered && option.id === chosen && !isCorrect && <XIcon data-icon="inline-start" />}
              {option.label}
            </Button>
          )
        })}
      </div>
      {answered && (
        <p className={cn('text-sm', chosen === correctId ? 'text-emerald-400' : 'text-muted-foreground')}>
          {chosen === correctId ? 'Acertou o bônus!' : 'Não foi dessa vez.'}
        </p>
      )}
    </div>
  )
}
