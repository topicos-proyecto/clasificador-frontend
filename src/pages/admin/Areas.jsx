import React, { useState } from 'react'
import { request } from '../../api.js'
import { ErrorBox, Icon, Loading, Modal, PageHeader, integer, useResource } from '../../components/ui.jsx'

function AreaForm({ area, onClose, onSaved }) {
  const [form, setForm] = useState({ nombre: area?.nombre || '', descripcion: area?.descripcion || '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await request(area ? `/admin/areas/${area.id}` : '/admin/areas', { method: area ? 'PATCH' : 'POST', body: form })
      onSaved()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <Modal title={area ? 'Editar área' : 'Nueva área'} onClose={onClose}>
    <form onSubmit={submit} className="modal-form">
      <label className="field"><span>Nombre</span><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} maxLength={80} required autoFocus/></label>
      <label className="field"><span>Descripción</span><textarea className="short" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} maxLength={300}/></label>
      {!area && <p className="alert info">Las áreas nuevas solo reciben tickets por reasignación manual: el modelo conoce seis áreas.</p>}
      <ErrorBox error={error}/>
      <div className="form-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button><button type="button" className="text-button" onClick={onClose}>Cancelar</button></div>
    </form>
  </Modal>
}

export default function Areas() {
  const { data, error, loading, reload } = useResource(() => request('/admin/areas'))
  const [editing, setEditing] = useState(null)
  const [actionError, setActionError] = useState('')

  async function act(fn) {
    setActionError('')
    try { await fn(); reload() } catch (e) { setActionError(e.message) }
  }
  const toggle = (a) => act(() => request(`/admin/areas/${a.id}`, { method: 'PATCH', body: { activa: !a.activa } }))
  const remove = (a) => { if (window.confirm(`¿Eliminar el área «${a.nombre}»?`)) act(() => request(`/admin/areas/${a.id}`, { method: 'DELETE' })) }

  return <section className="section">
    <PageHeader kicker="ORGANIZACIÓN" title="Áreas" actions={<button className="primary-button" type="button" onClick={() => setEditing('new')}><Icon name="plus" size={16}/> Nueva área</button>}>
      Las seis áreas marcadas como «Asignable por el modelo» reciben tickets automáticamente. Si desactivas una, sus nuevos tickets van a revisión manual.
    </PageHeader>
    <ErrorBox error={error || actionError} onRetry={error ? reload : undefined}/>
    {loading && !data ? <Loading/> : data && <div className="detail-card flush"><div className="table-wrap"><table className="data-table">
      <thead><tr><th>Área</th><th>Origen</th><th className="num">Empleados activos</th><th className="num">Tickets abiertos</th><th className="num">Sin leer</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
      <tbody>{data.map((a) => <tr key={a.id} className={a.activa ? '' : 'inactive'}>
        <td><strong>{a.nombre}</strong>{a.descripcion && <small className="cell-sub">{a.descripcion}</small>}</td>
        <td>{a.asignable_por_modelo ? <span className="chip model-chip">Asignable por el modelo</span> : <span className="chip muted-chip">Solo manual</span>}</td>
        <td className="num">{integer(a.empleados_activos)}</td><td className="num">{integer(a.tickets_abiertos)}</td><td className="num">{integer(a.no_leidas)}</td>
        <td>{a.activa ? 'Activa' : 'Inactiva'}</td>
        <td className="row-actions">
          <button type="button" className="icon-button" onClick={() => setEditing(a)} aria-label={`Editar ${a.nombre}`}><Icon name="edit" size={16}/></button>
          <button type="button" className="secondary-button small" onClick={() => toggle(a)}>{a.activa ? 'Desactivar' : 'Activar'}</button>
          {!a.asignable_por_modelo && <button type="button" className="icon-button danger" onClick={() => remove(a)} aria-label={`Eliminar ${a.nombre}`}><Icon name="trash" size={16}/></button>}
        </td>
      </tr>)}</tbody></table></div></div>}
    {editing && <AreaForm area={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }}/>}
  </section>
}
