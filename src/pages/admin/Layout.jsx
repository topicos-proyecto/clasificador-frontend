import React, { useCallback, useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { clearToken, getToken, request } from '../../api.js'
import { Icon } from '../../components/ui.jsx'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/admin/tickets', label: 'Tickets', icon: 'ticket' },
  { to: '/admin/notificaciones', label: 'Notificaciones', icon: 'bell', badge: true },
  { to: '/admin/areas', label: 'Áreas', icon: 'layers' },
  { to: '/admin/empleados', label: 'Empleados', icon: 'users' },
  { section: 'MODELO' },
  { to: '/admin/modelo', label: 'Métricas del modelo', icon: 'chart' },
  { to: '/admin/laboratorio', label: 'Laboratorio NLP', icon: 'flask' },
]
const TITLES = { '/admin': 'Dashboard', '/admin/tickets': 'Tickets', '/admin/notificaciones': 'Notificaciones', '/admin/areas': 'Áreas', '/admin/empleados': 'Empleados', '/admin/modelo': 'Métricas del modelo', '/admin/laboratorio': 'Laboratorio NLP' }

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)
  const [status, setStatus] = useState('checking')
  const [authed, setAuthed] = useState(Boolean(getToken()))

  const refresh = useCallback(() => {
    if (!getToken()) return
    request('/admin/notificaciones', { params: { solo_no_leidas: true, limit: 1 } }).then((d) => setUnread(d.no_leidas_total)).catch(() => {})
    request('/health').then(() => setStatus('online')).catch(() => setStatus('offline'))
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 30000)
    const expired = () => { setAuthed(false) }
    window.addEventListener('notificaciones:cambio', refresh)
    window.addEventListener('auth:expired', expired)
    return () => { clearInterval(timer); window.removeEventListener('notificaciones:cambio', refresh); window.removeEventListener('auth:expired', expired) }
  }, [refresh])

  if (!authed) return <Navigate to="/admin/login" replace state={{ from: location.pathname }}/>
  const logout = () => { clearToken(); navigate('/admin/login', { replace: true }) }
  const title = TITLES[location.pathname] || 'Panel'

  return <div className="app-shell">
    <aside className="sidebar">
      <NavLink className="brand" to="/admin"><span className="brand-mark">e<span>.</span></span><span><strong>enlace</strong><small>PANEL DE SOPORTE</small></span></NavLink>
      <nav className="nav" aria-label="Navegación del panel">
        <div className="sidebar-section">GESTIÓN</div>
        {NAV.map((item) => item.section ? <div className="sidebar-section" key={item.section}>{item.section}</div>
          : <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon name={item.icon} size={18}/> <span className="nav-text">{item.label}</span>
            {item.badge && unread > 0 && <span className="nav-badge" aria-label={`${unread} sin leer`}>{unread > 99 ? '99+' : unread}</span>}
          </NavLink>)}
      </nav>
      <div className="sidebar-bottom">
        <a className="side-link" href="/soporte" target="_blank" rel="noreferrer"><Icon name="external" size={16}/> <span className="nav-text">Página pública /soporte</span></a>
        <button type="button" className="side-link" onClick={logout}><Icon name="logout" size={16}/> <span className="nav-text">Cerrar sesión</span></button>
      </div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="breadcrumb">Panel <Icon name="chevron" size={13}/> <strong>{title}</strong></div>
        <button className="status-button" type="button" onClick={refresh} aria-label="Comprobar conexión con la API"><span className={`status-dot ${status}`}/>{status === 'online' ? 'API conectada' : status === 'checking' ? 'Comprobando' : 'API desconectada'}<Icon name="refresh" size={14}/></button>
      </header>
      <div className="page-body admin-body"><Outlet/></div>
    </main>
  </div>
}
