import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from './AppLayout'
import { LoginPage } from './pages/LoginPage'
import { WebhookEditPage } from './pages/WebhookEditPage'
import { WebhooksPage } from './pages/WebhooksPage'
import { RequireAuth } from './session/RequireAuth'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/webhooks', element: <WebhooksPage /> },
          { path: '/webhooks/:id/edit', element: <WebhookEditPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/webhooks" replace /> },
])
