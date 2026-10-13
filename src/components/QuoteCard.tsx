import { BadgeCheckIcon, LanguagesIcon, QuoteIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PublicQuote } from '@/data/quotes'

interface Props {
  quote: PublicQuote
  description: string
  children?: ReactNode
}

export function QuoteCard(props: Props) {
  // A key reinicia o "ver original" a cada fala nova.
  return <QuoteCardContent key={props.quote.text} {...props} />
}

function QuoteCardContent({ quote, description, children }: Props) {
  const [showOriginal, setShowOriginal] = useState(false)

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle>Qual campeão disse isto?</CardTitle>
        <CardDescription>{description}</CardDescription>
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
        {children}
      </CardContent>
    </Card>
  )
}
