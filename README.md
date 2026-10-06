# Loldle2

Jogo de adivinhação de campeões de League of Legends, inspirado no [Loldle](https://loldle.net).

Por enquanto há um modo: **Falas**. O jogo mostra uma fala dublada em português e você tenta descobrir qual campeão a disse. Os chutes são ilimitados: ao acertar, você pode passar para a próxima fala.

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)

## Como rodar

```bash
npm install
npm run dev           # servidor de desenvolvimento
npm run build         # build de produção
npm run lint          # lint
npm run fetch:quotes  # atualiza src/data/quotes.json
```

## Estrutura

```
scripts/
└── fetch-quotes.ts   # Gera a base de falas a partir da wiki PT-BR
src/
├── components/       # Componentes do jogo (formulário de palpite, lista de chutes)
│   └── ui/           # Componentes do shadcn/ui
├── data/             # quotes.json e helpers de acesso aos dados
├── game/             # Lógica do jogo (sorteio de falas, busca de campeões)
├── routes/           # Páginas (início e modo Falas)
└── main.tsx          # Rotas e ponto de entrada
```

## Dados

- **Campeões e ícones:** [Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon) da Riot, em `pt_BR`. Não precisa de chave de API.
- **Falas:** [Wiki League of Legends PT-BR](https://leagueoflegends.fandom.com/pt-br), licença CC BY-SA, páginas `<Campeão>/LoL/Áudio`.

O script `npm run fetch:quotes` busca os dados das duas fontes e grava `src/data/quotes.json`. Ele mantém só as falas da skin clássica e descarta as que contêm o nome do campeão.

A wiki PT-BR ainda não tem falas para todos os campeões, então só uma parte deles aparece como resposta. Mesmo assim, todos ficam disponíveis como palpite.

Loldle2 não é afiliado à Riot Games.
