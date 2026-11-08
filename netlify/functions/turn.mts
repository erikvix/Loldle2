// Gera credenciais temporárias de TURN no Cloudflare (Realtime TURN) para o multiplayer.
// Precisa das variáveis CLOUDFLARE_TURN_KEY_ID e CLOUDFLARE_TURN_API_TOKEN no Netlify.
// Sem elas, responde 404 e o jogo usa os servidores padrão do PeerJS.

const TTL_SECONDS = 6 * 60 * 60

interface IceServer {
  urls: string | string[]
  username?: string
  credential?: string
}

// Navegadores não conseguem usar a porta 53 e ficam esperando por ela; melhor nem oferecer.
function dropPort53(server: IceServer): IceServer | null {
  const urls = (Array.isArray(server.urls) ? server.urls : [server.urls]).filter((url) => !/:53(\?|$)/.test(url))
  return urls.length > 0 ? { ...server, urls } : null
}

export default async (): Promise<Response> => {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN
  if (!keyId || !token) return Response.json({ error: 'TURN não configurado' }, { status: 404 })

  const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: TTL_SECONDS }),
  })
  if (!response.ok) {
    console.error('Cloudflare TURN respondeu', response.status, await response.text())
    return Response.json({ error: 'Falha ao gerar credenciais de TURN' }, { status: 502 })
  }

  const data = (await response.json()) as { iceServers?: IceServer | IceServer[] }
  const servers = (Array.isArray(data.iceServers) ? data.iceServers : data.iceServers ? [data.iceServers] : [])
    .map(dropPort53)
    .filter((server): server is IceServer => server !== null)

  return Response.json({ iceServers: servers }, { headers: { 'Cache-Control': 'no-store' } })
}
