import { RefreshCwIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ForgeAttempts, ForgePicker, ForgeTarget, RecipeReveal, type ForgeAttempt } from '@/components/ForgeBoard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { items } from '@/data/items'
import { countMatches, FORGE_ATTEMPTS, pickForgeRound, recipeKey } from '@/game/forge'
import { cn } from '@/lib/utils'

export function ForgeGame() {
  const [round, setRound] = useState(() => pickForgeRound())
  const [attempts, setAttempts] = useState<ForgeAttempt[]>([])
  const [score, setScore] = useState({ won: 0, played: 0 })

  const target = items[round.itemId]
  const slots = round.recipe.length
  const won = attempts.some((a) => a.matches === slots)
  const lost = !won && attempts.length >= FORGE_ATTEMPTS
  const finished = won || lost
  const triedKeys = useMemo(() => new Set(attempts.map((a) => recipeKey(a.ids))), [attempts])

  function forge(ids: string[]) {
    const matches = countMatches(ids, round.recipe)
    const nextAttempts = [{ ids, matches }, ...attempts]
    setAttempts(nextAttempts)
    if (matches === slots || nextAttempts.length >= FORGE_ATTEMPTS) {
      setScore((s) => ({ won: s.won + (matches === slots ? 1 : 0), played: s.played + 1 }))
    }
  }

  function nextRound() {
    setRound((previous) => pickForgeRound(previous.itemId))
    setAttempts([])
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle>Monte a receita deste item</CardTitle>
          <CardDescription>
            Escolha os componentes diretos, inclusive repetidos. A ordem não importa. Você tem {FORGE_ATTEMPTS}{' '}
            tentativas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-5">
          <ForgeTarget itemId={round.itemId} slots={slots} />
          {!finished && (
            <ForgePicker key={round.itemId} slots={slots} options={round.options} triedKeys={triedKeys} onForge={forge} />
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">
              Tentativas: {attempts.length}/{FORGE_ATTEMPTS}
            </Badge>
            <Badge variant="secondary">
              Itens forjados: {score.won}/{score.played}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {finished && (
        <Card className={cn('w-full', won ? 'border-emerald-500' : 'border-red-500')}>
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <p className="text-xl font-bold">
              {won ? `${target.name} forjado com perfeição!` : 'Acabaram as tentativas.'}
            </p>
            <RecipeReveal recipe={round.recipe} />
            <Button size="lg" onClick={nextRound} autoFocus>
              <RefreshCwIcon data-icon="inline-start" />
              Próximo item
            </Button>
          </CardContent>
        </Card>
      )}

      <ForgeAttempts attempts={attempts} slots={slots} />
    </div>
  )
}
