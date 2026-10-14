import { CheckIcon, EraserIcon, HammerIcon, PlusIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { itemIconUrl, items } from '@/data/items'
import { recipeKey } from '@/game/forge'
import { cn } from '@/lib/utils'

export interface ForgeAttempt {
  ids: string[]
  matches: number
}

// Item a forjar: ícone, nome, preço e quantos componentes a receita tem.
export function ForgeTarget({ itemId, slots }: { itemId: string; slots: number }) {
  const target = items[itemId]
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <img src={itemIconUrl(itemId)} alt="" className="size-20 rounded-lg border-2 border-amber-500" />
      <p className="text-xl font-bold">{target.name}</p>
      <p className="text-sm text-muted-foreground">
        {target.gold.toLocaleString('pt-BR')} de ouro · {slots} componentes
      </p>
    </div>
  )
}

interface PickerProps {
  slots: number
  options: string[]
  // Receitas já tentadas (ver recipeKey), para não gastar tentativa repetindo.
  triedKeys: Set<string>
  onForge: (ids: string[]) => void
}

// Espaços da receita, alternativas e botões Limpar/Forjar. Use uma key por rodada para zerar a seleção.
export function ForgePicker({ slots, options, triedKeys, onForge }: PickerProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const full = selected.length === slots

  function add(id: string) {
    if (full) return
    setSelected((prev) => [...prev, id])
    setMessage(null)
  }

  function removeAt(index: number) {
    setSelected((prev) => prev.filter((_, i) => i !== index))
    setMessage(null)
  }

  function forge() {
    if (!full) return
    if (triedKeys.has(recipeKey(selected))) {
      setMessage('Você já tentou essa receita.')
      return
    }
    onForge(selected)
    setSelected([])
  }

  return (
    <div className="flex w-full flex-col items-center gap-5">
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
        {options.map((id) => {
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
              {count > 0 && <Badge className="absolute top-1 right-1 h-5 px-1.5 text-[10px]">×{count}</Badge>}
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
    </div>
  )
}

// Tentativas feitas, da mais recente para a mais antiga.
export function ForgeAttempts({ attempts, slots }: { attempts: ForgeAttempt[]; slots: number }) {
  if (attempts.length === 0) return null
  return (
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
  )
}

export function RecipeIcons({ ids, small }: { ids: string[]; small?: boolean }) {
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

// Receita completa com ícones e nomes, mostrada no fim da rodada.
export function RecipeReveal({ recipe }: { recipe: string[] }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground">Receita:</p>
      <RecipeIcons ids={recipe} />
      <p className="text-sm text-muted-foreground">{recipe.map((id) => items[id].name).join(' + ')}</p>
    </div>
  )
}
