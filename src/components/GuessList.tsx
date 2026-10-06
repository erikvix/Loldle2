import { CheckIcon, XIcon } from 'lucide-react'
import { ChampionIcon } from '@/components/ChampionIcon'
import type { Champion } from '@/data/quotes'
import { cn } from '@/lib/utils'

interface Props {
  guesses: Champion[]
  answerId: string
}

export function GuessList({ guesses, answerId }: Props) {
  if (guesses.length === 0) return null

  return (
    <ul className="flex w-full flex-col gap-2">
      {guesses.map((champion) => {
        const correct = champion.id === answerId
        return (
          <li
            key={champion.id}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-2 text-white animate-in fade-in slide-in-from-top-2',
              correct ? 'border-emerald-500 bg-emerald-600' : 'border-red-500 bg-red-700',
            )}
          >
            <ChampionIcon champion={champion} />
            <span className="font-semibold">{champion.name}</span>
            {correct ? <CheckIcon className="ml-auto" /> : <XIcon className="ml-auto" />}
          </li>
        )
      })}
    </ul>
  )
}
