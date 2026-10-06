import { cn } from '@/lib/utils'
import { championIconUrl, type Champion } from '@/data/quotes'

interface Props {
  champion: Champion
  className?: string
}

export function ChampionIcon({ champion, className }: Props) {
  return (
    <img
      src={championIconUrl(champion.id)}
      alt={champion.name}
      loading="lazy"
      className={cn('size-10 rounded-md object-cover', className)}
    />
  )
}
