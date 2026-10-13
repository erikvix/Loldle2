import { LockIcon, VolumeXIcon } from 'lucide-react'
import { AudioButton } from '@/components/AudioButton'
import { Button } from '@/components/ui/button'
import { quoteAudioUrl, type PublicQuote } from '@/data/quotes'

// Chutes errados necessários para liberar o áudio como dica.
export const AUDIO_HINT_AFTER = 3

interface Props {
  quote: PublicQuote
  wrongGuesses: number
  // Depois da resposta revelada, o áudio fica livre para ouvir.
  revealed: boolean
}

export function AudioHint({ quote, wrongGuesses, revealed }: Props) {
  const audioUrl = quoteAudioUrl(quote)
  if (!audioUrl) return <NoAudio />
  if (revealed) return <AudioButton key={audioUrl} src={audioUrl} label="Ouvir fala" />

  const remaining = AUDIO_HINT_AFTER - wrongGuesses
  if (remaining > 0) {
    return (
      <Button variant="outline" disabled>
        <LockIcon data-icon="inline-start" />
        Dica de áudio em {remaining} {remaining === 1 ? 'chute' : 'chutes'}
      </Button>
    )
  }
  return <AudioButton key={audioUrl} src={audioUrl} label="Ouvir dica de áudio" />
}

// Só as falas dubladas têm áudio; as traduzidas e as oficiais do Universe ficam só em texto.
function NoAudio() {
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <VolumeXIcon className="size-3.5" />
      Esta fala não tem áudio
    </p>
  )
}
