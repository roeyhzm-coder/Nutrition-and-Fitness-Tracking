import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { DirectionProvider } from '@/components/ui/direction'
import './index.css'
import App from './App.tsx'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DirectionProvider dir="rtl">
      <App />
    </DirectionProvider>
  </StrictMode>,
)
