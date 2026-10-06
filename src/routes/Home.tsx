import { QuoteIcon } from 'lucide-react'
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
    </div>
  )
}
