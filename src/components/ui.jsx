import React, { useEffect, useState } from 'react'

export const LABELS = ['Atención al Cliente', 'Finanzas', 'Logística', 'Marketing', 'Soporte TI', 'Ventas']
export const MODEL_NAMES = { naive_bayes: 'Naive Bayes', logistic_regression: 'Regresión Logística', knn: 'KNN' }
export const MODEL_ORDER = ['naive_bayes', 'logistic_regression', 'knn']
export const STATE_NAMES = { nuevo: 'Nuevo', revision_manual: 'Revisión manual', asignado: 'Asignado', en_progreso: 'En progreso', resuelto: 'Resuelto', cerrado: 'Cerrado' }

export const percent = (value, digits = 1) => value == null ? '—' : `${(Number(value) * 100).toFixed(digits).replace('.', ',')} %`
export const decimal = (value, digits = 4) => value == null ? '—' : Number(value).toFixed(digits).replace('.', ',')
export const integer = (value) => value == null ? '—' : Number(value).toLocaleString('es-ES')
export const dateTime = (iso) => iso ? new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—'

export function configText(c) {
  if (!c) return '—'
  const method = c.method === 'lemmatization' ? 'Lematización' : 'Stemming'
  const grams = c.ngrams === 1 ? 'unigramas' : 'uni + bigramas'
  const value = c.parameter_name === 'n_neighbors' ? Math.round(c.parameter_value) : c.parameter_value
  const extra = [c.class_weight && `class_weight=${c.class_weight}`, c.weights && `weights=${c.weights}`].filter(Boolean)
  return `${method} · ${grams} · ${[`${c.parameter_name}=${value}`, ...extra].join(', ')}`
}

const PATHS = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  chart: <path d="M4 20h16M6 16v-5M12 16V5M18 16V9"/>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M4 5v15M8 7h8M8 11h8"/></>,
  arrow: <path d="M5 12h14M14 7l5 5-5 5"/>,
  spark: <path d="m12 3 1.8 5.5L19 10l-5.2 1.7L12 17l-1.8-5.3L5 10l5.2-1.5zM19 16l.7 2.2L22 19l-2.3.8L19 22l-.7-2.2L16 19l2.3-.8z"/>,
  message: <><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h6"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  refresh: <><path d="M20 11a8 8 0 1 0-2.4 5.7"/><path d="M20 5v6h-6"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
  ticket: <><path d="M4 7a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2v-3a2 2 0 0 0 0-4z"/><path d="M10 5v14" strokeDasharray="2 2"/></>,
  bell: <><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></>,
  layers: <><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></>,
  users: <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/></>,
  flask: <><path d="M9 3h6M10 3v6l-5.5 9A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3L14 9V3"/><path d="M7.5 15h9"/></>,
  logout: <><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></>,
  external: <><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></>,
  x: <path d="M6 6l12 12M18 6 6 18"/>,
  search: <><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></>,
  send: <path d="M4 12 20 4l-6 16-3-7z"/>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>,
  inbox: <><path d="M4 13h4l2 3h4l2-3h4"/><path d="M5 5h14l1 8v6H4v-6z"/></>,
}

export function Icon({ name, size = 20, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{PATHS[name]}</svg>
}

export function MetricCard({ label, value, helper, accent, icon = 'chart' }) {
  return <div className="metric-card"><span className="metric-label">{label}</span><div className="metric-number">{value ?? '—'}<span className={`metric-icon ${accent || ''}`}><Icon name={icon} size={17}/></span></div><span className="metric-helper">{helper}</span></div>
}

export function StateBadge({ state }) {
  return <span className={`state-badge state-${state}`}>{STATE_NAMES[state] || state}</span>
}

export function PageHeader({ kicker, title, children, actions }) {
  return <div className="section-title admin-title"><div><div className="section-kicker">{kicker}</div><h2>{title}</h2>{children && <p>{children}</p>}</div>{actions && <div className="title-actions">{actions}</div>}</div>
}

export function Loading({ label = 'Cargando…' }) {
  return <div className="loading" role="status"><span className="spinner"/>{label}</div>
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null
  return <div role="alert" className="alert error with-action"><span>{error}</span>{onRetry && <button type="button" className="link-button" onClick={onRetry}>Reintentar</button>}</div>
}

export function Empty({ icon = 'inbox', title, children }) {
  return <div className="empty-state"><span className="empty-state-icon"><Icon name={icon} size={22}/></span><strong>{title}</strong>{children && <p>{children}</p>}</div>
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><h3>{title}</h3><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><Icon name="x" size={18}/></button></div>
      {children}
    </div>
  </div>
}

// Carga datos con estado de carga/error y función de recarga.
export function useResource(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: '' }))
    loader().then((data) => alive && setState({ data, error: '', loading: false }))
      .catch((error) => alive && setState({ data: null, error: error.message, loading: false }))
    return () => { alive = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  return { ...state, reload: () => setTick((t) => t + 1), setData: (data) => setState((s) => ({ ...s, data })) }
}
