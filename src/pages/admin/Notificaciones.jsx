import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { notifyChange, request } from '../../api.js'
import { Empty, ErrorBox, Loading, PageHeader, StateBadge, dateTime, useResource } from '../../components/ui.jsx'

export default function Notificaciones() {
  const [areaId, setAreaId] = useState('')
  const areas = useResource(() => request('/admin/areas'))
  const { data, error, loading, reload } = useResource(() => request('/admin/notificaciones', { params: { area_id: areaId } }), [areaId])
  const [actionError, setActionError] = useState('')
  const unread = data?.no_leidas_por_area || {}

  async function act(fn) {
    setActionError('')
    try { await fn(); reload(); notifyChange() } catch (e) { setActionError(e.message) }
  }
  const total = Object.values(unread).reduce((a, b) => a + b, 0)

  return <section className="section">
    <PageHeader kicker="BANDEJA POR ÁREA" title="Notificaciones" actions={<button className="secondary-button" type="button" disabled={!data?.items.some((n) => !n.leida)} onClick={() => act(() => request('/admin/notificaciones/marcar-leidas', { method: 'POST', params: { area_id: areaId } }))}>Marcar todo como leído</button>}>
      Lo que el bot envía a cada área completa: código del ticket, nombre del cliente y su mensaje. El bot no conversa con el cliente.
    </PageHeader>
    <div className="tabs" role="tablist" aria-label="Áreas">
      <button role="tab" aria-selected={areaId === ''} className={areaId === '' ? 'active' : ''} type="button" onClick={() => setAreaId('')}>Todas{total > 0 && <span className="tab-badge">{total}</span>}</button>
      {areas.data?.map((a) => <button role="tab" key={a.id} aria-selected={String(a.id) === areaId} className={String(a.id) === areaId ? 'active' : ''} type="button" onClick={() => setAreaId(String(a.id))}>{a.nombre}{unread[a.id] > 0 && <span className="tab-badge">{unread[a.id]}</span>}</button>)}
    </div>
    <ErrorBox error={error || actionError} onRetry={error ? reload : undefined}/>
    {loading && !data ? <Loading/> : data && (data.items.length ? <ul className="notification-list">{data.items.map((n) => <li key={n.id} className={n.leida ? 'read' : 'unread'}>
      <span className="unread-dot" aria-hidden="true"/>
      <div className="notification-main">
        <div className="notification-top"><strong>{n.titulo}</strong><span className="muted small">{dateTime(n.creada_en)}</span></div>
        <p>{n.cuerpo}</p>
        <div className="notification-meta"><span className="chip">Para: equipo de {n.area_nombre}</span><StateBadge state={n.ticket_estado}/><Link className="text-link" to={`/admin/tickets?id=${n.ticket_id}&estado=todos`}>Abrir ticket →</Link></div>
      </div>
      <button type="button" className="secondary-button small" onClick={() => act(() => request(`/admin/notificaciones/${n.id}`, { method: 'PATCH', body: { leida: !n.leida } }))}>{n.leida ? 'Marcar no leída' : 'Marcar leída'}</button>
    </li>)}</ul> : <Empty icon="bell" title="Sin notificaciones">Cuando un cliente envíe una consulta desde /soporte, el área correspondiente la verá aquí.</Empty>)}
  </section>
}
