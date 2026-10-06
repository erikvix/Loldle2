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
└── fetch-quotes.ts   # Gera a base de falas (wikis e Riot Universe)
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
- **Falas dubladas em PT-BR:** [Wiki League of Legends PT-BR](https://leagueoflegends.fandom.com/pt-br), páginas `<Campeão>/LoL/Áudio`.
- **Fala oficial de cada campeão:** [Riot Universe](https://universe.leagueoflegends.com/pt_BR/), API `universe-meeps.leagueoflegends.com/v1/pt_br/champions/<campeão>/index.json`. É a frase da biografia do campeão, já em português. Entra só quando o autor é o próprio campeão e aparece no jogo como "Fala oficial do Riot Universe".
- **Demais campeões:** [Wiki League of Legends em inglês](https://leagueoflegends.fandom.com), páginas `<Champion>/LoL/Audio`. As falas foram traduzidas para o português e ficam em `scripts/translations.json`. No jogo, elas aparecem marcadas como "Tradução automática", com opção de ver o original.

As duas wikis usam a licença CC BY-SA. O conteúdo do Riot Universe é da Riot Games.

O script `npm run fetch:quotes` busca os dados e grava `src/data/quotes.json`. Ele usa a wiki PT-BR quando há falas lá e, se não houver, recorre à wiki em inglês com as traduções. Em seguida, acrescenta a fala oficial do Universe. Mantém só as falas da skin clássica e descarta as que contêm o nome do campeão. Se aparecerem falas em inglês sem tradução, o script as lista em `scripts/untranslated.json`, e elas ficam fora do jogo até alguém traduzir e adicionar em `translations.json`.

Hoje 170 dos 173 campeões têm falas: 157 oficiais do Universe, 528 dubladas e cerca de 2.000 traduzidas. Os 3 que faltam (Bardo, Rammus e Rek'Sai) não falam no jogo, e as frases deles no Universe são ditas por outros personagens.

Loldle2 não é afiliado à Riot Games.
