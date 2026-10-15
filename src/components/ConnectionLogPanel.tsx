import { CheckIcon, CopyIcon, ScrollTextIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { connectionLogText, formatLogTime, useConnectionLog } from '@/multiplayer/connectionLog'

// Log de conexão da sala, recolhível. Abre sozinho quando há erro.
export function ConnectionLogPanel({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const entries = useConnectionLog()
  const [copied, setCopied] = useState(false)
  const problems = entries.filter((e) => e.level !== 'info').length

  async function copy() {
    try {
      await navigator.clipboard.writeText(connectionLogText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sem acesso à área de transferência: dá para selecionar o texto do log à mão.
    }
  }

  return (
    <details open={defaultOpen} className="group w-full rounded-lg border text-sm">
      <summary className="flex cursor-pointer items-center gap-2 p-3 text-muted-foreground select-none">
        <ScrollTextIcon className="size-4" />
        <span>
          Log de conexão ({entries.length} {entries.length === 1 ? 'evento' : 'eventos'}
          {problems > 0 && <span className="text-amber-400">{`, ${problems} com aviso ou erro`}</span>})
        </span>
      </summary>
      <div className="flex flex-col gap-2 border-t p-3">
        <p className="text-xs text-muted-foreground">
          Se a conexão falhar, copie o log e mande para quem cuida do jogo. Ele não inclui nomes de outros jogadores
          nem respostas.
        </p>
        <ol className="max-h-72 overflow-y-auto rounded bg-muted p-2 font-mono text-[11px] leading-relaxed">
          {entries.length === 0 && <li className="text-muted-foreground">Nenhum evento ainda.</li>}
          {entries.map((entry, i) => (
            <li
              key={i}
              className={cn(
                'break-words',
                entry.level === 'warn' && 'text-amber-400',
                entry.level === 'error' && 'text-red-400',
              )}
            >
              <span className="text-muted-foreground">{formatLogTime(entry.time)}</span> {entry.message}
            </li>
          ))}
        </ol>
        <Button variant="outline" size="sm" className="self-start" onClick={copy}>
          {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
          {copied ? 'Log copiado!' : 'Copiar log'}
        </Button>
      </div>
    </details>
  )
}
