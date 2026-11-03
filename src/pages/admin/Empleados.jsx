import React, { useState } from 'react'
import { request } from '../../api.js'
import { Empty, ErrorBox, Icon, Loading, Modal, PageHeader, integer, useResource } from '../../components/ui.jsx'

function EmployeeForm({ employee, areas, onClose, onSaved }) {
  const [form, setForm] = useState({ nombre: employee?.nombre || '', email: employee?.email || '', cargo: employee?.cargo || '', area_id: employee?.area_id || areas.find((a) => a.activa)?.id || '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: k === 'area_id' ? Number(e.target.value) : e.target.value })
  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await request(employee ? `/admin/empleados/${employee.id}` : '/admin/empleados', { method: employee ? 'PATCH' : 'POST', body: form })
      onSaved()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <Modal title={employee ? 'Editar empleado' : 'Nuevo empleado'} onClose={onClose}>
    <form onSubmit={submit} className="modal-form">
      <label className="field"><span>Nombre completo</span><input value={form.nombre} onChange={set('nombre')} maxLength={120} required autoFocus/></label>
      <label className="field"><span>Correo</span><input type="email" value={form.email} onChange={set('email')} maxLength={200} required/></label>
      <div className="form-grid">
        <label className="field"><span>Área</span><select value={form.area_id} onChange={set('area_id')} required>{areas.map((a) => <option key={a.id} value={a.id} disabled={!a.activa}>{a.nombre}{a.activa ? '' : ' (inactiva)'}</option>)}</select></label>
        <label className="field"><span>Cargo</span><input value={form.cargo} onChange={set('cargo')} maxLength={120}/></label>
      </div>
      <ErrorBox error={error}/>
      <div className="form-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button><button type="button" className="text-button" onClick={onClose}>Cancelar</button></div>
    </form>
  </Modal>
}

export default function Empleados() {
  const [areaId, setAreaId] = useState('')
  const areas = useResource(() => request('/admin/areas'))
  const { data, error, loading, reload } = useResource(() => request('/admin/empleados', { params: { area_id: areaId } }), [areaId])
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')

  async function act(fn) {
    setActionError(''); setMessage('')
    try { const r = await fn(); if (r?.detalle) setMessage(r.detalle); reload() } catch (e) { setActionError(e.message) }
  }
  const toggle = (e) => act(() => request(`/admin/empleados/${e.id}`, { method: 'PATCH', body: { activo: !e.activo } }))
  const remove = (e) => { if (window.confirm(`¿Eliminar a ${e.nombre}?`)) act(() => request(`/admin/empleados/${e.id}`, { method: 'DELETE' })) }

  return <section className="section">
    <PageHeader kicker="ORGANIZACIÓN" title="Empleados" actions={<button className="primary-button" type="button" disabled={!areas.data} onClick={() => setEditing('new')}><Icon name="plus" size={16}/> Nuevo empleado</button>}>
      Personas que atienden los tickets de cada área. La columna de tickets abiertos muestra su carga actual.
    </PageHeader>
    <div className="filter-row"><select value={areaId} onChange={(e) => setAreaId(e.target.value)} aria-label="Filtrar por área"><option value="">Todas las áreas</option>{areas.data?.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></div>
    <ErrorBox error={error || actionError} onRetry={error ? reload : undefined}/>
    {message && <div className="alert info" role="status">{message}</div>}
    {loading && !data ? <Loading/> : data && (data.length ? <div className="detail-card flush"><div className="table-wrap"><table className="data-table">
      <thead><tr><th>Nombre</th><th>Correo</th><th>Área</th><th>Cargo</th><th className="num">Tickets abiertos</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
      <tbody>{data.map((e) => <tr key={e.id} className={e.activo ? '' : 'inactive'}>
        <td><strong>{e.nombre}</strong></td><td>{e.email}</td><td>{e.area_nombre}</td><td>{e.cargo || '—'}</td>
        <td className="num">{integer(e.tickets_abiertos)}</td><td>{e.activo ? 'Activo' : 'Inactivo'}</td>
        <td className="row-actions">
          <button type="button" className="icon-button" onClick={() => setEditing(e)} aria-label={`Editar ${e.nombre}`}><Icon name="edit" size={16}/></button>
          <button type="button" className="secondary-button small" onClick={() => toggle(e)}>{e.activo ? 'Desactivar' : 'Activar'}</button>
          <button type="button" className="icon-button danger" onClick={() => remove(e)} aria-label={`Eliminar ${e.nombre}`}><Icon name="trash" size={16}/></button>
        </td>
      </tr>)}</tbody></table></div></div> : <Empty icon="users" title="No hay empleados en esta área"/>)}
    {editing && areas.data && <EmployeeForm employee={editing === 'new' ? null : editing} areas={areas.data} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }}/>}
  </section>
}
