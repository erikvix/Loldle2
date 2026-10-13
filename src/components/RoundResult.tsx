import { RefreshCwIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { ChampionIcon } from '@/components/ChampionIcon'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Champion } from '@/data/quotes'

interface Props {
  champion: Champion
  attempts: number
  nextLabel: string
  onNext: () => void
  children?: ReactNode
}

// Cartão de acerto dos modos solo: campeão, número de tentativas, extras do modo e "próxima".
export function RoundResult({ champion, attempts, nextLabel, onNext, children }: Props) {
  return (
    <Card className="w-full border-emerald-500">
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <ChampionIcon champion={champion} className="size-20" />
        <div>
          <p className="text-xl font-bold">Você acertou! É {champion.name}</p>
          <p className="text-muted-foreground capitalize">{champion.title}</p>
          <p className="text-sm text-muted-foreground">
            {attempts} {attempts === 1 ? 'tentativa' : 'tentativas'}
          </p>
        </div>
        {children}
        <Button size="lg" onClick={onNext} autoFocus>
          <RefreshCwIcon data-icon="inline-start" />
          {nextLabel}
        </Button>
      </CardContent>
    </Card>
  )
}
