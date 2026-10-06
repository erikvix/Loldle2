import { LoaderCircleIcon, PauseIcon, Volume2Icon, VolumeXIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  src: string
  label: string
}

type Status = 'idle' | 'loading' | 'playing' | 'error'

export function AudioButton({ src, label }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [status, setStatus] = useState<Status>('idle')

  // Para o áudio ao trocar de fala ou sair da página.
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [src])

  async function toggle() {
    if (status === 'playing') {
      audioRef.current?.pause()
      setStatus('idle')
      return
    }

    if (!audioRef.current) {
      const audio = new Audio(src)
      audio.addEventListener('ended', () => setStatus('idle'))
      audio.addEventListener('error', () => setStatus('error'))
      audioRef.current = audio
    }

    setStatus('loading')
    try {
      audioRef.current.currentTime = 0
      await audioRef.current.play()
      setStatus('playing')
    } catch {
      // Ex.: navegador sem suporte a .ogg (versões antigas do Safari).
      setStatus('error')
    }
  }

  if (status === 'error') {
    return (
      <Button variant="outline" disabled>
        <VolumeXIcon data-icon="inline-start" />
        Não foi possível tocar o áudio
      </Button>
    )
  }

  return (
    <Button variant="outline" onClick={toggle}>
      {status === 'loading' ? (
        <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
      ) : status === 'playing' ? (
        <PauseIcon data-icon="inline-start" />
      ) : (
        <Volume2Icon data-icon="inline-start" />
      )}
      {status === 'playing' ? 'Pausar' : label}
    </Button>
  )
}
