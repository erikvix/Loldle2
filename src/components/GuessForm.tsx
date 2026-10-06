import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ChampionIcon } from '@/components/ChampionIcon'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Field, FieldError } from '@/components/ui/field'
import { championsById, type Champion } from '@/data/quotes'
import { searchChampions } from '@/game/quotes'

interface Props {
  guessedIds: Set<string>
  onGuess: (champion: Champion) => void
}

export function GuessForm({ guessedIds, onGuess }: Props) {
  const [search, setSearch] = useState('')

  const schema = useMemo(
    () =>
      z.object({
        championId: z
          .string()
          .refine((id) => championsById.has(id), 'Campeão não encontrado.')
          .refine((id) => !guessedIds.has(id), 'Você já tentou esse campeão.'),
      }),
    [guessedIds],
  )

  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { championId: '' },
  })

  const suggestions = useMemo(() => searchChampions(search, guessedIds), [search, guessedIds])

  const submit = handleSubmit(({ championId }) => {
    onGuess(championsById.get(championId)!)
    setSearch('')
    setValue('championId', '')
  })

  function select(champion: Champion) {
    setValue('championId', champion.id)
    void submit()
  }

  return (
    <form onSubmit={submit} className="w-full">
      <Field data-invalid={!!errors.championId}>
        <Command label="Nome do campeão" shouldFilter={false} className="border bg-card">
          <CommandInput
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder="Digite o nome de um campeão..."
          />
          {search.trim() && (
            <CommandList>
              <CommandEmpty>Nenhum campeão encontrado.</CommandEmpty>
              {suggestions.map((champion) => (
                <CommandItem key={champion.id} value={champion.id} onSelect={() => select(champion)}>
                  <ChampionIcon champion={champion} className="size-8" />
                  <span className="font-medium">{champion.name}</span>
                </CommandItem>
              ))}
            </CommandList>
          )}
        </Command>
        <FieldError errors={[errors.championId]} />
      </Field>
    </form>
  )
}
