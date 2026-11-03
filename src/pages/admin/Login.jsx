import React, { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getToken, request, setToken } from '../../api.js'
import { Icon } from '../../components/ui.jsx'

export default function Login() {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  if (getToken()) return <Navigate to="/admin" replace/>

  async function submit(event) {
    event.preventDefault()
    if (!password) { setError('Escribe la contraseña.'); return }
    setBusy(true); setError('')
    try {
      const data = await request('/admin/login', { method: 'POST', body: { password } })
      setToken(data.token)
      navigate(location.state?.from || '/admin', { replace: true })
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return <div className="public-shell login-shell">
    <form className="public-card login-card" onSubmit={submit}>
      <a className="brand" href="/soporte"><span className="brand-mark">e<span>.</span></span><span><strong>enlace</strong><small>PANEL ADMINISTRATIVO</small></span></a>
      <h2>Iniciar sesión</h2>
      <p className="muted">Acceso para el administrador del sistema de soporte.</p>
      <label className="field"><span>Contraseña</span><input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} autoComplete="current-password" autoFocus/></label>
      {error && <div role="alert" className="alert error">{error}</div>}
      <button className="primary-button wide" type="submit" disabled={busy}><Icon name="lock" size={16}/> {busy ? 'Entrando…' : 'Entrar'}</button>
      <a className="text-link" href="/soporte">← Ir a la página pública de soporte</a>
    </form>
  </div>
}
