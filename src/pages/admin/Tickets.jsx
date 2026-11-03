import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { notifyChange, request } from '../../api.js'
import { Empty, ErrorBox, Icon, Loading, PageHeader, STATE_NAMES, StateBadge, dateTime, integer, percent, useResource } from '../../components/ui.jsx'

const FILTERS = [['todos', 'Todos'], ['abiertos', 'Abiertos'], ['revision_manual', 'Revisión manual'], ['nuevo', 'Nuevos'], ['asignado', 'Asignados'], ['en_progreso', 'En progreso'], ['resuelto', 'Resueltos'], ['cerrado', 'Cerrados']]
const EVENTS = { creado: 'Ticket creado', clasificacion: 'Clasificado por el modelo', enrutado: 'Enrutado al área', notificacion: 'Área notificada', revision_manual: 'Enviado a revisión manual', reasignacion_area: 'Área reasignada', asignacion: 'Asignado a empleado', desasignacion: 'Empleado retirado', estado: 'Cambio de estado', nota: 'Nota' }

function eventText(e) {
  const d = e.detalle || {}
  if (e.tipo === 'clasificacion') return d.etiqueta ? `${d.etiqueta} (${percent(d.confianza)})` : d.motivo
  if (e.tipo === 'enrutado' || e.tipo === 'notificacion') return d.area
  if (e.tipo === 'revision_manual') return d.motivo
  if (e.tipo === 'reasignacion_area') return `${d.hacia}${d.correccion_modelo ? ' · corrige al modelo' : ''}`
  if (e.tipo === 'asignacion') return d.empleado
  if (e.tipo === 'estado') return `${STATE_NAMES[d.desde]} → ${STATE_NAMES[d.hacia]}`
  if (e.tipo === 'nota') return d.texto
  return ''
}

function TicketDetail({ id, areas, onClose, onChanged }) {
  const { data: t, error, loading, reload, setData } = useResource(() => request(`/admin/tickets/${id}`), [id])
  const [employees, setEmployees] = useState([])
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [note, setNote] = useState('')
  useEffect(() => {
    if (t?.area_id) request('/admin/empleados', { params: { area_id: t.area_id } }).then((list) => setEmployees(list.filter((e) => e.activo))).catch(() => setEmployees([]))
    else setEmployees([])
  }, [t?.area_id])

  async function patch(body) {
    setBusy(true); setActionError('')
    try { setData(await request(`/admin/tickets/${id}`, { method: 'PATCH', body })); onChanged(); notifyChange() }
    catch (e) { setActionError(e.message) } finally { setBusy(false) }
  }

  const probs = t ? Object.entries(t.probabilidades || {}).sort((a, b) => b[1] - a[1]) : []
  const closed = t?.estado === 'cerrado'
  return <aside className="drawer" aria-label="Detalle del ticket">
    <div className="drawer-head"><div><span className="overline">TICKET</span><h3>{t?.codigo || '…'}</h3></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar detalle"><Icon name="x" size={18}/></button></div>
    {loading && !t && <Loading/>}
    <ErrorBox error={error} onRetry={reload}/>
    {t && <div className="drawer-body">
      <div className="kv"><span>Estado</span><StateBadge state={t.estado}/></div>
      <div className="kv"><span>Cliente</span><strong>{t.cliente_nombre}</strong></div>
      {t.cliente_email && <div className="kv"><span>Correo</span><span>{t.cliente_email}</span></div>}
      <div className="kv"><span>Recibido</span><span>{dateTime(t.creado_en)}</span></div>
      <blockquote className="ticket-message">{t.mensaje}</blockquote>
      {t.requiere_revision && <div className="alert warning">Requiere revisión manual: {t.motivo_revision || 'sin motivo registrado'}.</div>}

      <h4>Sugerencia del modelo</h4>
      {t.etiqueta_predicha ? <>
        <p className="muted small">Área sugerida: <strong>{t.etiqueta_predicha}</strong> · confianza {percent(t.confianza)} (no calibrada){t.corregido && <b className="chip warn-chip">corregido</b>}</p>
        <div className="ranking compact">{probs.map(([name, value]) => <div className="rank-row" key={name}><span>{name}</span><div className="rank-bar"><i style={{ width: `${value * 100}%` }}/></div><b>{percent(value)}</b></div>)}</div>
      </> : <p className="muted small">El modelo no asignó área.</p>}

      <h4>Gestión</h4>
      <div className="action-grid">
        <label className="field"><span>Área</span>
          <select value={t.area_id || ''} disabled={busy || closed} onChange={(e) => e.target.value && patch({ area_id: Number(e.target.value) })}>
            <option value="">Sin área</option>
            {areas.filter((a) => a.activa || a.id === t.area_id).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select></label>
        <label className="field"><span>Empleado</span>
          <select value={t.empleado_id || ''} disabled={busy || closed || !t.area_id} onChange={(e) => patch(e.target.value ? { empleado_id: Number(e.target.value) } : { quitar_empleado: true })}>
            <option value="">{t.area_id ? 'Sin asignar' : 'Elige primero un área'}</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.nombre} · {integer(e.tickets_abiertos)} abiertos</option>)}
          </select></label>
      </div>
      {t.transiciones.length > 0 && <div className="state-actions"><span className="muted small">Cambiar estado:</span>{t.transiciones.map((s) => <button key={s} type="button" className="secondary-button small" disabled={busy} onClick={() => patch({ estado: s })}>{STATE_NAMES[s]}</button>)}</div>}
      {!closed && <form className="note-form" onSubmit={(e) => { e.preventDefault(); if (note.trim()) { patch({ nota: note.trim() }); setNote('') } }}>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Agregar una nota interna…" aria-label="Nota interna"/>
        <button type="submit" className="secondary-button small" disabled={busy || !note.trim()}>Guardar</button>
      </form>}
      <ErrorBox error={actionError}/>

      <h4>Bitácora</h4>
      <ol className="timeline">{t.eventos.map((e) => <li key={e.id}><span className={`timeline-dot actor-${e.actor}`}/><div><strong>{EVENTS[e.tipo] || e.tipo}</strong>{eventText(e) && <span> · {eventText(e)}</span>}<small>{dateTime(e.creado_en)} · {e.actor}</small></div></li>)}</ol>
    </div>}
  </aside>
}

export default function Tickets() {
  const [params, setParams] = useSearchParams()
  const estado = params.get('estado') ?? 'abiertos'
  const areaId = params.get('area_id') || ''
  const selected = params.get('id')
  const page = Number(params.get('page') || 1)
  const [search, setSearch] = useState(params.get('q') || '')
  const areas = useResource(() => request('/admin/areas'))
  const list = useResource(() => request('/admin/tickets', { params: { estado: estado === 'todos' ? undefined : estado, area_id: areaId, q: params.get('q'), page, page_size: 15 } }), [estado, areaId, params.get('q'), page])
  const update = (changes) => { const next = new URLSearchParams(params); Object.entries(changes).forEach(([k, v]) => v === '' || v == null ? next.delete(k) : next.set(k, v)); if (!('page' in changes)) next.delete('page'); setParams(next) }
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.page_size)) : 1

  return <section className={`section tickets-page${selected ? ' with-drawer' : ''}`}>
    <PageHeader kicker="BANDEJA" title="Tickets">Asigna cada ticket a un empleado del área, corrige el área si el modelo se equivocó y sigue su estado.</PageHeader>
    <div className="filters">
      <div className="chips" role="group" aria-label="Filtrar por estado">{FILTERS.map(([value, label]) => <button key={value} type="button" className={`filter-chip${estado === value ? ' active' : ''}`} onClick={() => update({ estado: value })}>{label}</button>)}</div>
      <div className="filter-row">
        <select value={areaId} onChange={(e) => update({ area_id: e.target.value })} aria-label="Filtrar por área"><option value="">Todas las áreas</option>{areas.data?.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select>
        <form className="search" onSubmit={(e) => { e.preventDefault(); update({ q: search.trim() }) }}><Icon name="search" size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código, cliente o texto" aria-label="Buscar"/></form>
      </div>
    </div>
    <ErrorBox error={list.error} onRetry={list.reload}/>
    {list.loading && !list.data ? <Loading/> : list.data && (list.data.items.length ? <div className="detail-card flush"><div className="table-wrap"><table className="data-table clickable">
      <thead><tr><th>Código</th><th>Cliente</th><th>Mensaje</th><th>Área</th><th>Estado</th><th>Empleado</th><th>Recibido</th></tr></thead>
      <tbody>{list.data.items.map((t) => <tr key={t.id} className={String(t.id) === selected ? 'selected' : ''} onClick={() => update({ id: t.id, page })} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && update({ id: t.id, page })}>
        <td className="nowrap">{t.codigo}</td><td>{t.cliente_nombre}</td><td className="message-cell">{t.mensaje}</td>
        <td>{t.area_nombre || <em className="muted">Sin área</em>}{t.corregido && <b className="chip warn-chip">corregido</b>}</td>
        <td><StateBadge state={t.estado}/></td><td>{t.empleado_nombre || '—'}</td><td className="nowrap">{dateTime(t.creado_en)}</td>
      </tr>)}</tbody></table></div>
      <div className="pager"><span>{integer(list.data.total)} tickets</span><div><button type="button" className="secondary-button small" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>Anterior</button><span>Página {page} de {pages}</span><button type="button" className="secondary-button small" disabled={page >= pages} onClick={() => update({ page: page + 1 })}>Siguiente</button></div></div>
    </div> : <Empty title="No hay tickets con estos filtros">Prueba con «Todos» o envía una consulta desde <a href="/soporte" target="_blank" rel="noreferrer">/soporte</a>.</Empty>)}
    {selected && <TicketDetail id={selected} areas={areas.data || []} onClose={() => update({ id: '', page })} onChanged={list.reload}/>}
  </section>
}
