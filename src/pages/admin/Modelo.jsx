import React, { useMemo, useState } from 'react'
import { request } from '../../api.js'
import { ConfusionMatrix, DotWhisker, GroupedBars, Histogram, Legend, MODEL_COLORS, StackedShare, modelSeries } from '../../components/charts.jsx'
import { ErrorBox, Icon, LABELS, Loading, MODEL_NAMES, MODEL_ORDER, MetricCard, PageHeader, configText, decimal, integer, percent, useResource } from '../../components/ui.jsx'

const SOURCES = [
  { key: 'oof', label: 'CV fuera de partición', help: 'Cada mensaje de entrenamiento predicho por un modelo que no lo vio (3 particiones). La fuente más estable.' },
  { key: 'validation', label: 'Validación SID', help: 'Partición de validación (194 mensajes; solo 4 de Marketing).' },
  { key: 'validation_real', label: 'Validación adicional', help: 'Segunda partición de validación SID.' },
  { key: 'simulated', label: 'Simulado con IA', help: '24 mensajes redactados con IA y revisados: exploratorio, no son mensajes humanos.' },
  { key: 'test', label: 'Prueba (test)', help: 'Evaluación única, posterior a la selección. No se usó para elegir.' },
]
const SPLITS = { train: 'Entrenamiento', validation: 'Validación', validation_real: 'Validación adicional', test: 'Prueba' }
const SPLIT_COLORS = { train: 'var(--seq-4)', validation: 'var(--seq-3)', validation_real: 'var(--seq-2)', test: 'var(--series-2)' }

function evaluationFor(models, test, model, source) {
  const f = models.finalists[model]
  if (!f) return null
  if (source === 'oof') return f.cv.out_of_fold
  if (source === 'test') return test?.estado === 'evaluado' ? test.finalists[model] : null
  return f.evaluations[source] || null
}

function Decision({ models }) {
  const sel = models.selected
  const best = models.best_by_mean
  const gap = best.f1_macro_mean - sel.f1_macro_mean
  const outside = MODEL_ORDER.filter((m) => models.finalists[m] && models.finalists[m].best_by_mean.f1_macro_mean < models.threshold - 1e-12)
  return <div className="decision-card">
    <span className="decision-icon"><Icon name="check" size={22}/></span>
    <div>
      <span className="overline">DECISIÓN</span>
      <h3>Se eligió {MODEL_NAMES[sel.model]} <small>({configText(sel)})</small></h3>
      <p>
        {best.model === sel.model && best.parameter_value === sel.parameter_value && best.method === sel.method
          ? <>Tiene la mayor media de F1 macro en validación cruzada: <b>{decimal(sel.f1_macro_mean)}</b> ± {decimal(sel.f1_macro_std)}.</>
          : <>La mejor media la obtuvo {MODEL_NAMES[best.model]} ({decimal(best.f1_macro_mean)}), pero la diferencia con {MODEL_NAMES[sel.model]} ({decimal(sel.f1_macro_mean)}) es de {decimal(gap)}, menor que una desviación estándar entre particiones ({decimal(best.f1_macro_std)}). Ambos son estadísticamente equivalentes y la regla fijada de antemano elige el más simple.</>}
        {outside.length > 0 && <> {outside.map((m) => MODEL_NAMES[m]).join(' y ')} queda{outside.length > 1 ? 'n' : ''} por debajo del umbral ({decimal(models.threshold)}).</>}
      </p>
      <details><summary>Regla de selección completa</summary><p className="muted small">{models.selection_rule}</p></details>
    </div>
  </div>
}

function ComparisonTable({ models, test }) {
  return <div className="table-wrap"><table className="data-table">
    <thead><tr><th>Modelo</th><th>Configuración</th><th className="num">F1 macro CV</th><th className="num">Exactitud CV</th><th className="num">F1 validación</th><th className="num">F1 simulado</th>{test?.estado === 'evaluado' && <th className="num">F1 test</th>}<th className="num">ms / 1000 msg.</th><th className="num">Tamaño</th></tr></thead>
    <tbody>{MODEL_ORDER.filter((m) => models.finalists[m]).map((m) => {
      const f = models.finalists[m]
      return <tr key={m} className={f.is_selected ? 'selected' : ''}>
        <td><span className="swatch" style={{ background: MODEL_COLORS[m] }}/><strong>{MODEL_NAMES[m]}</strong>{f.is_selected && <b className="chip model-chip">En producción</b>}</td>
        <td className="small">{configText(f.config)}</td>
        <td className="num">{decimal(f.cv.f1_macro_mean)} <small>± {decimal(f.cv.f1_macro_std)}</small></td>
        <td className="num">{percent(f.cv.out_of_fold?.accuracy)}</td>
        <td className="num">{decimal(f.evaluations.validation?.f1_macro)}</td>
        <td className="num">{decimal(f.evaluations.simulated?.f1_macro)}</td>
        {test?.estado === 'evaluado' && <td className="num">{decimal(test.finalists[m]?.f1_macro)}</td>}
        <td className="num">{integer(Math.round(f.cost.predict_ms_per_1000_pipeline))}</td>
        <td className="num">{decimal(f.cost.artifact_bytes / 1048576, 2)} MB</td>
      </tr>
    })}</tbody></table></div>
}

function Variants({ models }) {
  const cells = {}
  models.variants.forEach((v) => { cells[`${v.model}|${v.method}|${v.ngrams}`] = v.f1_macro_mean })
  const cols = [['stemming', 1, 'Stemming · 1'], ['stemming', 2, 'Stemming · 1-2'], ['lemmatization', 1, 'Lematización · 1'], ['lemmatization', 2, 'Lematización · 1-2']]
  return <div className="table-wrap"><table className="data-table compact-table">
    <thead><tr><th>Modelo</th>{cols.map(([, , l]) => <th key={l} className="num">{l}</th>)}</tr></thead>
    <tbody>{MODEL_ORDER.filter((m) => models.finalists[m]).map((m) => {
      const values = cols.map(([meth, n]) => cells[`${m}|${meth}|${n}`])
      const top = Math.max(...values.filter((v) => v != null))
      return <tr key={m}><td>{MODEL_NAMES[m]}</td>{values.map((v, i) => <td key={i} className={`num${v === top ? ' best-cell' : ''}`}>{decimal(v)}</td>)}</tr>
    })}</tbody></table></div>
}

function PerClassTable({ metrics }) {
  const rep = metrics.classification_report
  const worst = LABELS.reduce((a, b) => (rep[b]?.['f1-score'] ?? 1) < (rep[a]?.['f1-score'] ?? 1) ? b : a, LABELS[0])
  const cell = (v) => <td className="num bar-cell"><span style={{ width: `${(v ?? 0) * 100}%` }}/><b>{decimal(v, 3)}</b></td>
  return <div className="table-wrap"><table className="data-table per-class">
    <thead><tr><th>Área</th><th className="num">Precisión</th><th className="num">Recall</th><th className="num">F1</th><th className="num">Soporte</th></tr></thead>
    <tbody>
      {LABELS.map((l) => <tr key={l} className={l === worst ? 'worst' : ''}><td>{l}{l === worst && <b className="chip warn-chip">menor F1</b>}</td>{cell(rep[l]?.precision)}{cell(rep[l]?.recall)}{cell(rep[l]?.['f1-score'])}<td className="num">{integer(rep[l]?.support)}</td></tr>)}
      {[['macro avg', 'Promedio macro'], ['weighted avg', 'Promedio ponderado']].map(([k, label]) => <tr key={k} className="total-row"><td>{label}</td>{cell(rep[k]?.precision)}{cell(rep[k]?.recall)}{cell(rep[k]?.['f1-score'])}<td className="num">{integer(rep[k]?.support)}</td></tr>)}
      <tr className="total-row"><td>Exactitud</td><td/><td/>{cell(metrics.accuracy)}<td className="num">{integer(metrics.records)}</td></tr>
    </tbody></table></div>
}

function DataSection({ dataset }) {
  const splits = Object.keys(SPLITS).filter((k) => dataset.splits[k])
  const [lengthSplit, setLengthSplit] = useState('train')
  const train = dataset.splits.train
  const lengthData = dataset.splits[lengthSplit]
  return <>
    <div className="metrics-grid">
      {splits.map((k) => <MetricCard key={k} label={SPLITS[k].toUpperCase()} value={integer(dataset.splits[k].records)} icon="layers"
        helper={k === 'train' ? 'Validación cruzada y ajuste final' : k === 'test' ? 'Reservado: evaluación única' : 'Evaluación complementaria'} accent={k === 'test' ? 'peach' : k === 'train' ? '' : 'blue'}/>)}
    </div>
    <div className="detail-card">
      <div className="detail-header"><div><span className="overline">PARTICIONES</span><h3>Datos de entrenamiento y de prueba</h3></div></div>
      <StackedShare items={splits.map((k) => ({ key: k, label: SPLITS[k], value: dataset.splits[k].records, color: SPLIT_COLORS[k] }))}/>
    </div>
    <div className="detail-card">
      <div className="detail-header"><div><span className="overline">DISTRIBUCIÓN DE CLASES</span><h3>Mensajes por área y partición</h3></div></div>
      <p>Marketing es la clase minoritaria ({percent(train.class_share.Marketing)} del entrenamiento): por eso el criterio es F1 macro y no la exactitud.</p>
      <div className="table-wrap"><table className="data-table distribution">
        <thead><tr><th>Área</th>{splits.map((k) => <th key={k} className="num">{SPLITS[k]}</th>)}</tr></thead>
        <tbody>{LABELS.map((l) => <tr key={l} className={l === 'Marketing' ? 'highlight' : ''}><td>{l}</td>{splits.map((k) => {
          const share = dataset.splits[k].class_share[l]
          return <td key={k} className="num bar-cell"><span style={{ width: `${share * 100 / 0.4}%` }}/><b>{integer(dataset.splits[k].class_counts[l])}</b> <small>{percent(share)}</small></td>
        })}</tr>)}
        <tr className="total-row"><td>Total</td>{splits.map((k) => <td key={k} className="num">{integer(dataset.splits[k].records)}</td>)}</tr></tbody>
      </table></div>
      <p className="muted small">Las barras usan la misma escala en todas las columnas (40 % = ancho completo).</p>
    </div>
    <div className="detail-card">
      <div className="detail-header"><div><span className="overline">LONGITUD DE LOS TEXTOS</span><h3>Palabras por mensaje</h3></div>
        <div className="segmented" role="group" aria-label="Partición">{Object.keys(SPLITS).filter((k) => dataset.splits[k]?.words).map((k) => <button key={k} type="button" className={lengthSplit === k ? 'active' : ''} onClick={() => setLengthSplit(k)}>{SPLITS[k]}</button>)}</div></div>
      <div className="length-grid">
        <div>
          <Histogram bins={lengthData.words_histogram} caption={`${SPLITS[lengthSplit]}: ${integer(lengthData.records)} mensajes. Media ${decimal(lengthData.words.mean, 2)} palabras, mediana ${decimal(lengthData.words.median, 0)}, máximo ${lengthData.words.max}. Caracteres: media ${decimal(lengthData.chars.mean, 1)}.`}/>
          {dataset.preprocessing && <p className="muted small">Tras el preprocesamiento ({dataset.preprocessing.method === 'lemmatization' ? 'lematización' : 'stemming'}) quedan {decimal(dataset.preprocessing.tokens_per_message_train.mean, 2)} términos por mensaje en promedio; el vocabulario TF-IDF tiene {integer(dataset.preprocessing.vocabulary_size)} términos.</p>}
        </div>
        <div className="table-wrap"><table className="data-table compact-table">
          <thead><tr><th>Área</th><th className="num">Media</th><th className="num">Mediana</th><th className="num">Mín.</th><th className="num">Máx.</th><th className="num">P25</th><th className="num">P75</th></tr></thead>
          <tbody>{LABELS.map((l) => { const w = lengthData.words_by_class[l]; return <tr key={l}><td>{l}</td><td className="num">{decimal(w.mean, 2)}</td><td className="num">{decimal(w.median, 0)}</td><td className="num">{w.min ?? '—'}</td><td className="num">{w.max ?? '—'}</td><td className="num">{decimal(w.p25, 1)}</td><td className="num">{decimal(w.p75, 1)}</td></tr> })}</tbody>
        </table></div>
      </div>
      <p className="muted small">De la partición de prueba solo se cuentan etiquetas: sus textos no se procesan ni se miden.</p>
    </div>
  </>
}

export default function Modelo() {
  const models = useResource(() => request('/metrics/models'))
  const dataset = useResource(() => request('/metrics/dataset'))
  const test = useResource(() => request('/metrics/test'))
  const [model, setModel] = useState(null)
  const [source, setSource] = useState('oof')
  const [mode, setMode] = useState('counts')
  const m = models.data
  const active = model || m?.selected.model
  const sources = SOURCES.filter((s) => m && evaluationFor(m, test.data, active, s.key))
  const metrics = m && evaluationFor(m, test.data, active, source)
  const available = useMemo(() => m ? MODEL_ORDER.filter((x) => m.finalists[x]) : [], [m])

  if (models.loading && !m) return <Loading label="Cargando métricas…"/>
  if (models.error) return <ErrorBox error={models.error} onRetry={models.reload}/>

  const grouped = m.grouped_sensitivity?.finalists || []
  return <section className="section model-page">
    <PageHeader kicker="RENDIMIENTO" title="¿Por qué este modelo?" actions={<span className="evaluation-badge"><Icon name="info" size={15}/> {integer(m.n_configurations)} configuraciones · CV {m.folds} particiones · semilla {m.seed}</span>}>
      Comparación de Naive Bayes, Regresión Logística y KNN con el mismo preprocesamiento, las mismas particiones y la misma regla de selección.
    </PageHeader>
    <Decision models={m}/>

    <h3 className="block-title"><span>01</span> Comparación de los tres modelos</h3>
    <div className="detail-card">
      <div className="detail-header"><div><span className="overline">VALIDACIÓN CRUZADA</span><h3>F1 macro: media ± una desviación estándar</h3></div><Legend items={available.map((x) => ({ key: x, label: MODEL_NAMES[x], color: MODEL_COLORS[x] }))}/></div>
      <p>Cada punto es la media de las tres particiones y la barra, ± una desviación. La línea discontinua es el umbral: <b>mejor media − su desviación</b>. Los modelos a la derecha del umbral son equivalentes y se elige el más simple. Eje ampliado para ver las diferencias.</p>
      <DotWhisker threshold={m.threshold} rows={available.map((x) => ({ key: x, label: MODEL_NAMES[x], mean: m.finalists[x].cv.f1_macro_mean, std: m.finalists[x].cv.f1_macro_std, color: MODEL_COLORS[x], selected: m.finalists[x].is_selected }))}/>
    </div>
    <div className="detail-card flush-table"><div className="detail-header"><div><span className="overline">RESUMEN</span><h3>Métricas y costo por modelo</h3></div></div>
      <ComparisonTable models={m} test={test.data}/>
      <p className="muted small pad">«ms / 1000 msg.» incluye la tokenización: la lematización con spaCy es mucho más lenta que el stemming. Exactitud CV = predicciones fuera de partición.</p>
    </div>
    <div className="two-col">
      <div className="detail-card"><div className="detail-header"><div><span className="overline">PREPROCESAMIENTO</span><h3>Mejor F1 macro CV por variante</h3></div></div>
        <p>Stemming frente a lematización y unigramas frente a unigramas + bigramas (resaltada la mejor de cada modelo).</p><Variants models={m}/></div>
      {grouped.length > 0 && <div className="detail-card"><div className="detail-header"><div><span className="overline">SENSIBILIDAD</span><h3>Intenciones nunca vistas</h3></div><Legend items={[{ key: 'cv', label: 'CV estratificado', color: 'var(--seq-4)' }, { key: 'g', label: 'CV agrupado por intención', color: 'var(--seq-2)' }]}/></div>
        <p>Cada partición deja fuera intenciones completas ({m.grouped_sensitivity.n_groups}). Mide cuánto depende cada modelo de memorizar plantillas.</p>
        <GroupedBars categories={grouped.map((g) => ({ key: g.model, label: MODEL_NAMES[g.model] }))}
          series={[{ key: 'cv', label: 'CV estratificado', color: 'var(--seq-4)', values: Object.fromEntries(grouped.map((g) => [g.model, g.f1_macro_mean])) },
            { key: 'g', label: 'CV agrupado', color: 'var(--seq-2)', values: Object.fromEntries(grouped.map((g) => [g.model, g.grouped_f1_macro_mean])) }]}/>
      </div>}
    </div>

    <h3 className="block-title"><span>02</span> Matriz de confusión y métricas por clase</h3>
    <div className="controls">
      <div className="segmented" role="group" aria-label="Modelo">{available.map((x) => <button key={x} type="button" className={active === x ? 'active' : ''} onClick={() => setModel(x)}><span className="swatch" style={{ background: MODEL_COLORS[x] }}/>{MODEL_NAMES[x]}{m.finalists[x].is_selected && ' ★'}</button>)}</div>
      <label className="inline-field">Datos <select value={source} onChange={(e) => setSource(e.target.value)}>{SOURCES.map((s) => <option key={s.key} value={s.key} disabled={!sources.includes(s)}>{s.label}{!sources.includes(s) ? ' (no disponible)' : ''}</option>)}</select></label>
      <div className="segmented" role="group" aria-label="Valores"><button type="button" className={mode === 'counts' ? 'active' : ''} onClick={() => setMode('counts')}>Conteos</button><button type="button" className={mode === 'row' ? 'active' : ''} onClick={() => setMode('row')}>% por fila</button></div>
    </div>
    <p className="muted small">{SOURCES.find((s) => s.key === source)?.help} Configuración: {configText(m.finalists[active].config)}.</p>
    {metrics ? <div className="two-col wide-left">
      <div className="detail-card"><div className="detail-header"><div><span className="overline">REAL VS. PREDICHO</span><h3>Matriz de confusión</h3></div></div>
        <p>Filas: área real. Columnas: área que predijo el modelo. La diagonal son aciertos; pasa el cursor por una celda para ver el detalle.</p>
        <ConfusionMatrix matrix={metrics.confusion_matrix} labels={metrics.confusion_matrix_labels} mode={mode}/>
        <div className="mini-stats"><span>Exactitud <b>{percent(metrics.accuracy)}</b></span><span>F1 macro <b>{decimal(metrics.f1_macro)}</b></span><span>Exactitud balanceada <b>{decimal(metrics.balanced_accuracy)}</b></span><span>{integer(metrics.records)} mensajes</span></div>
      </div>
      <div className="detail-card"><div className="detail-header"><div><span className="overline">POR CLASE</span><h3>Precisión, recall, F1 y soporte</h3></div></div>
        <p><b>Precisión</b>: de lo que el modelo envió a un área, cuánto era correcto. <b>Recall</b>: de lo que pertenecía al área, cuánto encontró. <b>Soporte</b>: mensajes reales de esa área.</p>
        <PerClassTable metrics={metrics}/>
      </div>
    </div> : <ErrorBox error="No hay datos para esta combinación."/>}
    <div className="detail-card">
      <div className="detail-header"><div><span className="overline">LADO A LADO</span><h3>F1 por área en los tres modelos · {SOURCES.find((s) => s.key === source)?.label}</h3></div><Legend items={available.map((x) => ({ key: x, label: MODEL_NAMES[x], color: MODEL_COLORS[x] }))}/></div>
      <GroupedBars categories={LABELS.map((l) => ({ key: l, label: l }))}
        series={modelSeries(available.filter((x) => evaluationFor(m, test.data, x, source)), (x) => Object.fromEntries(LABELS.map((l) => [l, evaluationFor(m, test.data, x, source).classification_report[l]?.['f1-score']])))} format={(v) => decimal(v, 3)}/>
    </div>

    <h3 className="block-title"><span>03</span> Los datos</h3>
    {dataset.error ? <ErrorBox error={dataset.error} onRetry={dataset.reload}/> : dataset.data ? <DataSection dataset={dataset.data}/> : <Loading/>}

    <h3 className="block-title"><span>04</span> Cómo leer estas cifras</h3>
    <div className="notes-grid">
      <div className="note"><strong>F1 macro, no exactitud</strong><p>Con Marketing en ~2,5 %, un modelo que nunca lo predijera seguiría teniendo ~97,5 % de exactitud. F1 macro da el mismo peso a las seis áreas.</p></div>
      <div className="note"><strong>Datos mayormente sintéticos</strong><p>SID contiene variantes casi idénticas entre particiones: las cifras en SID son optimistas. El CV agrupado y el conjunto simulado son más realistas.</p></div>
      <div className="note"><strong>Probabilidades no calibradas</strong><p>La «confianza» es una estimación del modelo; en KNN es la fracción de vecinos, con valores discretos.</p></div>
      <div className="note"><strong>Prueba evaluada una sola vez</strong><p>{test.data?.estado === 'evaluado' ? `La partición de prueba (${integer(test.data.records)} mensajes) se evaluó una vez, después de fijar la selección, y no cambió la decisión.` : 'La partición de prueba sigue reservada: evaluación final pendiente.'}</p></div>
    </div>
  </section>
}
