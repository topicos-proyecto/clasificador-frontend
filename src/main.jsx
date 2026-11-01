import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const examples = ['No puedo iniciar sesión en mi cuenta', '¿Dónde está mi pedido?', 'Necesito una copia de mi factura']
const names = { naive_bayes: 'Naive Bayes', logistic_regression: 'Regresión logística' }
const percent = (value) => `${(Number(value) * 100).toFixed(1)}%`

function Icon({ name, size = 20, ...props }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    chart: <><path d="M4 20h16M6 16v-5M12 16V5M18 16V9"/></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M4 5v15M8 7h8M8 11h8"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    spark: <><path d="m12 3 1.8 5.5L19 10l-5.2 1.7L12 17l-1.8-5.3L5 10l5.2-1.5zM19 16l.7 2.2L22 19l-2.3.8L19 22l-.7-2.2L16 19l2.3-.8z"/></>,
    message: <><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    refresh: <><path d="M20 11a8 8 0 1 0-2.4 5.7"/><path d="M20 5v6h-6"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}

async function request(path, options) {
  let response
  try { response = await fetch(`/api${path}`, options) }
  catch { throw new Error('No se pudo conectar con la API. Comprueba que esté iniciada en el puerto 8000.') }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : response.status >= 500
      ? 'No se pudo conectar con la API. Comprueba que esté iniciada en el puerto 8000.'
      : 'Revisa el mensaje e inténtalo de nuevo.'
    throw new Error(detail)
  }
  return data
}

function MetricCard({ label, value, helper, accent }) {
  return <div className="metric-card"><span className="metric-label">{label}</span><div className="metric-number">{value ?? '—'}<span className={`metric-icon ${accent || ''}`}><Icon name="chart" size={17}/></span></div><span className="metric-helper">{helper}</span></div>
}

function Tokens({ items, empty }) {
  return items?.length ? <div className="token-list">{items.map((item, i) => <span className="token" key={`${item}-${i}`}>{item}</span>)}</div> : <span className="muted small">{empty}</span>
}

function App() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [predictionError, setPredictionError] = useState('')
  const [status, setStatus] = useState('checking')
  const [metrics, setMetrics] = useState(null)
  const [metricsError, setMetricsError] = useState('')
  const [activeView, setActiveView] = useState('clasificador')

  async function refresh() {
    setStatus('checking')
    const [health, stats] = await Promise.allSettled([request('/health'), request('/metrics')])
    setStatus(health.status === 'fulfilled' ? 'online' : 'offline')
    if (stats.status === 'fulfilled') { setMetrics(stats.value); setMetricsError('') }
    else { setMetrics(null); setMetricsError(stats.reason.message) }
  }
  useEffect(() => { refresh() }, [])

  async function classify(event) {
    event.preventDefault()
    if (!text.trim()) { setPredictionError('Escribe un mensaje antes de clasificar.'); return }
    setBusy(true); setPredictionError(''); setResult(null)
    try {
      const data = await request('/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      setResult(data); setStatus('online')
    } catch (error) { setPredictionError(error.message) }
    finally { setBusy(false) }
  }
  function reset() { setText(''); setResult(null); setPredictionError('') }
  const ranks = result ? Object.entries(result.probabilities || {}).sort((a, b) => b[1] - a[1]) : []
  const human = metrics?.human_clients
  const comparison = metrics?.model_comparison || []
  const activeModel = metrics?.selection
  const bestClass = ranks[0]?.[1]
  const showTokens = result?.preprocessing
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#inicio" onClick={() => setActiveView('clasificador')}><span className="brand-mark">e<span>.</span></span><span><strong>enlace</strong><small>INTELIGENCIA DE TICKETS</small></span></a>
      <div className="sidebar-section">ESPACIO DE TRABAJO</div>
      <nav className="nav" aria-label="Navegación principal">
        <a className={activeView === 'clasificador' ? 'active' : ''} href="#clasificador" onClick={() => setActiveView('clasificador')}><Icon name="grid" size={18}/> Clasificador <Icon className="nav-arrow" name="chevron" size={15}/></a>
        <a className={activeView === 'metricas' ? 'active' : ''} href="#metricas" onClick={() => setActiveView('metricas')}><Icon name="chart" size={18}/> Métricas</a>
        <a className={activeView === 'proceso' ? 'active' : ''} href="#proceso" onClick={() => setActiveView('proceso')}><Icon name="book" size={18}/> Cómo funciona</a>
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><span className="note-spark"><Icon name="spark" size={17}/></span><strong>Una mejor atención<br/>empieza aquí.</strong><p>Explora cómo el lenguaje ayuda a conectar cada solicitud con el área correcta.</p></div><div className="project-label"><span className="project-avatar">TP</span><span><strong>Proyecto integrador</strong><small>NLP · Machine Learning</small></span><span className="project-dot">···</span></div></div>
    </aside>
    <main id="inicio" className="main">
      <header className="topbar"><div className="breadcrumb">Espacio de trabajo <Icon name="chevron" size={13}/> <strong>Clasificador</strong></div><button className="status-button" type="button" onClick={refresh} title="Comprobar conexión" aria-label="Comprobar conexión con la API"><span className={`status-dot ${status}`}/>{status === 'online' ? 'API conectada' : status === 'checking' ? 'Comprobando' : 'API desconectada'}<Icon name="refresh" size={14}/></button></header>
      <div className="page-body">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/> TU ESPACIO DE CLASIFICACIÓN</div><h1>Cada mensaje,<br/><span>en el lugar correcto.</span></h1><p>Clasifica solicitudes de clientes y descubre cómo el modelo interpreta cada mensaje.</p></div><div className="heading-art" aria-hidden="true"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-card art-card-back"><span/><span/><span/></div><div className="art-card art-card-front"><Icon name="message" size={25}/><i/><i/></div><div className="art-spark"><Icon name="spark" size={20}/></div><span className="art-point point-one"/><span className="art-point point-two"/></div></div>
        <section id="clasificador" className="section workspace">
          <div className="section-title"><div><div className="section-kicker">01 / CLASIFICADOR</div><h2>Analiza un mensaje</h2><p>Ingresa una solicitud para identificar el área de atención inicial.</p></div><span className="version-badge"><span/> MODELO EXPLORATORIO</span></div>
          <div className="workspace-grid"><form className="input-card" onSubmit={classify}><div className="card-head"><span className="icon-box lavender"><Icon name="message" size={19}/></span><div><h3>Mensaje del cliente</h3><p>Escribe una solicitud en español</p></div></div><label className="sr-only" htmlFor="ticket">Mensaje del cliente</label><textarea id="ticket" value={text} onChange={(e) => { setText(e.target.value); setPredictionError(''); if (result) setResult(null) }} maxLength={3000} placeholder="Por ejemplo: No puedo ingresar a mi cuenta desde la aplicación..."/><div className="textarea-meta"><span>Describe el problema con tus propias palabras.</span><span>{text.length} / 3000</span></div><div className="examples"><span>¿Necesitas una idea?</span><div className="example-list">{examples.map(example => <button type="button" key={example} onClick={() => { setText(example); setResult(null); setPredictionError('') }}>{example}<Icon name="arrow" size={13}/></button>)}</div></div>{predictionError && <div role="alert" className="alert error">{predictionError}</div>}<div className="form-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Analizando...' : 'Clasificar mensaje'} <Icon name="arrow" size={17}/></button><button className="text-button" type="button" onClick={reset}>Limpiar</button></div></form>
          <div className="result-card" aria-live="polite"><div className="result-head"><div><span className="overline">RESULTADO DEL ANÁLISIS</span><h3>Área sugerida</h3></div><span className="result-badge"><Icon name="spark" size={15}/> NLP</span></div>{!result && <div className="empty-result"><div className="empty-illustration"><span className="empty-icon"><Icon name="spark" size={27}/></span><span className="empty-dot one"/><span className="empty-dot two"/></div><strong>Aquí aparecerá el resultado</strong><p>Escribe un mensaje y descubre a qué área podría pertenecer.</p></div>}{result?.requires_clarification && <div className="clarification"><span className="clarification-icon"><Icon name="info" size={21}/></span><h4>Necesitamos más detalles</h4><p>{result.reason}</p></div>}{result && !result.requires_clarification && <div className="result-content"><div className="result-label"><span className="result-check"><Icon name="check" size={20}/></span><div><small>ÁREA DE ATENCIÓN INICIAL</small><strong>{result.label}</strong></div></div><div className="probability-heading"><span>Probabilidades estimadas</span><strong>{bestClass != null ? percent(bestClass) : '—'}</strong></div><div className="bar-large"><span style={{ width: `${(bestClass || 0) * 100}%` }}/></div><p className="probability-note">Estimación del modelo, no una certeza. Las probabilidades no están calibradas.</p><div className="ranking">{ranks.slice(1).map(([name, value]) => <div className="rank-row" key={name}><span>{name}</span><div className="rank-bar"><i style={{width: `${value * 100}%`}}/></div><b>{percent(value)}</b></div>)}</div></div>}<div className="result-footer"><Icon name="info" size={15}/> La clasificación es una sugerencia de atención.</div></div></div>
          {showTokens && <div id="proceso" className="process-panel"><div className="process-heading"><div><div className="section-kicker">PASO A PASO</div><h3>Así procesamos el mensaje</h3><p>Transformaciones reales del pipeline utilizado para la predicción.</p></div><span className="process-icon"><Icon name="spark" size={19}/></span></div><div className="process-grid"><div><span className="step-number">01</span><h4>Normalización</h4><p className="normalized">{showTokens.normalized || '—'}</p></div><div><span className="step-number">02</span><h4>Tokens</h4><Tokens items={showTokens.tokens} empty="Sin tokens"/></div><div><span className="step-number">03</span><h4>Palabras retiradas</h4><Tokens items={showTokens.stopwords_removed} empty="No se retiraron palabras"/></div><div><span className="step-number">04</span><h4>Raíces o lemas</h4><Tokens items={showTokens.tokens_transformed} empty="Sin términos finales"/></div></div></div>}
          {!showTokens && <div id="proceso" className="process-placeholder"><Icon name="spark" size={17}/><span>Después de clasificar, podrás explorar el procesamiento del mensaje.</span></div>}
        </section>
        <section id="metricas" className="section metrics-section"><div className="section-title metrics-title"><div><div className="section-kicker">02 / RENDIMIENTO</div><h2>El modelo en números</h2><p>Una mirada a los resultados de la evaluación disponible.</p></div><span className="evaluation-badge"><Icon name="info" size={15}/> Resultados exploratorios</span></div>
          {metricsError && <div role="status" className="alert warning">No se pudieron cargar las métricas. {metricsError}</div>}
          <div className="metrics-grid"><MetricCard label="F1 MACRO · VALIDACIÓN" value={metrics ? percent(metrics.validation.f1_macro) : null} helper="Partición de validación SID"/><MetricCard label="F1 MACRO · CLIENTES" value={human ? percent(human.f1_macro) : null} helper={human ? `${human.records} mensajes humanos` : 'Evaluación humana no disponible'} accent="peach"/><MetricCard label="ÁREAS DE ATENCIÓN" value={metrics ? String(metrics.validation.confusion_matrix_labels.length).padStart(2, '0') : null} helper="Categorías disponibles" accent="blue"/><MetricCard label="MODELO SELECCIONADO" value={activeModel ? names[activeModel.model] || activeModel.model : null} helper={activeModel ? `${activeModel.method === 'lemmatization' ? 'Lematización' : 'Stemming'} · ${activeModel.ngrams === 1 ? 'unigramas' : 'uni + bigramas'}` : 'Sin información disponible'} accent="green"/></div>
          <div className="metrics-detail"><div className="detail-card"><div className="detail-header"><div><span className="overline">VALIDACIÓN CRUZADA</span><h3>Comparación de modelos</h3></div><span className="detail-icon"><Icon name="chart" size={18}/></span></div><p>Mejor F1 macro por modelo en los experimentos de entrenamiento.</p>{comparison.length ? <div className="comparison-list">{comparison.map(item => <div className="comparison-row" key={item.model}><div><strong>{names[item.model] || item.model}</strong><span>{item.method === 'lemmatization' ? 'Lematización' : 'Stemming'} · {item.ngrams === 1 ? 'unigramas' : 'uni + bigramas'}</span></div><div className="comparison-track"><i style={{width: `${item.f1_macro_mean * 100}%`}}/></div><b>{percent(item.f1_macro_mean)}</b></div>)}</div> : <div className="no-metrics">Comparación no disponible.</div>}</div><div className="detail-card class-card"><div className="detail-header"><div><span className="overline">EVALUACIÓN HUMANA</span><h3>F1 por área</h3></div><span className="detail-icon peach"><Icon name="grid" size={18}/></span></div><p>Una muestra pequeña de clientes; úsala como referencia exploratoria.</p>{human ? <div className="class-list">{human.confusion_matrix_labels.map(name => <div className="class-row" key={name}><span><i/> {name}</span><b>{percent(human.classification_report[name]?.['f1-score'] ?? 0)}</b></div>)}</div> : <div className="no-metrics">Evaluación humana no disponible.</div>}</div></div>
          <div className="metrics-disclaimer"><Icon name="info" size={17}/><p>Los resultados provienen de conjuntos distintos y de una muestra humana pequeña. No representan una garantía de desempeño en producción.</p></div>
        </section>
        <footer><span><strong>enlace</strong> <span> / Clasificador de tickets</span></span><span>Proyecto integrador · NLP &amp; Machine Learning</span></footer>
      </div>
    </main>
  </div>
}

createRoot(document.getElementById('root')).render(<App />)
