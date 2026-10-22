import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { DirectionProvider } from '@/components/ui/direction'
import './index.css'
import App from './App.tsx'

// skipWaiting + clientsClaim (vite.config) activate a new worker immediately;
// this reloads the page once when it takes control, so phones never keep
// running a cached old build. A first install (no previous controller) is
// not an update and does not reload.
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  })
}

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateSW(true)
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const check = () => {
      if (registration.installing || !navigator.onLine) return
      void registration.update().catch(() => undefined)
    }
    check()
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
    window.addEventListener('focus', check)
    window.setInterval(check, 60_000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DirectionProvider dir="rtl">
      <App />
    </DirectionProvider>
  </StrictMode>,
)
