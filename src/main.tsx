import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import './index.css'
import { Home } from './routes/Home'
import { Layout } from './routes/Layout'
import { QuoteGame } from './routes/QuoteGame'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'falas', element: <QuoteGame /> },
      // Multiplayer carregado sob demanda, para o PeerJS não pesar no modo solo.
      { path: 'multi', lazy: () => import('./routes/MultiplayerHome').then((m) => ({ Component: m.MultiplayerHome })) },
      {
        path: 'multi/:code',
        lazy: () => import('./routes/MultiplayerRoom').then((m) => ({ Component: m.MultiplayerRoom })),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
