import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Activity, ArrowDownToLine, ArrowRight, BookOpen, Bot, Braces, Check, CheckCircle2, ChevronDown, Circle, CircleAlert, Clock3, Code2, Database, FileCheck2, FileCode2, FileText, GitBranch, Github, GitPullRequest, Layers3, LoaderCircle, Play, Plug, Search, ShieldCheck, Sparkles, Terminal, Upload, WandSparkles, Workflow, X } from 'lucide-react'

export const icons = { requirements: Layers3, testcases: FileCheck2, scripts: Code2, execution: Play, healing: WandSparkles, jira: Layers3, ado: Workflow, confluence: BookOpen, github: Github, postgres: Database, splunk: Terminal, custom: Plug, build: Braces, test: FileCheck2, sast: ShieldCheck, dast: Search, deploy: Upload }

export function Brand({ compact = false }) {
  return <div className={`brand ${compact ? 'compact' : ''}`}><span className="brand-mark"><Layers3 size={23} strokeWidth={2.5} /></span><span>Quality<span className="brand-light">OS</span><small>QA AGENT STUDIO</small></span></div>
}

export function IconBox({ id, color = 'purple', size = 21 }) {
  const Icon = icons[id] || Bot
  const style = typeof color === 'string' && color.startsWith('#') ? { backgroundColor: `${color}20`, color, boxShadow: `0 0 0 1px ${color}40` } : {}
  return <span className={`icon-box ${typeof color === 'string' && !color.startsWith('#') ? color : ''}`} style={style}><Icon size={size} /></span>
}

export function Badge({ status, children, dot = true }) {
  const value = String(status || 'ready').toLowerCase()
  const tone = ['passed', 'completed', 'applied', 'merged', 'approved', 'active', 'indexed'].includes(value) ? 'success' : ['failed', 'error'].includes(value) ? 'danger' : ['pending', 'warning', 'review', 'ready'].includes(value) ? 'warning' : ['running', 'open', 'configured'].includes(value) ? 'info' : 'neutral'
  return <span className={`badge ${tone}`}>{dot && <span className="status-dot" />}{children || value.replaceAll('_', ' ')}</span>
}

export function Button({ children, variant = 'primary', className = '', loading = false, icon: Icon, ...props }) {
  return <button className={`button ${variant} ${className}`} {...props} disabled={props.disabled || loading}>{loading ? <LoaderCircle size={16} className="spin" /> : Icon ? <Icon size={16} /> : null}{children}</button>
}

export function EmptyState({ icon: Icon = FileText, title, description, children }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={28} /></span><h3>{title}</h3><p>{description}</p>{children}</div>
}

export function PageHeading({ eyebrow, title, description, children }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1><p>{description}</p></div><div className="heading-actions">{children}</div></div>
}

export function Panel({ title, subtitle, action, children, className = '' }) {
  return <section className={`panel ${className}`}>{title && <div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>}{children}</section>
}

export function Modal({ title, subtitle, children, onClose, wide = false }) {
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const element = ref.current
    const focusable = () => Array.from(element.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]'))
    focusable()[0]?.focus()
    function keydown(event) {
      if (event.key === 'Escape') closeRef.current()
      if (event.key === 'Tab') {
        const items = focusable()
        const first = items[0]
        const last = items.at(-1)
        if (!items.length) { event.preventDefault(); element.focus(); return }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', keydown)
      previous?.focus()
    }
  }, [])
  return createPortal(<div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={ref} tabIndex={-1}><header className="modal-header"><div><h2 id="modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></header>{children}</section></div>, document.body)
}

export function ActivityList({ items, compact = false }) {
  return <div className={`activity-list ${compact ? 'compact' : ''}`}>{items.map(item => <div className="activity-item" key={item.id}><span className={`activity-dot ${item.type === 'error' ? 'red' : item.type === 'success' ? 'green' : ''}`}><Activity size={13} /></span><div><strong>{item.title}</strong><p>{item.detail}</p></div><time>{formatTime(item.time)}</time></div>)}</div>
}

export function formatTime(value) {
  if (!value) return 'Not run yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export function downloadFile(name, content, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name.replace(/[^a-zA-Z0-9._-]/g, '-')
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function SubAgentCard({ subAgent, run }) {
  return <article className="sub-agent-card"><span className="sub-agent-accent" style={{ background: subAgent.color }} /><div><strong>{subAgent.name}</strong><p>{subAgent.description}</p><small>{run ? `Latest: ${formatDate(run.time)} at ${formatTime(run.time)}` : 'No runs yet'}</small></div><div className="sub-agent-cost"><b>{run?.tokens ?? subAgent.tokenCost}</b><span>tokens</span></div></article>
}

export function Field({ label, children, hint }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}

export function DemoNotice({ children }) {
  return <div className="demo-notice"><ShieldCheck size={17} /><span>{children || 'Local demo workspace. Agent output, execution, security scans, deployments, and pull requests are simulated.'}</span></div>
}

export function SearchField({ value, onChange, placeholder = 'Search…' }) {
  return <div className="search-field"><Search size={17} /><input aria-label={placeholder} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />{value && <button className="icon-button" aria-label="Clear search" onClick={() => onChange('')}><X size={15} /></button>}</div>
}

export function CodeBlock({ code, name, onDownload }) {
  return <div className="code-block"><div className="code-header"><span><FileCode2 size={15} />{name}</span>{onDownload && <button className="icon-button" aria-label={`Download ${name}`} onClick={onDownload}><ArrowDownToLine size={16} /></button>}</div><pre><code>{code}</code></pre></div>
}

export function Lifecycle({ pipeline = false, current = -1, onSelect }) {
  const steps = pipeline ? [['build', 'Build'], ['test', 'Test'], ['sast', 'SAST'], ['dast', 'DAST'], ['deploy', 'Deploy']] : [['requirements', 'Requirements'], ['testcases', 'Test design'], ['scripts', 'Automation'], ['execution', 'Execution'], ['healing', 'Self-healing']]
  return <div className="lifecycle">{steps.map(([id, name], index) => <div className="lifecycle-segment" key={id}><button className={`lifecycle-step ${index < current ? 'complete' : ''} ${index === current ? 'current' : ''}`} onClick={() => onSelect?.(id)} disabled={!onSelect}><span>{index < current ? <Check size={16} /> : index + 1}</span><div><strong>{name}</strong><small>{pipeline ? index < current ? 'Demo passed' : index === current ? 'Simulating…' : 'Pending' : ['Import & analyze', 'Generate coverage', 'Design scripts', 'Run test suites', 'Adapt & improve'][index]}</small></div></button>{index !== steps.length - 1 && <ArrowRight size={16} className="lifecycle-arrow" />}</div>)}</div>
}
