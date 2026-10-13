import { LockIcon, LockOpenIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Chutes errados para liberar cada dica: primeiro a cor do ícone, depois a posição original.
const COLOR_HINT_AFTER = 3
const ROTATION_HINT_AFTER = 6

interface Props {
  url: string
  rotation: number
  wrongGuesses: number
  // Com a resposta revelada, o ícone aparece colorido e na posição original.
  revealed: boolean
  onError?: () => void
}

export function AbilityIcon({ url, rotation, wrongGuesses, revealed, onError }: Props) {
  const showColor = revealed || wrongGuesses >= COLOR_HINT_AFTER
  const showUpright = revealed || wrongGuesses >= ROTATION_HINT_AFTER

  return (
    <div className="flex flex-col items-center">
      {/* Espaço extra para o ícone girado não invadir o texto durante a animação. */}
      <div className="flex size-44 items-center justify-center">
        <img
          key={url}
          src={url}
          alt="Ícone da habilidade a adivinhar"
          draggable={false}
          className={cn(
            'size-32 rounded-xl border-2 transition-[filter,transform] duration-700 select-none',
            !showColor && 'grayscale',
          )}
          style={{ transform: `rotate(${showUpright ? 0 : rotation}deg)` }}
          onError={onError}
        />
      </div>
      {!revealed && (
        <div className="mt-1 flex flex-wrap justify-center gap-2 text-xs">
          <HintStatus label="Cor" unlocked={showColor} remaining={COLOR_HINT_AFTER - wrongGuesses} />
          {rotation !== 0 && (
            <HintStatus
              label="Posição original"
              unlocked={showUpright}
              remaining={ROTATION_HINT_AFTER - wrongGuesses}
            />
          )}
        </div>
      )}
    </div>
  )
}

function HintStatus({ label, unlocked, remaining }: { label: string; unlocked: boolean; remaining: number }) {
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      {unlocked ? <LockOpenIcon className="size-3.5 text-amber-500" /> : <LockIcon className="size-3.5" />}
      {unlocked ? `${label} liberada` : `${label} em ${remaining} ${remaining === 1 ? 'chute' : 'chutes'}`}
    </span>
  )
}
