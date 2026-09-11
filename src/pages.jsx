export { GovernancePage } from './governance.jsx'
import { useState } from 'react'
import { ArrowLeft, Check, ChevronRight, FileText, GitPullRequest, Play, Plus, Save, Trash2, Upload, WandSparkles } from 'lucide-react'
import { AGENTS, CONNECTOR_CATALOG, SUB_AGENTS, canRunAgent, getAgentBlockReason, getMetrics, getPipelineBlockReason } from './model.js'
import { Badge, Button, CodeBlock, DemoNotice, EmptyState, Field, IconBox, Lifecycle, Modal, PageHeading, Panel, SearchField, SubAgentCard, downloadFile, formatDate, formatTime } from './components.jsx'

function RequirementForm({ act, notify, onDone }) {
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('Manual')
  const [priority, setPriority] = useState('Medium')
  const [description, setDescription] = useState('')
  function submit(event) {
    event.preventDefault()
    if (!title.trim()) return
    if (act({ type: 'ADD_REQUIREMENT', title, source, priority, description })) {
      notify('Requirement added.')
      setTitle('')
      setDescription('')
      if (onDone) onDone()
    }
  }
  return (
    <form onSubmit={submit} className="requirement-form">
      <Field label="Title"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Secure mobile checkout" required /></Field>
      <div className="form-row">
        <Field label="Source">
          <select value={source} onChange={e => setSource(e.target.value)}>
            <option>Manual</option><option>Jira</option><option>Azure DevOps</option><option>Confluence</option>
          </select>
        </Field>
        <Field label="Priority">
          <select value={priority} onChange={e => setPriority(e.target.value)}>
            <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
          </select>
        </Field>
      </div>
      <Field label="Description"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Short description of the requirement" /></Field>
      <Button type="submit" icon={Plus}>Add requirement</Button>
    </form>
  )
}

function AgentArtifacts({ agent, state }) {
  if (agent.id === 'requirements') {
    return state.requirements.length === 0
      ? <EmptyState icon={FileText} title="No requirements" description="Add a requirement or run the Requirements agent." />
      : <div className="artifact-list">{state.requirements.map(item => <div key={item.id} className="artifact-row"><Badge status={item.priority}>{item.priority}</Badge><span className="artifact-title">{item.id} · {item.title}</span><span className="artifact-source">{item.source}</span></div>)}</div>
  }
  if (agent.id === 'testcases') {
    return state.testCases.length === 0
      ? <EmptyState icon={FileText} title="No test cases" description="Generate test cases from requirements." />
      : <div className="artifact-list">{state.testCases.map(item => {
          const req = state.requirements.find(r => r.id === item.requirementId)
          return <div key={item.id} className="artifact-row"><Badge status={item.status}>{item.status}</Badge><span className="artifact-title">{item.id} · {item.title}</span><span className="artifact-source">{req ? `${req.id} · ${req.title}` : item.requirementId}</span></div>
        })}</div>
  }
  if (agent.id === 'scripts') {
    return state.scripts.length === 0
      ? <EmptyState icon={FileText} title="No scripts" description="Generate automation scripts from test cases." />
      : <div className="artifact-list">{state.scripts.map(item => {
          const tc = state.testCases.find(t => t.id === item.testCaseId)
          return <div key={item.id} className="artifact-row"><span className="artifact-title">{item.name}</span><span className="artifact-source">{tc ? `${tc.id} · ${tc.title}` : item.testCaseId}</span><Badge status="ready">{item.framework}</Badge></div>
        })}</div>
  }
  if (agent.id === 'execution') {
    return state.runs.length === 0
      ? <EmptyState icon={FileText} title="No runs" description="Run the execution agent to simulate a test run." />
      : <div className="artifact-list">{state.runs.map(item => <div key={item.id} className="artifact-row"><Badge status={item.status}>{item.status}</Badge><span className="artifact-title">{item.name}</span><span className="artifact-source">{formatDate(item.date)} · {item.duration}</span></div>)}</div>
  }
  return state.healings.length === 0
    ? <EmptyState icon={FileText} title="No healing proposals" description="Run execution first to create repair proposals." />
    : <div className="artifact-list">{state.healings.map(item => {
        const tc = state.testCases.find(t => t.id === item.testCaseId)
        return <div key={item.id} className="artifact-row"><Badge status={item.status}>{item.status}</Badge><span className="artifact-title">{item.id} · {tc ? tc.title : item.testCaseId}</span><span className="artifact-source">{item.confidence}% confidence</span></div>
      })}</div>
}

export function AgentsPage({ state, act, notify, runAgent, running, busy, focus, setFocus, AgentCard }) {
  const agent = AGENTS.find(a => a.id === focus)
  if (agent) {
    const index = AGENTS.findIndex(a => a.id === agent.id)
    const disabled = !canRunAgent(state, agent.id)
    return (
      <>
        <PageHeading eyebrow="AI AGENT" title={agent.name} description={agent.description}>
          <Button variant="secondary" icon={ArrowLeft} onClick={() => setFocus('all')}>All agents</Button>
          <Button icon={Play} loading={running === agent.id} disabled={busy || disabled} title={disabled ? getAgentBlockReason(state, agent.id) : `Run ${agent.name}`} onClick={() => runAgent(agent.id)}>Run agent</Button>
        </PageHeading>
        <section className="agent-detail">
          <div className="agent-detail-head">
            <IconBox id={agent.id} color={agent.color} size={28} />
            <div>
              <h2>{agent.shortName}</h2>
              <p>Output: {agent.outputLabel}</p>
            </div>
            {disabled && <div className="prerequisite">{getAgentBlockReason(state, agent.id)}</div>}
          </div>
          <Lifecycle current={index} onSelect={id => setFocus(id)} />
          <Panel title={`${agent.outputLabel} (${artifactCount(agent, state)})`}>
            <AgentArtifacts agent={agent} state={state} />
          </Panel>
          <Panel title="Sub-agents" subtitle="Specialists supporting this agent and shared workspace services">
            <div className="sub-agent-grid">{SUB_AGENTS.filter(item => item.parentId === agent.id || item.parentId === '*').map(item => <SubAgentCard key={item.id} subAgent={item} run={state.subAgentRuns.find(run => run.subAgentId === item.id && (run.parentId === agent.id || item.parentId === '*'))} />)}</div>
          </Panel>
          <Panel title="Add requirement"><RequirementForm act={act} notify={notify} /></Panel>
        </section>
      </>
    )
  }
  return (
    <>
      <PageHeading eyebrow="AI AGENTS" title="Your quality agents" description="Five specialized agents that move work from requirement to release.">
        <Button icon={Play} onClick={() => runAgent('requirements')} loading={running === 'requirements'} disabled={busy}>Run requirements</Button>
      </PageHeading>
      <div className="agents-layout">
        <section className="agents-grid">
          {AGENTS.map(a => <AgentCard key={a.id} agent={a} state={state} running={running} onRun={runAgent} onOpen={() => setFocus(a.id)} />)}
        </section>
        <aside>
          <Panel title="Add requirement"><RequirementForm act={act} notify={notify} /></Panel>
        </aside>
      </div>
    </>
  )
}

function artifactCount(agent, state) {
  if (agent.id === 'requirements') return state.requirements.length
  if (agent.id === 'testcases') return state.testCases.length
  if (agent.id === 'scripts') return state.scripts.length
  if (agent.id === 'execution') return state.runs.length
  return state.healings.filter(h => h.status === 'applied').length
}

export function TestsPage({ state, runAgent, running, busy, act, notify }) {
  const [search, setSearch] = useState('')
  const filtered = state.testCases.filter(t => {
    const term = search.toLowerCase()
    const req = state.requirements.find(r => r.id === t.requirementId)
    return t.title.toLowerCase().includes(term) || t.id.toLowerCase().includes(term) || (req && `${req.id} ${req.title}`.toLowerCase().includes(term))
  })
  const groups = state.requirements.map(r => ({ requirement: r, cases: filtered.filter(t => t.requirementId === r.id) })).filter(g => g.cases.length)
  return (
    <>
      <PageHeading eyebrow="TEST CASE LIBRARY" title="Traceable test coverage" description="Every test case links back to a requirement and carries a status.">
        <Button variant="secondary" icon={Play} onClick={() => runAgent('testcases')} loading={running === 'testcases'} disabled={busy || !canRunAgent(state, 'testcases')} title={getAgentBlockReason(state, 'testcases')}>Generate cases</Button>
        <Button icon={Play} onClick={() => runAgent('execution')} loading={running === 'execution'} disabled={busy || !canRunAgent(state, 'execution')} title={getAgentBlockReason(state, 'execution')}>Run execution</Button>
      </PageHeading>
      <div className="toolbar">
        <SearchField value={search} onChange={setSearch} placeholder="Search test cases..." />
      </div>
      {groups.length === 0 && <EmptyState icon={FileText} title="No matching test cases" description="Try a different search or generate cases from requirements." />}
      {groups.map(g => (
        <Panel key={g.requirement.id} title={`${g.requirement.id} · ${g.requirement.title}`} subtitle={`${g.cases.length} case${g.cases.length === 1 ? '' : 's'} · ${g.requirement.priority} priority`}>
          <table className="data-table">
            <thead><tr><th>ID</th><th>Title</th><th>Type</th><th>Priority</th><th>Status</th></tr></thead>
            <tbody>{g.cases.map(c => <tr key={c.id}><td>{c.id}</td><td>{c.title}</td><td>{c.type}</td><td><Badge status={c.priority}>{c.priority}</Badge></td><td><Badge status={c.status}>{c.status}</Badge></td></tr>)}</tbody>
          </table>
        </Panel>
      ))}
      <Panel title="Add requirement"><RequirementForm act={act} notify={notify} /></Panel>
    </>
  )
}

export function ScriptsPage({ state, runAgent, running, busy }) {
  const [search, setSearch] = useState('')
  const filtered = state.scripts.filter(s => {
    const term = search.toLowerCase()
    const tc = state.testCases.find(t => t.id === s.testCaseId)
    return s.name.toLowerCase().includes(term) || (tc && `${tc.id} ${tc.title}`.toLowerCase().includes(term))
  })
  return (
    <>
      <PageHeading eyebrow="AUTOMATION SCRIPTS" title="Generated Playwright scripts" description="Readable automation created from functional test cases.">
        <Button icon={Play} onClick={() => runAgent('scripts')} loading={running === 'scripts'} disabled={busy || !canRunAgent(state, 'scripts')} title={getAgentBlockReason(state, 'scripts')}>Generate scripts</Button>
      </PageHeading>
      <div className="toolbar">
        <SearchField value={search} onChange={setSearch} placeholder="Search scripts..." />
      </div>
      {filtered.length === 0 && <EmptyState icon={FileText} title="No matching scripts" description="Generate scripts from your test cases." />}
      {filtered.map(script => {
        const tc = state.testCases.find(t => t.id === script.testCaseId)
        return (
          <Panel key={script.id} title={script.name} subtitle={tc ? `${tc.id} · ${tc.title}` : script.testCaseId} action={<Badge status="ready">{script.framework}</Badge>}>
            <CodeBlock code={script.code} name={script.name} onDownload={() => downloadFile(script.name, script.code, 'text/javascript')} />
          </Panel>
        )
      })}
    </>
  )
}

export function RunsPage({ state, runAgent, running, busy }) {
  const [expanded, setExpanded] = useState(null)
  return (
    <>
      <PageHeading eyebrow="TEST EXECUTIONS" title="Simulation results" description="Deterministic demo runs with logs. No external test runner is started.">
        <Button icon={Play} onClick={() => runAgent('execution')} loading={running === 'execution'} disabled={busy || !canRunAgent(state, 'execution')} title={getAgentBlockReason(state, 'execution')}>Run execution</Button>
      </PageHeading>
      <DemoNotice />
      {state.runs.length === 0 && <EmptyState icon={FileText} title="No runs yet" description="Run the execution agent to see simulated results." />}
      {state.runs.map(run => {
        const rate = run.total ? Math.round((run.passed / run.total) * 100) : 0
        return (
          <Panel key={run.id} title={run.name} subtitle={`${formatDate(run.date)} · ${run.duration}`} action={<Badge status={run.status}>{run.status}</Badge>}>
            <div className="run-stats">
              <div className="run-stat"><span>Total</span><strong>{run.total}</strong></div>
              <div className="run-stat"><span>Passed</span><strong className="green">{run.passed}</strong></div>
              <div className="run-stat"><span>Failed</span><strong className="red">{run.failed}</strong></div>
              <div className="run-stat"><span>Pass rate</span><div className="donut" style={{ '--pass': `${rate}%` }}><span className="donut-text">{rate}%</span></div></div>
            </div>
            <Button variant="secondary" onClick={() => setExpanded(expanded === run.id ? null : run.id)}>{expanded === run.id ? 'Hide logs' : 'Show logs'}</Button>
            {expanded === run.id && <CodeBlock code={run.logs.join('\n')} name={`${run.id}.log`} onDownload={() => downloadFile(`${run.id}.log`, run.logs.join('\n'), 'text/plain')} />}
          </Panel>
        )
      })}
    </>
  )
}

export function HealingPage({ state, act, notify, runAgent, running, busy }) {
  const [filter, setFilter] = useState('all')
  const list = state.healings.filter(h => filter === 'all' || h.status === filter)
  return (
    <>
      <PageHeading eyebrow="SELF-HEALING" title="Selector repair proposals" description="Review and approve simulated selector repairs for failed tests.">
        <Button icon={WandSparkles} onClick={() => runAgent('healing')} loading={running === 'healing'} disabled={busy || !canRunAgent(state, 'healing')} title={getAgentBlockReason(state, 'healing')}>Scan failures</Button>
      </PageHeading>
      <div className="filter-tabs">
        {['all', 'pending', 'applied', 'dismissed'].map(s => <button key={s} className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>{s}</button>)}
      </div>
      {list.length === 0 && <EmptyState icon={FileText} title="No proposals" description={filter === 'all' ? 'Run execution to generate repair proposals.' : `No ${filter} proposals.`} />}
      {list.map(h => {
        const tc = state.testCases.find(t => t.id === h.testCaseId)
        return (
          <Panel key={h.id} title={`${h.id} · ${tc ? tc.title : h.testCaseId}`} action={<Badge status={h.status}>{h.status}</Badge>}>
            <div className="healing-diff">
              <div className="healing-old"><span>Old</span><code>{h.oldSelector}</code></div>
              <ChevronRight size={18} />
              <div className="healing-new"><span>New</span><code>{h.newSelector}</code></div>
            </div>
            <p className="healing-reason">{h.reason}</p>
            <div className="healing-meta"><Badge status="info">{h.confidence}% confidence</Badge></div>
            {h.status === 'pending' && (
              <div className="action-row">
                <Button onClick={() => { if (act({ type: 'APPLY_HEALING', id: h.id })) notify('Proposal applied.') }} disabled={busy}>Apply</Button>
                <Button variant="secondary" onClick={() => { act({ type: 'DISMISS_HEALING', id: h.id }); notify('Proposal dismissed.') }} disabled={busy}>Dismiss</Button>
              </div>
            )}
          </Panel>
        )
      })}
    </>
  )
}

export function PipelinePage({ state, runPipeline, pipelineStep, busy }) {
  const reason = getPipelineBlockReason(state)
  return (
    <>
      <PageHeading eyebrow="DEVOPS PIPELINE" title="Build to deploy" description="Simulated five-stage delivery pipeline.">
        <Button icon={Play} onClick={runPipeline} loading={busy} disabled={Boolean(reason)} title={reason || ''}>Run pipeline</Button>
      </PageHeading>
      <DemoNotice />
      <Panel title="Pipeline stages" subtitle={`Run #${state.pipeline.runNumber} · ${state.pipeline.status}`}>
        <Lifecycle pipeline current={pipelineStep ?? -1} />
        {busy && <div className="pipeline-progress"><div className="pipeline-bar" style={{ width: `${((pipelineStep ?? 0) + 1) * 20}%` }} /></div>}
        {reason && !busy && <div className="block-reason">{reason}</div>}
        {state.pipeline.status === 'passed' && !busy && <div className="pipeline-passed"><Check size={16} /> Pipeline passed. You can create a pull request.</div>}
      </Panel>
    </>
  )
}

function PrCreateModal({ onClose, act, notify }) {
  const [title, setTitle] = useState('')
  function submit(event) {
    event.preventDefault()
    if (!title.trim()) return
    if (act({ type: 'CREATE_PR', title })) {
      notify('Pull request created.')
      onClose()
    }
  }
  return (
    <Modal title="Create pull request" subtitle="Open a demo pull request from generated automation" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Title"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Add checkout regression coverage" required /></Field>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" icon={GitPullRequest}>Create</Button>
        </div>
      </form>
    </Modal>
  )
}

export function PullRequestsPage({ state, act, notify, busy }) {
  const [modal, setModal] = useState(false)
  const reason = getPipelineBlockReason(state)
  const canCreate = state.pipeline.status === 'passed' && !reason
  return (
    <>
      <PageHeading eyebrow="PULL REQUESTS" title="Delivery pull requests" description="Create, approve, and merge demo pull requests after a passing pipeline.">
        <Button icon={GitPullRequest} onClick={() => setModal(true)} disabled={busy || !canCreate} title={reason || (state.pipeline.status === 'passed' ? '' : 'Pipeline must pass first.')}>Create pull request</Button>
      </PageHeading>
      {modal && <PrCreateModal onClose={() => setModal(false)} act={act} notify={notify} />}
      {state.pullRequests.length === 0 && <EmptyState icon={GitPullRequest} title="No pull requests" description="Run a successful pipeline to enable demo PR creation."><Button onClick={() => setModal(true)} disabled={!canCreate}>Create pull request</Button></EmptyState>}
      {state.pullRequests.map(pr => (
        <Panel key={pr.id} title={pr.title} subtitle={pr.branch} action={<><Badge status={pr.status}>{pr.status}</Badge><Badge status={pr.checks}>{pr.checks}</Badge></>}>
          <div className="pr-meta"><span>Created {formatDate(pr.createdAt)}</span><span>Branch {pr.branch}</span></div>
          {pr.status === 'open' && (
            <div className="action-row">
              <Button onClick={() => { if (act({ type: 'APPROVE_PR', id: pr.id })) notify('Pull request approved.') }} disabled={busy || pr.checks !== 'passed'}>Approve</Button>
              <Button onClick={() => { if (act({ type: 'MERGE_PR', id: pr.id })) notify('Pull request merged.') }} disabled={busy || pr.status !== 'approved' || pr.checks !== 'passed'}>Merge</Button>
            </div>
          )}
        </Panel>
      ))}
    </>
  )
}

function isUrl(value) {
  return !value || /^https?:\/\/.+/i.test(value)
}

function ConnectorCard({ connector, state, act, notify }) {
  const current = state.connectors[connector.id] || { enabled: false, config: {} }
  const [enabled, setEnabled] = useState(current.enabled)
  const [config, setConfig] = useState(current.config)
  function save() {
    const invalid = connector.fields.some(f => (f.key.includes('Url') || f.key === 'baseUrl') && !isUrl(config[f.key]))
    if (invalid) { notify('Please enter a valid URL.', 'warning'); return }
    if (act({ type: 'SAVE_CONNECTOR', id: connector.id, config, enabled })) notify(`${connector.name} saved.`)
  }
  return (
    <Panel title={<><span className="connector-initial" style={{ background: connector.color }}>{connector.initials}</span> {connector.name}</>} subtitle={connector.category} action={<label className="toggle"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /><span /></label>}>
      <p>{connector.description}</p>
      {connector.fields.map(f => (
        <Field key={f.key} label={f.label}>
          <input value={config[f.key] || ''} onChange={e => setConfig({ ...config, [f.key]: e.target.value })} placeholder={f.placeholder} />
        </Field>
      ))}
      <div className="action-row"><Button onClick={save} icon={Save}>Save</Button></div>
    </Panel>
  )
}

export function IntegrationsPage({ state, act, notify }) {
  return (
    <>
      <PageHeading eyebrow="INTEGRATIONS" title="Connected intelligence" description="Configure demo connectors. No external services are called." />
      <DemoNotice />
      <div className="integrations-grid">
        {CONNECTOR_CATALOG.map(c => <ConnectorCard key={c.id} connector={c} state={state} act={act} notify={notify} />)}
      </div>
    </>
  )
}

function KnowledgeUploadModal({ onClose, act, notify }) {
  const [name, setName] = useState('')
  const [source, setSource] = useState('Upload')
  const [type, setType] = useState('Document')
  const [content, setContent] = useState('')
  function submit(event) {
    event.preventDefault()
    if (!name.trim()) return
    const size = `${(content.length / 1024).toFixed(1)} KB`
    if (act({ type: 'ADD_KNOWLEDGE', items: [{ name, source, type, content, size }] })) {
      notify('Knowledge uploaded.')
      onClose()
    }
  }
  return (
    <Modal title="Upload artifact" subtitle="Add local context to the knowledge layer" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-row">
          <Field label="Name"><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Release notes" required /></Field>
          <Field label="Source">
            <select value={source} onChange={e => setSource(e.target.value)}>
              <option>Upload</option><option>Confluence</option><option>Jira</option><option>GitHub</option><option>Manual</option>
            </select>
          </Field>
        </div>
        <Field label="Type">
          <select value={type} onChange={e => setType(e.target.value)}>
            <option>Document</option><option>OpenAPI</option><option>Markdown</option><option>Text</option>
          </select>
        </Field>
        <Field label="Content"><textarea value={content} onChange={e => setContent(e.target.value)} rows={6} placeholder="Paste non-sensitive text content" /></Field>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" icon={Upload}>Upload</Button>
        </div>
      </form>
    </Modal>
  )
}

export function TestLabPage({ state, act, notify, initialTab = 'har' }) {
  const [tab, setTab] = useState(initialTab)
  const [harFile, setHarFile] = useState(null)
  const [crawl, setCrawl] = useState({ name: 'Storefront journey', startUrl: 'https://commerce.example.test', maxPages: 10 })
  const importHar = (fileName, data) => {
    const raw = data?.log?.entries ?? data?.entries
    if (!Array.isArray(raw)) { notify('Invalid HAR: entries were not found.', 'error'); return }
    const entries = raw.map(entry => ({ method: entry?.request?.method ?? entry?.method, url: entry?.request?.url ?? entry?.url, status: entry?.response?.status ?? entry?.status }))
    if (act({ type: 'IMPORT_HAR', fileName, entries })) { setHarFile({ name: fileName, count: entries.length }); notify(`${fileName} imported with ${entries.length} entries.`) }
  }
  const loadFile = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    try { importHar(file.name, JSON.parse(await file.text())) } catch { notify('Could not parse this HAR file.', 'error') }
  }
  const demoHar = () => importHar('commerce-demo.har', { log: { entries: [{ request: { method: 'GET', url: 'https://commerce.example.test/api/products' }, response: { status: 200 } }, { request: { method: 'POST', url: 'https://commerce.example.test/api/cart' }, response: { status: 201 } }, { request: { method: 'POST', url: 'https://commerce.example.test/api/orders' }, response: { status: 201 } }] } })
  const simulateCrawl = event => {
    event.preventDefault()
    try {
      const base = new URL(crawl.startUrl).origin
      const discovered = [['', 'Storefront'], ['/products', 'Products'], ['/cart', 'Cart'], ['/checkout', 'Checkout']].slice(0, Number(crawl.maxPages)).map(([path, title]) => ({ url: `${base}${path}`, title }))
      if (act({ type: 'ADD_CRAWL_SCENARIO', name: crawl.name, startUrl: crawl.startUrl, maxPages: Number(crawl.maxPages), discovered })) notify('Crawl scenario simulated.')
    } catch { notify('Enter a valid start URL.', 'error') }
  }
  return <><PageHeading eyebrow="TEST LAB" title="Design tests from real workflows" description="Import captured traffic, explore user journeys, and review generated API scenarios." /><div className="page-tabs">{[['har','HAR Import'],['crawl','Crawl Scenarios'],['api','API Scenarios']].map(([id,label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>{tab === 'har' && <><div className="upload-drop-zone"><Upload size={28} /><strong>Import HTTP Archive</strong><p>Select a .har file to generate local API test scenarios.</p><input type="file" accept=".har,application/json" onChange={loadFile} /><Button variant="secondary" onClick={demoHar}>Use sample demo HAR</Button>{harFile && <Badge status="completed">{harFile.name} · {harFile.count} entries</Badge>}</div><Panel title="Imported HARs"><table className="data-table"><thead><tr><th>File</th><th>Entries</th><th>Imported</th></tr></thead><tbody>{state.testLab.harImports.map(item => <tr key={item.id}><td>{item.fileName}</td><td>{item.entryCount}</td><td>{formatDate(item.importedAt)} {formatTime(item.importedAt)}</td></tr>)}</tbody></table></Panel></>}{tab === 'crawl' && <><Panel title="New crawl scenario"><form className="inline-form" onSubmit={simulateCrawl}><Field label="Scenario name"><input required value={crawl.name} onChange={e => setCrawl({...crawl,name:e.target.value})} /></Field><Field label="Start URL"><input type="url" required value={crawl.startUrl} onChange={e => setCrawl({...crawl,startUrl:e.target.value})} /></Field><Field label="Max pages"><input type="number" min="1" max="50" value={crawl.maxPages} onChange={e => setCrawl({...crawl,maxPages:e.target.value})} /></Field><Button type="submit">Simulate crawl</Button></form></Panel><Panel title="Crawl scenarios"><div className="artifact-list">{state.testLab.crawlScenarios.map(item => <div className="artifact-row" key={item.id}><span className="artifact-title">{item.name}</span><span className="artifact-source">{item.startUrl}</span><Badge status="completed">{item.pageCount} pages</Badge></div>)}</div></Panel></>}{tab === 'api' && <Panel title="Generated API scenarios"><table className="data-table"><thead><tr><th>Method</th><th>URL</th><th>Expected</th><th>Status</th></tr></thead><tbody>{state.testLab.apiTests.map(item => <tr key={item.id}><td><Badge status="info">{item.method}</Badge></td><td>{item.url}</td><td>{item.expectedStatus}</td><td><Badge status={item.status}>{item.status}</Badge></td></tr>)}</tbody></table></Panel>}</>
}

export function FinOpsPage({ state, act, notify, initialTab = 'cloud' }) {
  const [tab, setTab] = useState(initialTab)
  const [usage, setUsage] = useState({ service: '', cost: '', unit: 'USD' })
  const submit = event => { event.preventDefault(); if (act({ type: 'ADD_AWS_USAGE', service: usage.service, cost: Number(usage.cost), unit: usage.unit })) { notify('AWS usage added.'); setUsage({...usage,service:'',cost:''}) } }
  const tokens = state.finOps.tokens
  const maximum = Math.max(1, ...Object.values(tokens.byAgent), ...Object.values(tokens.bySubAgent))
  const bars = (values, labels) => <div className="token-bars">{Object.entries(values).map(([id,value]) => <div className="token-bar-row" key={id}><span>{labels[id] ?? id}</span><div className="token-track"><i style={{width:`${Math.max(3, value / maximum * 100)}%`}} /></div><b>{value.toLocaleString()}</b></div>)}</div>
  return <><PageHeading eyebrow="FINOPS" title="Quality engineering economics" description="Track simulated cloud costs and token consumption across the agent lifecycle." /><div className="page-tabs"><button className={tab === 'cloud' ? 'active' : ''} onClick={() => setTab('cloud')}>Cloud Cost</button><button className={tab === 'tokens' ? 'active' : ''} onClick={() => setTab('tokens')}>Token Usage</button></div>{tab === 'cloud' ? <><div className="summary-card"><span>{state.finOps.aws.period}</span><strong>{state.finOps.aws.total.toFixed(2)} USD</strong></div><Panel title="AWS services"><table className="data-table"><thead><tr><th>Service</th><th>Cost</th><th>Unit</th><th>Trend</th></tr></thead><tbody>{state.finOps.aws.services.map(item => <tr key={item.service}><td>{item.service}</td><td>{item.cost.toFixed(2)}</td><td>{item.unit}</td><td><Badge status={item.trend === 'up' ? 'warning' : item.trend === 'down' ? 'completed' : 'neutral'}>{item.trend}</Badge></td></tr>)}</tbody></table></Panel><Panel title="Add AWS usage"><form className="inline-form" onSubmit={submit}><Field label="Service"><input required value={usage.service} onChange={e => setUsage({...usage,service:e.target.value})} /></Field><Field label="Cost"><input required type="number" min="0" step="0.01" value={usage.cost} onChange={e => setUsage({...usage,cost:e.target.value})} /></Field><Field label="Unit"><input value={usage.unit} onChange={e => setUsage({...usage,unit:e.target.value})} /></Field><Button type="submit" icon={Plus}>Add usage</Button></form></Panel></> : <><div className="summary-card"><span>Total token usage</span><strong>{tokens.total.toLocaleString()}</strong></div><div className="finops-grid"><Panel title="Per agent">{bars(tokens.byAgent, Object.fromEntries(AGENTS.map(item => [item.id,item.shortName])))}</Panel><Panel title="Per sub-agent">{bars(tokens.bySubAgent, Object.fromEntries(SUB_AGENTS.map(item => [item.id,item.name])))}</Panel></div><Panel title="Recent token runs"><table className="data-table"><thead><tr><th>Run</th><th>Agent</th><th>Tokens</th><th>Time</th></tr></thead><tbody>{tokens.byRun.map(item => <tr key={item.id}><td>{item.id}</td><td>{item.agent}</td><td>{item.tokens.toLocaleString()}</td><td>{formatDate(item.time)} {formatTime(item.time)}</td></tr>)}</tbody></table><p className="finops-note">Token counts are simulated estimates</p></Panel></>}</>
}

export function KnowledgePage({ state, act, notify }) {
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const filtered = state.knowledge.filter(k => {
    const term = search.toLowerCase()
    return k.name.toLowerCase().includes(term) || k.source.toLowerCase().includes(term) || k.type.toLowerCase().includes(term)
  })
  return (
    <>
      <PageHeading eyebrow="KNOWLEDGE LAYER" title="Workspace context" description="Documents, specifications, and guidelines that inform your agents.">
        <Button icon={Upload} onClick={() => setModal(true)}>Upload artifact</Button>
      </PageHeading>
      {modal && <KnowledgeUploadModal onClose={() => setModal(false)} act={act} notify={notify} />}
      <div className="toolbar"><SearchField value={search} onChange={setSearch} placeholder="Search knowledge..." /></div>
      {filtered.length === 0 && <EmptyState icon={FileText} title="No knowledge sources" description="Upload an artifact or add context manually." />}
      <div className="knowledge-grid">
        {filtered.map(item => (
          <Panel key={item.id} title={item.name} subtitle={`${item.source} · ${item.type}`} action={<Button variant="ghost" icon={Trash2} onClick={() => { act({ type: 'REMOVE_KNOWLEDGE', id: item.id }); notify('Knowledge removed.') }}>Remove</Button>}>
            <div className="knowledge-meta"><span>{item.size}</span><span>{formatDate(item.addedAt)}</span></div>
            {item.content && <p className="knowledge-preview">{item.content}</p>}
          </Panel>
        ))}
      </div>
    </>
  )
}
