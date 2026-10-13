# Loldle2

Jogo de adivinhação de campeões de League of Legends, inspirado no [Loldle](https://loldle.net).

Há três modos para jogar sozinho, **Falas**, **Splash** e **Habilidade**, e um modo **Multiplayer**. Em todos, os chutes são ilimitados.

### Falas

O jogo mostra uma fala em português e você tenta descobrir qual campeão a disse. Os chutes são ilimitados: ao acertar, você pode passar para a próxima fala.

Nas falas dubladas, dá para ouvir o áudio da dublagem. Ele vira dica depois de 3 chutes errados e fica disponível também depois que você acerta.

### Splash

O jogo mostra um pedaço ampliado da splash art de uma skin. A cada chute errado, a imagem se afasta (de 6x até a arte inteira). Depois de acertar o campeão, há uma pergunta bônus: qual é a skin.

### Habilidade

O jogo mostra o ícone de uma habilidade (passiva, Q, W, E ou R), em preto e branco e possivelmente girado. As cores voltam depois de 3 chutes errados, e a posição original, depois de 6. Depois de acertar, há uma pergunta bônus: qual é a tecla da habilidade.

### Multiplayer

De 2 a 4 jogadores, cada um no seu aparelho, jogam 10 rodadas do modo Falas. Todos veem a mesma fala ao mesmo tempo, e quem acertar o campeão primeiro leva o ponto da rodada. Se ninguém acertar em 90 segundos, a resposta é revelada sem pontos. No fim, aparece o placar e o host pode começar outra partida.

- Um jogador cria a sala e compartilha o código ou o link de convite (`/multi/<código>`).
- A conexão é direta entre os navegadores (WebRTC, via [PeerJS](https://peerjs.com/)). Não há servidor do jogo: o navegador de quem criou a sala (o host) sorteia as falas, valida os chutes e soma os pontos.
- Para os navegadores se encontrarem, o PeerJS usa o servidor de sinalização gratuito `0.peerjs.com`. Para usar outro servidor, defina `VITE_PEER_HOST`, `VITE_PEER_PORT`, `VITE_PEER_PATH` e `VITE_PEER_SECURE` no build.
- Se o host fechar a página, a partida acaba para todos. Se um convidado sair, ele fica marcado como "saiu" e a partida continua.
- Em algumas redes muito restritas (ex.: redes corporativas), a conexão direta pode falhar. Isso exigiria um servidor TURN, que o projeto ainda não tem.

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- [PeerJS](https://peerjs.com/) (multiplayer via WebRTC)

## Como rodar

```bash
npm install
npm run dev           # servidor de desenvolvimento
npm run build         # build de produção
npm run lint          # lint
npm run fetch:quotes  # atualiza src/data/quotes.json e public/audio
npm run fetch:champions  # atualiza src/data/champion-details.json (skins e habilidades)
```

## Estrutura

```
public/
└── audio/            # Áudios das falas dubladas (.ogg)
scripts/
├── fetch-quotes.ts      # Gera a base de falas e baixa os áudios
└── fetch-champions.ts   # Gera skins e habilidades (modos Splash e Habilidade)
src/
├── components/       # Componentes do jogo (formulário de palpite, lista de chutes)
│   └── ui/           # Componentes do shadcn/ui
├── data/             # quotes.json, champion-details.json e helpers de acesso
├── game/             # Lógica do jogo (sorteio de falas, busca de campeões)
├── multiplayer/      # Protocolo e conexão das salas (PeerJS)
├── routes/           # Páginas (início, Falas, Splash, Habilidade, Multiplayer)
└── main.tsx          # Rotas e ponto de entrada
```

## Dados

- **Campeões e ícones:** [Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon) da Riot, em `pt_BR`. Não precisa de chave de API.
- **Skins e habilidades:** Data Dragon, `championFull.json` em `pt_BR` (nomes das skins e das habilidades em português). Os chromas ficam de fora, porque não têm splash art própria, e o script confere se cada splash existe no CDN. São cerca de 2.100 skins. As imagens (splash arts e ícones) são carregadas direto do CDN do Data Dragon.
- **Falas dubladas em PT-BR:** [Wiki League of Legends PT-BR](https://leagueoflegends.fandom.com/pt-br), páginas `<Campeão>/LoL/Áudio`.
- **Áudio das falas dubladas:** arquivos `.ogg` da wiki PT-BR, guardados em `public/audio` (cerca de 500 arquivos, 24 MB). O CDN da wiki bloqueia áudio tocado a partir de outros sites, por isso os arquivos ficam no próprio projeto. As falas traduzidas e as oficiais não têm áudio.
- **Fala oficial de cada campeão:** [Riot Universe](https://universe.leagueoflegends.com/pt_BR/), API `universe-meeps.leagueoflegends.com/v1/pt_br/champions/<campeão>/index.json`. É a frase da biografia do campeão, já em português. Entra só quando o autor é o próprio campeão e aparece no jogo como "Fala oficial do Riot Universe".
- **Demais campeões:** [Wiki League of Legends em inglês](https://leagueoflegends.fandom.com), páginas `<Champion>/LoL/Audio`. As falas foram traduzidas para o português e ficam em `scripts/translations.json`. No jogo, elas aparecem marcadas como "Tradução automática", com opção de ver o original.

As duas wikis usam a licença CC BY-SA. O conteúdo do Riot Universe é da Riot Games.

O script `npm run fetch:quotes` busca os dados e grava `src/data/quotes.json`. Ele usa a wiki PT-BR quando há falas lá e, se não houver, recorre à wiki em inglês com as traduções. Em seguida, acrescenta a fala oficial do Universe. Mantém só as falas da skin clássica e descarta as que contêm o nome do campeão. Se aparecerem falas em inglês sem tradução, o script as lista em `scripts/untranslated.json`, e elas ficam fora do jogo até alguém traduzir e adicionar em `translations.json`.

Hoje 170 dos 173 campeões têm falas: 157 oficiais do Universe, 528 dubladas e cerca de 2.000 traduzidas. Os 3 que faltam (Bardo, Rammus e Rek'Sai) não falam no jogo, e as frases deles no Universe são ditas por outros personagens.

Loldle2 não é afiliado à Riot Games.
