import React, { useState } from 'react'
import { request } from '../../api.js'
import { Icon, PageHeader, percent } from '../../components/ui.jsx'

const examples = ['No puedo iniciar sesión en mi cuenta', '¿Dónde está mi pedido?', 'Necesito una copia de mi factura', 'Quiero saber qué promociones tienen este mes']

function Tokens({ items, empty }) {
  return items?.length ? <div className="token-list">{items.map((item, i) => <span className="token" key={`${item}-${i}`}>{item}</span>)}</div> : <span className="muted small">{empty}</span>
}

export default function Laboratorio() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function classify(event) {
    event.preventDefault()
    if (!text.trim()) { setError('Escribe un mensaje antes de clasificar.'); return }
    setBusy(true); setError(''); setResult(null)
    try { setResult(await request('/predict', { method: 'POST', body: { text } })) }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const reset = () => { setText(''); setResult(null); setError('') }
  const ranks = result ? Object.entries(result.probabilities || {}).sort((a, b) => b[1] - a[1]) : []
  const best = ranks[0]?.[1]
  const trace = result?.preprocessing

  return <section className="section workspace">
    <PageHeader kicker="LABORATORIO" title="Analiza un mensaje">Prueba el modelo desplegado sin crear tickets y observa cada paso del procesamiento de lenguaje natural.</PageHeader>
    <div className="workspace-grid">
      <form className="input-card" onSubmit={classify}>
        <div className="card-head"><span className="icon-box lavender"><Icon name="message" size={19}/></span><div><h3>Mensaje del cliente</h3><p>Escribe una solicitud en español</p></div></div>
        <label className="sr-only" htmlFor="ticket">Mensaje del cliente</label>
        <textarea id="ticket" value={text} onChange={(e) => { setText(e.target.value); setError(''); if (result) setResult(null) }} maxLength={3000} placeholder="Por ejemplo: No puedo ingresar a mi cuenta desde la aplicación..."/>
        <div className="textarea-meta"><span>Describe el problema con tus propias palabras.</span><span>{text.length} / 3000</span></div>
        <div className="examples"><span>¿Necesitas una idea?</span><div className="example-list">{examples.map((example) => <button type="button" key={example} onClick={() => { setText(example); setResult(null); setError('') }}>{example}<Icon name="arrow" size={13}/></button>)}</div></div>
        {error && <div role="alert" className="alert error">{error}</div>}
        <div className="form-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Analizando...' : 'Clasificar mensaje'} <Icon name="arrow" size={17}/></button><button className="text-button" type="button" onClick={reset}>Limpiar</button></div>
      </form>
      <div className="result-card" aria-live="polite">
        <div className="result-head"><div><span className="overline">RESULTADO DEL ANÁLISIS</span><h3>Área sugerida</h3></div><span className="result-badge"><Icon name="spark" size={15}/> NLP</span></div>
        {!result && <div className="empty-result"><div className="empty-illustration"><span className="empty-icon"><Icon name="spark" size={27}/></span><span className="empty-dot one"/><span className="empty-dot two"/></div><strong>Aquí aparecerá el resultado</strong><p>Escribe un mensaje y descubre a qué área podría pertenecer.</p></div>}
        {result?.requires_clarification && <div className="clarification"><span className="clarification-icon"><Icon name="info" size={21}/></span><h4>Necesitamos más detalles</h4><p>{result.reason}</p><p className="muted small">En el flujo real, este ticket iría a revisión manual.</p></div>}
        {result && !result.requires_clarification && <div className="result-content">
          <div className="result-label"><span className="result-check"><Icon name="check" size={20}/></span><div><small>ÁREA DE ATENCIÓN INICIAL</small><strong>{result.label}</strong></div></div>
          <div className="probability-heading"><span>Probabilidades estimadas</span><strong>{best != null ? percent(best) : '—'}</strong></div>
          <div className="bar-large"><span style={{ width: `${(best || 0) * 100}%` }}/></div>
          <p className="probability-note">Estimación del modelo, no una certeza. Las probabilidades no están calibradas.</p>
          <div className="ranking">{ranks.slice(1).map(([name, value]) => <div className="rank-row" key={name}><span>{name}</span><div className="rank-bar"><i style={{ width: `${value * 100}%` }}/></div><b>{percent(value)}</b></div>)}</div>
        </div>}
        <div className="result-footer"><Icon name="info" size={15}/> La clasificación es una sugerencia de atención.</div>
      </div>
    </div>
    {trace ? <div className="process-panel"><div className="process-heading"><div><div className="section-kicker">PASO A PASO</div><h3>Así procesamos el mensaje</h3><p>Transformaciones reales del pipeline utilizado para la predicción.</p></div><span className="process-icon"><Icon name="spark" size={19}/></span></div>
      <div className="process-grid">
        <div><span className="step-number">01</span><h4>Normalización</h4><p className="normalized">{trace.normalized || '—'}</p></div>
        <div><span className="step-number">02</span><h4>Tokens</h4><Tokens items={trace.tokens} empty="Sin tokens"/></div>
        <div><span className="step-number">03</span><h4>Palabras retiradas</h4><Tokens items={trace.stopwords_removed} empty="No se retiraron palabras"/></div>
        <div><span className="step-number">04</span><h4>Raíces o lemas</h4><Tokens items={trace.tokens_transformed} empty="Sin términos finales"/></div>
      </div></div>
      : <div className="process-placeholder"><Icon name="spark" size={17}/><span>Después de clasificar, podrás explorar el procesamiento del mensaje.</span></div>}
  </section>
}
