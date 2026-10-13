import { ImageIcon, QuoteIcon, SparklesIcon, UsersIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function Home() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <p className="text-center text-muted-foreground">Escolha um modo de jogo</p>
      <Link to="/falas" className="rounded-xl transition-transform hover:scale-[1.02]">
        <Card className="hover:border-amber-500">
          <CardHeader className="flex flex-row items-center gap-4">
            <QuoteIcon className="size-8 text-amber-500" />
            <div>
              <CardTitle>Falas</CardTitle>
              <CardDescription>Adivinhe o campeão pela fala dublada em português</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </Link>
      <Link to="/splash" className="rounded-xl transition-transform hover:scale-[1.02]">
        <Card className="hover:border-amber-500">
          <CardHeader className="flex flex-row items-center gap-4">
            <ImageIcon className="size-8 text-amber-500" />
            <div>
              <CardTitle>Splash</CardTitle>
              <CardDescription>Adivinhe o campeão por um pedaço da splash art</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </Link>
      <Link to="/habilidade" className="rounded-xl transition-transform hover:scale-[1.02]">
        <Card className="hover:border-amber-500">
          <CardHeader className="flex flex-row items-center gap-4">
            <SparklesIcon className="size-8 text-amber-500" />
            <div>
              <CardTitle>Habilidade</CardTitle>
              <CardDescription>Adivinhe o campeão pelo ícone de uma habilidade</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </Link>
      <Link to="/multi" className="rounded-xl transition-transform hover:scale-[1.02]">
        <Card className="hover:border-amber-500">
          <CardHeader className="flex flex-row items-center gap-4">
            <UsersIcon className="size-8 text-amber-500" />
            <div>
              <CardTitle>Multiplayer</CardTitle>
              <CardDescription>De 2 a 4 jogadores, 10 rodadas: quem acertar primeiro pontua</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </Link>
    </div>
  )
}
