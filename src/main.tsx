import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Polices du logo, hébergées avec le site (aucun appel à Google Fonts)
import '@fontsource/fraunces/500.css'
import '@fontsource/fraunces/500-italic.css'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
