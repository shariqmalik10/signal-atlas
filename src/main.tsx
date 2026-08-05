import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import AdminPortal from './AdminPortal'
import './styles.css'

const isManageRoute = window.location.pathname.replace(/\/+$/, '') === '/manage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isManageRoute ? <AdminPortal /> : <App />}</StrictMode>,
)
