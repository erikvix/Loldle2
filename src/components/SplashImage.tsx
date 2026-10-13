import { LoaderCircleIcon, ZoomOutIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Props {
  url: string
  // Ponto da imagem onde o zoom começa, em %.
  focus: { x: number; y: number }
  zoom: number
  onError?: () => void
}

export function SplashImage(props: Props) {
  // A key reinicia o estado de carregamento a cada imagem nova.
  return <SplashImageContent key={props.url} {...props} />
}

function SplashImageContent({ url, focus, zoom, onError }: Props) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative aspect-[1215/717] w-full overflow-hidden rounded-lg bg-muted">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderCircleIcon className="size-4 animate-spin" />
          Carregando imagem...
        </div>
      )}
      <img
        src={url}
        alt="Splash art a adivinhar"
        draggable={false}
        className={cn(
          'size-full object-cover transition-[transform,opacity] duration-700 ease-out select-none',
          !loaded && 'opacity-0',
        )}
        style={{ transform: `scale(${zoom})`, transformOrigin: `${focus.x}% ${focus.y}%` }}
        onLoad={() => setLoaded(true)}
        onError={onError}
      />
    </div>
  )
}

export function ZoomBadge({ zoom }: { zoom: number }) {
  return (
    <Badge variant="outline">
      <ZoomOutIcon />
      Zoom {zoom.toLocaleString('pt-BR')}x
    </Badge>
  )
}
