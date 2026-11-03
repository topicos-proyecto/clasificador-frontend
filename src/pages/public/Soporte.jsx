import React, { useState } from 'react'
import { request } from '../../api.js'
import { Icon } from '../../components/ui.jsx'

const EMPTY = { nombre: '', email: '', mensaje: '' }

export default function Soporte() {
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  const set = (field) => (e) => { setForm({ ...form, [field]: e.target.value }); setError('') }

  async function submit(event) {
    event.preventDefault()
    if (!form.nombre.trim()) { setError('Escribe tu nombre.'); return }
    if (!form.mensaje.trim()) { setError('Escribe tu consulta.'); return }
    setBusy(true); setError('')
    try {
      const data = await request('/public/tickets', { method: 'POST', body: { nombre: form.nombre, email: form.email || null, mensaje: form.mensaje } })
      setDone(data); setForm(EMPTY)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return <div className="public-shell">
    <header className="public-header"><a className="brand" href="/soporte"><span className="brand-mark">e<span>.</span></span><span><strong>enlace</strong><small>CENTRO DE AYUDA</small></span></a></header>
    <main className="public-main">
      <div className="public-intro">
        <div className="eyebrow"><span className="eyebrow-dot"/> SOPORTE AL CLIENTE</div>
        <h1>¿En qué podemos<br/><span>ayudarte?</span></h1>
        <p>Cuéntanos tu consulta. La recibirá el equipo que corresponde y te responderá a la brevedad.</p>
      </div>
      {done ? <div className="public-card confirm" aria-live="polite">
        <span className="confirm-icon"><Icon name="check" size={26}/></span>
        <h2>Su consulta será atendida.</h2>
        <p>Nuestro equipo la revisará a la brevedad.</p>
        <div className="ticket-code"><small>CÓDIGO DE SEGUIMIENTO</small><strong>{done.codigo}</strong></div>
        <p className="muted small">Guarda este código por si necesitas consultar el estado de tu solicitud.</p>
        <button type="button" className="primary-button" onClick={() => setDone(null)}>Enviar otra consulta <Icon name="arrow" size={17}/></button>
      </div>
      : <form className="public-card" onSubmit={submit} noValidate>
        <div className="form-grid">
          <label className="field"><span>Nombre completo <em>*</em></span><input value={form.nombre} onChange={set('nombre')} maxLength={120} autoComplete="name" required/></label>
          <label className="field"><span>Correo electrónico <small>(opcional)</small></span><input type="email" value={form.email} onChange={set('email')} maxLength={200} autoComplete="email"/></label>
        </div>
        <label className="field"><span>Tu consulta <em>*</em></span>
          <textarea value={form.mensaje} onChange={set('mensaje')} maxLength={3000} required placeholder="Por ejemplo: No me llegó la factura de mi última compra…"/>
        </label>
        <div className="textarea-meta"><span>Describe tu solicitud con el mayor detalle posible.</span><span>{form.mensaje.length} / 3000</span></div>
        {error && <div role="alert" className="alert error">{error}</div>}
        <div className="form-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar consulta'} <Icon name="send" size={16}/></button></div>
      </form>}
    </main>
    <footer className="public-footer">enlace · Centro de ayuda · <a href="/admin">Acceso del equipo</a></footer>
  </div>
}
