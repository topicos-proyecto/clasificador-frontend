import React from 'react'
import { Link } from 'react-router-dom'
import { request } from '../../api.js'
import { Empty, ErrorBox, Loading, MetricCard, PageHeader, StateBadge, dateTime, integer, percent, useResource } from '../../components/ui.jsx'

export default function Dashboard() {
  const { data, error, loading, reload } = useResource(() => request('/admin/dashboard'))
  if (loading && !data) return <Loading/>
  if (error) return <ErrorBox error={error} onRetry={reload}/>
  const s = data.por_estado
  const maxOpen = Math.max(1, ...data.por_area.map((a) => a.abiertos))
  return <section className="section">
    <PageHeader kicker="RESUMEN" title="Estado del soporte" actions={<button type="button" className="secondary-button" onClick={reload}>Actualizar</button>}>
      Tickets recibidos desde la página pública, clasificados y enrutados por el modelo.
    </PageHeader>
    <div className="metrics-grid">
      <MetricCard label="NUEVOS" value={integer(s.nuevo)} helper="Enrutados, sin asignar" icon="ticket"/>
      <MetricCard label="REVISIÓN MANUAL" value={integer(s.revision_manual)} helper="El modelo no pudo enrutarlos" accent="peach" icon="info"/>
      <MetricCard label="EN PROGRESO" value={integer((s.asignado || 0) + (s.en_progreso || 0))} helper={`${integer(s.asignado)} asignados · ${integer(s.en_progreso)} en curso`} accent="blue" icon="users"/>
      <MetricCard label="RESUELTOS HOY" value={integer(data.resueltos_hoy)} helper={`${integer(data.total)} tickets en total`} accent="green" icon="check"/>
    </div>
    <div className="dash-grid">
      <div className="detail-card">
        <div className="detail-header"><div><span className="overline">CARGA POR ÁREA</span><h3>Tickets abiertos</h3></div></div>
        <div className="bar-list">{data.por_area.map((a) => <div className="bar-row" key={a.id}>
          <span className="bar-label">{a.nombre}{!a.activa && <em className="chip muted-chip">inactiva</em>}</span>
          <div className="bar-track"><i style={{ width: `${(a.abiertos / maxOpen) * 100}%` }}/></div>
          <b>{integer(a.abiertos)}</b>
        </div>)}</div>
      </div>
      <div className="detail-card">
        <div className="detail-header"><div><span className="overline">CALIDAD DEL ENRUTAMIENTO</span><h3>Correcciones manuales</h3></div></div>
        <div className="big-stat">{data.tasa_correccion == null ? '—' : percent(data.tasa_correccion)}</div>
        <p className="muted small">{integer(data.corregidos)} de {integer(data.clasificados_por_modelo)} tickets clasificados por el modelo fueron reasignados a otra área por el administrador. Es una medida del sistema en uso; no se usa para reentrenar.</p>
        <Link className="text-link" to="/admin/tickets?estado=revision_manual">Ver cola de revisión manual ({integer(data.revision_manual)}) →</Link>
      </div>
    </div>
    <div className="detail-card">
      <div className="detail-header"><div><span className="overline">ACTIVIDAD</span><h3>Últimos tickets</h3></div><Link className="text-link" to="/admin/tickets">Ver todos →</Link></div>
      {data.ultimos.length ? <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Código</th><th>Cliente</th><th>Área</th><th>Estado</th><th>Empleado</th><th>Recibido</th></tr></thead>
        <tbody>{data.ultimos.map((t) => <tr key={t.id}><td><Link to={`/admin/tickets?id=${t.id}`}>{t.codigo}</Link></td><td>{t.cliente_nombre}</td><td>{t.area_nombre || '—'}</td><td><StateBadge state={t.estado}/></td><td>{t.empleado_nombre || '—'}</td><td>{dateTime(t.creado_en)}</td></tr>)}</tbody>
      </table></div> : <Empty title="Todavía no hay tickets">Envía una consulta desde <a href="/soporte" target="_blank" rel="noreferrer">/soporte</a> para ver el flujo completo.</Empty>}
    </div>
  </section>
}
