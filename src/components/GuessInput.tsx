import { useMemo, useState } from 'react'
import type { Champion } from '../types/champion'

interface Props {
  options: Champion[]
  disabled: boolean
  onGuess: (champion: Champion) => void
}

export function GuessInput({ options, disabled, onGuess }: Props) {
  const [query, setQuery] = useState('')

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return options.filter((c) => c.name.toLowerCase().startsWith(q)).slice(0, 6)
  }, [query, options])

  function submit(champion: Champion) {
    onGuess(champion)
    setQuery('')
  }

  return (
    <div className="guess-input">
      <input
        type="text"
        placeholder="Digite o nome de um campeão..."
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && suggestions[0]) submit(suggestions[0])
        }}
      />
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => submit(c)}>
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
