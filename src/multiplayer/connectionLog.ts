import { useSyncExternalStore } from 'react'

// Log de conexão do multiplayer: guarda os últimos eventos em memória (só nesta aba), para o
// jogador ver na tela ou copiar e mandar quando algo der errado. Também vai para o console.

export type LogLevel = 'info' | 'warn' | 'error'

export interface LogEntry {
  time: number
  level: LogLevel
  message: string
}

const MAX_ENTRIES = 300
let entries: LogEntry[] = []
const listeners = new Set<() => void>()

export function logConnection(level: LogLevel, message: string) {
  entries = [...entries.slice(-(MAX_ENTRIES - 1)), { time: Date.now(), level, message }]
  for (const listener of listeners) listener()
  const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info
  consoleMethod(`[loldle2] ${message}`)
}

export function clearConnectionLog() {
  entries = []
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useConnectionLog(): LogEntry[] {
  return useSyncExternalStore(subscribe, () => entries)
}

export function formatLogTime(time: number): string {
  return new Date(time).toLocaleTimeString('pt-BR', { hour12: false }) + '.' + String(time % 1000).padStart(3, '0')
}

// Texto para copiar: informações do navegador e todos os eventos.
export function connectionLogText(): string {
  const header = [
    `Loldle2 — log de conexão (${new Date().toLocaleString('pt-BR')})`,
    `Página: ${window.location.href}`,
    `Navegador: ${navigator.userAgent}`,
    `Online: ${navigator.onLine ? 'sim' : 'não'}`,
    '',
  ]
  const lines = entries.map((e) => `${formatLogTime(e.time)} [${e.level}] ${e.message}`)
  return [...header, ...lines].join('\n')
}
