import React, { useRef, useState } from 'react'
import { LABELS, MODEL_NAMES, decimal, integer, percent } from './ui.jsx'

// Colores por modelo: primeras tres posiciones de la paleta categórica validada (todas las parejas).
export const MODEL_COLORS = { naive_bayes: 'var(--series-1)', logistic_regression: 'var(--series-2)', knn: 'var(--series-3)' }
const SHORT = { 'Atención al Cliente': 'At. Cliente', 'Soporte TI': 'Sop. TI' }
export const short = (label) => SHORT[label] || label

// Tooltip compartido: se posiciona respecto al contenedor del gráfico.
function useTip() {
  const ref = useRef(null)
  const [tip, setTip] = useState(null)
  const bind = (text) => ({
    onMouseMove: (e) => {
      const box = ref.current?.getBoundingClientRect()
      if (box) setTip({ text, x: e.clientX - box.left, y: e.clientY - box.top })
    },
    onMouseLeave: () => setTip(null),
    onFocus: (e) => {
      const box = ref.current?.getBoundingClientRect(), r = e.currentTarget.getBoundingClientRect()
      if (box) setTip({ text, x: r.left - box.left + r.width / 2, y: r.top - box.top })
    },
    onBlur: () => setTip(null),
    tabIndex: 0,
    'aria-label': text,
  })
  const node = tip && <div className="chart-tip" style={{ left: tip.x, top: tip.y }} role="tooltip">{tip.text}</div>
  return { ref, bind, node }
}

export function Legend({ items }) {
  return <div className="legend">{items.map((i) => <span key={i.key}><i style={{ background: i.color }}/>{i.label}</span>)}</div>
}

// Media ± desviación por modelo con la línea del umbral de la regla de una desviación estándar.
export function DotWhisker({ rows, threshold }) {
  const { ref, bind, node } = useTip()
  const values = rows.flatMap((r) => [r.mean - r.std, r.mean + r.std]).concat(threshold ?? [])
  const low = Math.floor((Math.min(...values) - 0.005) * 100) / 100
  const high = Math.min(1, Math.ceil((Math.max(...values) + 0.005) * 100) / 100)
  const x = (v) => `${((v - low) / (high - low)) * 100}%`
  const ticks = []
  const step = high - low > 0.06 ? 0.02 : 0.01
  for (let v = Math.ceil(low / step) * step; v <= high + 1e-9; v += step) ticks.push(Number(v.toFixed(2)))
  return <div className="dot-whisker" ref={ref}>
    {rows.map((r) => <div className="dw-row" key={r.key}>
      <span className="dw-label">{r.label}{r.selected && <b className="chip">Elegido</b>}</span>
      <div className="dw-track">
        {threshold != null && <span className="dw-threshold" style={{ left: x(threshold) }}/>}
        <span className="dw-whisker" style={{ left: x(r.mean - r.std), width: `calc(${x(r.mean + r.std)} - ${x(r.mean - r.std)})`, background: r.color }}/>
        <span className="dw-dot" style={{ left: x(r.mean), background: r.color }} {...bind(`${r.label}: F1 macro ${decimal(r.mean)} ± ${decimal(r.std)}`)}/>
      </div>
      <span className="dw-value">{decimal(r.mean)}</span>
    </div>)}
    <div className="dw-row dw-axis"><span/><div className="dw-track">{ticks.map((t) => <span key={t} style={{ left: x(t) }}>{decimal(t, 2)}</span>)}
      {threshold != null && <em style={{ left: x(threshold) }}>umbral {decimal(threshold)}</em>}</div><span/></div>
    {node}
  </div>
}

// Barras horizontales agrupadas: una fila por categoría, una barra por serie (escala 0-1).
export function GroupedBars({ categories, series, format = decimal, max = 1 }) {
  const { ref, bind, node } = useTip()
  return <div className="grouped-bars" ref={ref}>
    {categories.map((c) => <div className="gb-row" key={c.key}>
      <span className="gb-label">{c.label}</span>
      <div className="gb-bars">{series.map((s) => {
        const v = s.values[c.key]
        return <div className="gb-line" key={s.key}><span className="gb-bar" style={{ width: `${Math.max(0, (v ?? 0) / max) * 100}%`, background: s.color }} {...bind(`${c.label} · ${s.label}: ${format(v)}`)}/><b>{format(v)}</b></div>
      })}</div>
    </div>)}
    {node}
  </div>
}

// Matriz de confusión: filas = real, columnas = predicho; intensidad = % de la fila.
export function ConfusionMatrix({ matrix, labels = LABELS, mode = 'counts' }) {
  const { ref, bind, node } = useTip()
  const totals = matrix.map((row) => row.reduce((a, b) => a + b, 0))
  return <div className="cm-wrap" ref={ref}>
    <div className="cm" style={{ gridTemplateColumns: `minmax(86px, 1.2fr) repeat(${labels.length}, minmax(44px, 1fr))` }} role="table" aria-label="Matriz de confusión: filas real, columnas predicho">
      <div className="cm-corner" role="columnheader"><span>Real ↓</span><span>Predicho →</span></div>
      {labels.map((l) => <div className="cm-head" key={l} role="columnheader" title={l}>{short(l)}</div>)}
      {matrix.map((row, i) => <React.Fragment key={labels[i]}>
        <div className="cm-rowhead" role="rowheader" title={labels[i]}>{short(labels[i])}<small>{integer(totals[i])}</small></div>
        {row.map((v, j) => {
          const share = totals[i] ? v / totals[i] : 0
          const diag = i === j
          const text = diag ? `${integer(v)} de ${integer(totals[i])} mensajes de ${labels[i]} se clasificaron bien (${percent(share)})`
            : `${integer(v)} mensajes de ${labels[i]} se clasificaron como ${labels[j]} (${percent(share)} de la fila)`
          return <div key={j} role="cell" className={`cm-cell${diag ? ' diag' : ''}${share > 0.55 ? ' dark' : ''}${v === 0 ? ' zero' : ''}`}
            style={{ '--a': v === 0 ? 0 : 0.06 + share * 0.94 }} {...bind(text)}>
            {mode === 'counts' ? integer(v) : percent(share, share < 0.1 && share > 0 ? 1 : 0)}
          </div>
        })}
      </React.Fragment>)}
    </div>
    {node}
  </div>
}

// Histograma vertical (una sola serie).
export function Histogram({ bins, unit = 'mensajes', caption }) {
  const { ref, bind, node } = useTip()
  const max = Math.max(1, ...bins.map((b) => b.count))
  const total = bins.reduce((a, b) => a + b.count, 0)
  return <div className="histogram" ref={ref}>
    <div className="hist-plot">{bins.map((b) => <div className="hist-col" key={b.bin}>
      <span className="hist-value">{b.count ? integer(b.count) : ''}</span>
      <span className="hist-bar" style={{ height: `${(b.count / max) * 100}%` }} {...bind(`${b.bin} palabras: ${integer(b.count)} ${unit} (${percent(total ? b.count / total : 0)})`)}/>
    </div>)}</div>
    <div className="hist-axis">{bins.map((b) => <span key={b.bin}>{b.bin}</span>)}</div>
    {caption && <p className="chart-caption">{caption}</p>}
    {node}
  </div>
}

// Proporción de cada partición en una barra segmentada.
export function StackedShare({ items }) {
  const { ref, bind, node } = useTip()
  const total = items.reduce((a, b) => a + b.value, 0)
  return <div className="stacked" ref={ref}>
    <div className="stacked-bar">{items.map((i) => <span key={i.key} style={{ flexGrow: i.value, background: i.color }} {...bind(`${i.label}: ${integer(i.value)} (${percent(i.value / total)})`)}/>)}</div>
    <Legend items={items.map((i) => ({ ...i, label: `${i.label} · ${percent(i.value / total)}` }))}/>
    {node}
  </div>
}

export function modelSeries(models, valueOf) {
  return models.map((m) => ({ key: m, label: MODEL_NAMES[m], color: MODEL_COLORS[m], values: valueOf(m) }))
}
