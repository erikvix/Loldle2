# Loldle2

Jogo diário de adivinhação de campeões de League of Legends, inspirado no [Loldle](https://loldle.net).

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- [oxlint](https://oxc.rs/) para lint

## Como rodar

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção
npm run lint     # lint
```

## Estrutura

```
src/
├── components/   # Componentes de UI (input de palpite, tabela de resultados)
├── data/         # Dados dos campeões
├── game/         # Lógica do jogo (comparação de atributos, campeão do dia)
├── types/        # Tipos TypeScript
├── App.tsx       # Tela principal (modo clássico)
└── main.tsx      # Ponto de entrada
```

## Modo clássico

O jogador digita o nome de um campeão e recebe dicas por atributo:

- 🟩 **Correto**: o atributo é igual ao do campeão do dia
- 🟧 **Parcial**: há sobreposição (por exemplo, uma das posições é igual)
- 🟥 **Errado**: nenhuma correspondência
- ↑ / ↓ no ano de lançamento indicam se o campeão do dia é mais novo ou mais antigo

## Próximos passos

- [ ] Completar `src/data/champions.ts` com todos os campeões
- [ ] Imagens dos campeões (Data Dragon da Riot)
- [ ] Salvar o progresso do dia no `localStorage`
- [ ] Outros modos: citação, habilidade, emoji, splash art
