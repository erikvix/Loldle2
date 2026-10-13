import { CheckIcon, EraserIcon, HammerIcon, PlusIcon, RefreshCwIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { itemIconUrl, items } from '@/data/items'
import { countMatches, FORGE_ATTEMPTS, pickForgeRound, recipeKey } from '@/game/forge'
import { cn } from '@/lib/utils'

interface Attempt {
  ids: string[]
  matches: number
}

export function ForgeGame() {
  const [round, setRound] = useState(() => pickForgeRound())
  const [selected, setSelected] = useState<string[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [score, setScore] = useState({ won: 0, played: 0 })

  const target = items[round.itemId]
  const slots = round.recipe.length
  const won = attempts.some((a) => a.matches === slots)
  const lost = !won && attempts.length >= FORGE_ATTEMPTS
  const finished = won || lost
  const full = selected.length === slots

  function add(id: string) {
    if (finished || full) return
    setSelected((prev) => [...prev, id])
    setMessage(null)
  }

  function removeAt(index: number) {
    setSelected((prev) => prev.filter((_, i) => i !== index))
    setMessage(null)
  }

  function forge() {
    if (!full || finished) return
    if (attempts.some((a) => recipeKey(a.ids) === recipeKey(selected))) {
      setMessage('Você já tentou essa receita.')
      return
    }
    const matches = countMatches(selected, round.recipe)
    const nextAttempts = [{ ids: selected, matches }, ...attempts]
    setAttempts(nextAttempts)
    setSelected([])
    if (matches === slots || nextAttempts.length >= FORGE_ATTEMPTS) {
      setScore((s) => ({ won: s.won + (matches === slots ? 1 : 0), played: s.played + 1 }))
    }
  }

  function nextRound() {
    setRound((previous) => pickForgeRound(previous.itemId))
    setSelected([])
    setAttempts([])
    setMessage(null)
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
          <div className="flex flex-col items-center gap-2 text-center">
            <img src={itemIconUrl(target.id)} alt="" className="size-20 rounded-lg border-2 border-amber-500" />
            <p className="text-xl font-bold">{target.name}</p>
            <p className="text-sm text-muted-foreground">
              {target.gold.toLocaleString('pt-BR')} de ouro · {slots} componentes
            </p>
          </div>

          {!finished && (
            <>
              <div className="flex justify-center gap-3" aria-label="Receita">
                {Array.from({ length: slots }, (_, i) => selected[i]).map((id, i) =>
                  id ? (
                    <button
                      key={i}
                      type="button"
                      onClick={() => removeAt(i)}
                      aria-label={`Remover ${items[id].name}`}
                      title={`Remover ${items[id].name}`}
                      className="size-14 overflow-hidden rounded-lg border border-amber-500 transition-opacity hover:opacity-70"
                    >
                      <img src={itemIconUrl(id)} alt="" className="size-full" />
                    </button>
                  ) : (
                    <div
                      key={i}
                      className="flex size-14 items-center justify-center rounded-lg border border-dashed border-amber-500/50 text-amber-500/70"
                    >
                      <PlusIcon className="size-5" />
                    </div>
                  ),
                )}
              </div>

              <div className="grid w-full grid-cols-3 gap-2">
                {round.options.map((id) => {
                  const count = selected.filter((s) => s === id).length
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => add(id)}
                      disabled={full}
                      className={cn(
                        'relative flex flex-col items-center gap-1 rounded-lg border p-2 text-center text-xs transition-colors',
                        'enabled:hover:bg-muted disabled:opacity-50',
                        count > 0 && 'border-amber-500',
                      )}
                    >
                      <img src={itemIconUrl(id)} alt="" className="size-10 rounded" />
                      <span className="leading-tight">{items[id].name}</span>
                      {count > 0 && (
                        <Badge className="absolute top-1 right-1 h-5 px-1.5 text-[10px]">×{count}</Badge>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelected([])} disabled={selected.length === 0}>
                  <EraserIcon data-icon="inline-start" />
                  Limpar
                </Button>
                <Button onClick={forge} disabled={!full}>
                  <HammerIcon data-icon="inline-start" />
                  Forjar
                </Button>
              </div>
              {message && <p className="text-sm text-amber-400">{message}</p>}
            </>
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
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">Receita:</p>
              <RecipeIcons ids={round.recipe} />
              <p className="text-sm text-muted-foreground">{round.recipe.map((id) => items[id].name).join(' + ')}</p>
            </div>
            <Button size="lg" onClick={nextRound} autoFocus>
              <RefreshCwIcon data-icon="inline-start" />
              Próximo item
            </Button>
          </CardContent>
        </Card>
      )}

      {attempts.length > 0 && (
        <ul className="flex w-full flex-col gap-2">
          {attempts.map((attempt) => {
            const correct = attempt.matches === slots
            return (
              <li
                key={recipeKey(attempt.ids)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-2 text-white animate-in fade-in slide-in-from-top-2',
                  correct ? 'border-emerald-500 bg-emerald-600' : 'border-red-500 bg-red-700',
                )}
              >
                <RecipeIcons ids={attempt.ids} small />
                <span className="text-sm font-semibold">
                  {correct ? 'Receita certa!' : `${attempt.matches} de ${slots} componentes certos`}
                </span>
                {correct ? <CheckIcon className="ml-auto" /> : <XIcon className="ml-auto" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function RecipeIcons({ ids, small }: { ids: string[]; small?: boolean }) {
  return (
    <div className="flex gap-1.5">
      {ids.map((id, i) => (
        <img
          key={`${id}-${i}`}
          src={itemIconUrl(id)}
          alt={items[id].name}
          title={items[id].name}
          className={cn('rounded border', small ? 'size-9' : 'size-12')}
        />
      ))}
    </div>
  )
}
