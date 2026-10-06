import { Link, Outlet } from 'react-router'

export function Layout() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="py-8 text-center">
        <Link to="/" className="text-5xl font-black tracking-tight text-amber-400">
          Loldle2
        </Link>
      </header>
      <main className="flex-1 px-4 pb-12">
        <Outlet />
      </main>
      <footer className="px-4 py-6 text-center text-xs text-muted-foreground">
        Falas da Wiki League of Legends{' '}
        <a
          href="https://leagueoflegends.fandom.com/pt-br"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          PT-BR
        </a>{' '}
        e{' '}
        <a href="https://leagueoflegends.fandom.com" className="underline" target="_blank" rel="noreferrer">
          em inglês
        </a>{' '}
        (CC BY-SA). Loldle2 não é afiliado à Riot Games.
      </footer>
    </div>
  )
}
