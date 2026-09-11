import { useEffect, useReducer, useRef, useState } from 'react'
import { Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, Bell, BookOpen, Bot, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3, Code2, Command, Eye, EyeOff, FileCheck2, FlaskConical, GitBranch, GitPullRequest, LayoutDashboard, LockKeyhole, LogOut, Menu, MoreHorizontal, Play, Plug, Search, ShieldCheck, Sparkles, TrendingUp, User, WandSparkles, Workflow, X } from 'lucide-react'
import { AGENTS, CONNECTOR_CATALOG, canRunAgent, getAgentBlockReason, getMetrics, getNextAutonomousAgent, getPipelineBlockReason, loadState, reducer, saveState } from './model.js'
import { ActivityList, Badge, Brand, Button, DemoNotice, EmptyState, Field, IconBox, Lifecycle, Modal, PageHeading, Panel, downloadFile, formatDate, formatTime } from './components.jsx'
import { AgentsPage, FinOpsPage, GovernancePage, HealingPage, IntegrationsPage, KnowledgePage, PipelinePage, PullRequestsPage, RunsPage, ScriptsPage, TestLabPage, TestsPage } from './pages.jsx'

const navigation = [
  { id: 'studio', label: 'Studio', icon: LayoutDashboard, tabs: [{ id: 'overview', label: 'Overview' }, { id: 'agents', label: 'AI Agents', count: 5 }] },
  { id: 'lab', label: 'Test Lab', icon: FlaskConical, tabs: [{ id: 'testlab-har', label: 'HAR Import' }, { id: 'testlab-crawl', label: 'Crawl Scenarios' }, { id: 'testlab-api', label: 'API Scenarios' }] },
  { id: 'execution', label: 'Execution', icon: Play, tabs: [{ id: 'testcases', label: 'Test Cases' }, { id: 'scripts', label: 'Automation Scripts' }, { id: 'runs', label: 'Test Runs' }, { id: 'healing', label: 'Self-Healing' }] },
  { id: 'delivery', label: 'Delivery', icon: Workflow, tabs: [{ id: 'pipeline', label: 'Pipeline' }, { id: 'prs', label: 'Pull Requests' }] },
  { id: 'finops', label: 'FinOps', icon: TrendingUp, tabs: [{ id: 'finops-cloud', label: 'Cloud Cost' }, { id: 'finops-tokens', label: 'Token Usage' }] },
  { id: 'governance', label: 'Trust & Governance', icon: ShieldCheck, tabs: [{ id: 'governance-eval', label: 'Eval Layer' }, { id: 'governance-policy', label: 'Governance Layer' }, { id: 'governance-operating', label: 'Operating Model' }, { id: 'governance-responsible', label: 'Responsible AI' }, { id: 'governance-guardrails', label: 'AI Guardrails' }] },
  { id: 'intelligence', label: 'Intelligence', icon: BookOpen, tabs: [{ id: 'knowledge', label: 'Knowledge' }, { id: 'integrations', label: 'Integrations' }, { id: 'activity', label: 'Activity' }] },
]
const allPages = navigation.flatMap(section => section.tabs)

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    if (username === 'admin' && password === 'admin') onLogin()
    else setError('Incorrect username or password. Use admin / admin for this demo.')
  }
  return <main className="login-page"><section className="login-story"><Brand /><div className="login-story-content"><span className="login-tag"><Sparkles size={14} /> THE NEXT CHAPTER OF QUALITY</span><h1>Great software.<br />Exceptional quality.<br /><span>One workspace.</span></h1><p>Bring your entire QA lifecycle together with purpose-built agents. From the first requirement to your next release.</p><div className="login-orbit"><div className="orbit-line" /><div className="orbit-center"><ShieldCheck size={40} /><span>Quality, connected.</span></div>{[['requirements', 'Requirements'], ['scripts', 'Automation'], ['healing', 'Self-healing']].map(([id, label], index) => <div key={id} className={`orbit-node orbit-${index}`}><IconBox id={id} color={['blue', 'purple', 'green'][index]} /><span>{label}<small>Purpose-built agent</small></span><CheckCircle2 size={15} /></div>)}</div></div><footer><span>Built for teams that care about quality.</span><span>QualityOS / 2026</span></footer></section><section className="login-form-side"><div className="login-form-wrap"><span className="login-mini-mark"><FlaskConical size={25} /></span><h2>Welcome to your workspace</h2><p>Your agents are ready. Let’s build something reliable.</p><form onSubmit={submit}><Field label="Username"><div className="input-with-icon"><User size={18} /><input name="username" autoComplete="username" placeholder="Enter your username" required value={username} onChange={event => { setUsername(event.target.value); setError('') }} /></div></Field><Field label="Password"><div className="input-with-icon"><LockKeyhole size={18} /><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={event => { setPassword(event.target.value); setError('') }} /><button type="button" className="icon-button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></Field>{error && <p role="alert" className="form-error">{error}</p>}<Button type="submit" className="login-submit">Sign in to workspace <ArrowRight size={17} /></Button></form><div className="demo-credentials"><ShieldCheck size={20} /><div><strong>Take the workspace for a spin</strong><span>Demo credentials: <code>admin</code> / <code>admin</code></span></div></div><p className="login-disclaimer">Demo access only. This browser-only login is not production authentication. Do not upload confidential data.</p></div><div className="login-footer"><span>QA, without the silos.</span><span className="version-label">v1.0 · Local demo</span></div></section></main>
}

function AgentCard({ agent, state, running, onRun, onOpen }) {
  const disabled = !canRunAgent(state, agent.id)
  const count = agent.id === 'requirements' ? state.requirements.length : agent.id === 'testcases' ? state.testCases.length : agent.id === 'scripts' ? state.scripts.length : agent.id === 'execution' ? state.runs.length : state.healings.filter(item => item.status === 'applied').length
  return <article className="agent-card"><div className="agent-card-top"><IconBox id={agent.id} color={agent.color} /><Badge status={running === agent.id ? 'running' : 'active'}>{running === agent.id ? 'Running' : 'Ready'}</Badge></div><button className="agent-title" onClick={() => onOpen(agent.id)}>{agent.shortName || agent.name}<ArrowUpRight size={15} /></button><p>{agent.description}</p><div className="agent-output"><strong>{count}</strong><span>{agent.outputLabel}</span></div><div className="agent-card-footer"><span><Clock3 size={12} />{state.lastAgentRuns[agent.id] ? formatTime(state.lastAgentRuns[agent.id]) : 'Ready to run'}</span><button className="run-agent-button" disabled={Boolean(running) || disabled} title={disabled ? getAgentBlockReason(state, agent.id) : `Run ${agent.name}`} onClick={() => onRun(agent.id)} aria-label={`Run ${agent.name}`}><Play size={13} fill="currentColor" />Run</button></div></article>
}

function Overview({ state, navigate, runAgent, running, runLifecycle, pipelineStep, openAgent, exportReport }) {
  const metrics = getMetrics(state)
  const latest = state.runs[0]
  const pendingHealings = state.healings.filter(item => item.status === 'pending').length
  const recentRuns = [...state.runs].slice(0, 7).reverse()
  const generatedDate = new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
  return <><PageHeading eyebrow={generatedDate} title="A clearer view of quality." description="Your agents, testing, and delivery. Working better, together."><Button variant="secondary" icon={ArrowDownToLine} onClick={exportReport}>Export report</Button><Button icon={Play} onClick={runLifecycle} loading={Boolean(running)} disabled={pipelineStep !== null}>Run QA lifecycle</Button></PageHeading><section className="welcome-banner"><div className="banner-symbol"><Sparkles size={27} /></div><div><span className="banner-eyebrow">LESS REPETITION. MORE CONFIDENCE.</span><h2>Your quality team just got a little more powerful.</h2><p>Five specialized agents. One connected journey from requirement to release.</p></div><button onClick={() => navigate('agents')}>Meet your agents <ArrowRight size={16} /></button><div className="banner-decoration" aria-hidden="true"><div /><div /><div /></div></section><div className="metrics-grid">{[{ label: 'Functional test cases', value: metrics.totalCases, icon: FileCheck2, color: 'purple', detail: `${state.requirements.length} requirements covered`, trend: 'Traceable coverage' }, { label: 'Latest execution pass rate', value: `${metrics.passRate}%`, icon: TrendingUp, color: 'green', detail: `${latest?.passed || 0} of ${latest?.total || 0} tests passed`, trend: 'Simulated results' }, { label: 'Specialized QA agents', value: '05', icon: Bot, color: 'blue', detail: 'Across the entire QA lifecycle', trend: 'Ready when you are' }, { label: 'Knowledge sources', value: state.knowledge.length.toString().padStart(2, '0'), icon: BookOpen, color: 'orange', detail: 'Documents, stories & artifacts', trend: 'Shared context' }].map(item => <section className="metric-card" key={item.label}><div className="metric-top"><span>{item.label}</span><span className={`metric-icon ${item.color}`}><item.icon size={18} /></span></div><div className="metric-value">{item.value}<span className="metric-sparkline" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></span></div><div className="metric-detail">{item.detail}</div><div className="metric-foot"><span className="tiny-dot" />{item.trend}</div></section>)}</div><div className="section-heading"><div><h2>Your agent team <span className="count-pill">5 agents</span></h2><p>Specialists for every step. You stay in control.</p></div><button className="text-button" onClick={() => navigate('agents')}>View all agents <ArrowRight size={15} /></button></div><div className="agents-grid">{AGENTS.map(agent => <AgentCard key={agent.id} agent={agent} state={state} running={running} onRun={runAgent} onOpen={openAgent} />)}</div><Panel title="One connected QA lifecycle" subtitle="Move from requirements to reliable releases, with human review where it matters." action={<Badge status="idle" dot={false}>Human-in-the-loop</Badge>} className="lifecycle-panel"><Lifecycle current={running ? AGENTS.findIndex(agent => agent.id === running) : -1} onSelect={openAgent} /></Panel><div className="dashboard-bottom"><Panel title="Execution overview" subtitle="Results from your latest simulated test run" action={<button className="text-button" onClick={() => navigate('runs')}>View runs <ArrowUpRight size={15} /></button>}><div className="execution-summary"><div className="donut" style={{ '--percent': metrics.passRate }}><div><strong>{metrics.passRate}<small>%</small></strong><span>Pass rate</span></div></div><div className="execution-stats"><div><span><i className="legend-dot green" />Passed</span><strong>{latest?.passed || 0}</strong></div><div><span><i className="legend-dot red" />Failed</span><strong>{latest?.failed || 0}</strong></div><div><span><i className="legend-dot gray" />Total tests</span><strong>{latest?.total || 0}</strong></div></div></div><div className="run-trend"><span>Recent run pass rates</span><div className="trend-bars">{recentRuns.map(run => <div key={run.id} title={`${run.name}: ${run.passed}/${run.total} passed`}><span style={{ height: `${Math.max(4, run.passed / Math.max(run.total, 1) * 44)}px` }} /><small>{Math.round(run.passed / Math.max(run.total, 1) * 100)}%</small></div>)}</div><span className="trend-note">{recentRuns.length} demo runs</span></div></Panel><Panel title="Workspace activity" subtitle="A little visibility goes a long way" action={<button className="text-button" onClick={() => navigate('activity')}>View all <ArrowUpRight size={15} /></button>}><ActivityList items={state.activity.slice(0, 4)} compact /><div className="healing-nudge"><span className="healing-nudge-icon"><WandSparkles size={19} /></span><div><strong>{pendingHealings ? `${pendingHealings} healing proposal${pendingHealings > 1 ? 's' : ''} to review` : 'Your tests are in good hands'}</strong><p>{pendingHealings ? 'A small fix could make your suite more resilient.' : 'The self-healing agent is ready to assist.'}</p></div><button className="icon-button" aria-label="Review healing proposals" onClick={() => navigate('healing')}><ArrowRight size={18} /></button></div></Panel></div><div className="workspace-footer"><span><ShieldCheck size={14} />Human-led. Agent-assisted. Quality-first.</span><span>All activity stays in this browser <span className="footer-dot">·</span> Demo mode</span></div></>
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => { try { return sessionStorage.getItem('qualityos:session') === 'demo-admin' } catch { return false } })
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const [page, setPage] = useState('overview')
  const [agentFocus, setAgentFocus] = useState('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedNav, setExpandedNav] = useState(() => new Set(['studio']))
  const [running, setRunning] = useState(null)
  const [pipelineStep, setPipelineStep] = useState(null)
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [storageWarning, setStorageWarning] = useState(false)
  const timers = useRef(new Set())
  const busy = useRef(false)
  const toastTimer = useRef(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => { setStorageWarning(!saveState(state)) }, [state])
  useEffect(() => () => { timers.current.forEach(timer => clearTimeout(timer)); clearTimeout(toastTimer.current) }, [])
  useEffect(() => {
    const handler = event => { if ((event.metaKey || event.ctrlKey) && event.key === 'k' && authenticated) { event.preventDefault(); setModal('search') } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [authenticated])

  function notify(message, type = 'success') {
    clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }
  function schedule(fn, delay) {
    const timer = setTimeout(() => { timers.current.delete(timer); fn() }, delay)
    timers.current.add(timer)
  }
  function navigate(id) { setPage(id); setSidebarOpen(false) }
  function openAgent(id) { setAgentFocus(id); navigate('agents') }
  function login() {
    try { sessionStorage.setItem('qualityos:session', 'demo-admin') } catch { notify('Session storage unavailable. You can still use the demo.', 'warning') }
    setAuthenticated(true)
  }
  function logout() {
    timers.current.forEach(timer => clearTimeout(timer))
    timers.current.clear()
    busy.current = false
    setRunning(null)
    setPipelineStep(null)
    setModal(null)
    try { sessionStorage.removeItem('qualityos:session') } catch {}
    setAuthenticated(false)
    setPage('overview')
  }
  function toggleAutonomous(enabled) {
    act({ type: 'TOGGLE_AUTONOMOUS', enabled }, `Autonomous mode ${enabled ? 'enabled' : 'disabled'}.`)
  }
  function runAgent(id, autonomousRun = false) {
    if (busy.current) return
    if (!canRunAgent(stateRef.current, id)) { notify(getAgentBlockReason(stateRef.current, id), 'warning'); return }
    busy.current = true
    setRunning(id)
    schedule(() => {
      const nextState = reducer(stateRef.current, { type: 'RUN_AGENT', agentId: id })
      dispatch({ type: 'RUN_AGENT', agentId: id })
      setRunning(null)
      busy.current = false
      notify(`${AGENTS.find(agent => agent.id === id)?.shortName || 'Agent'} demo completed. Review the generated output.`)
      if (nextState.autonomous.enabled) {
        const next = getNextAutonomousAgent(nextState)
        if (next && next !== id && canRunAgent(nextState, next)) schedule(() => runAgent(next, true), autonomousRun ? 500 : 700)
      }
    }, 1100)
  }
  function runLifecycle() {
    if (busy.current) return
    busy.current = true
    let index = 0
    function next() {
      if (index >= AGENTS.length) {
        setRunning(null)
        busy.current = false
        navigate('healing')
        notify('Demo lifecycle complete. Review healing proposals, rerun execution, then start your pipeline.')
        return
      }
      const agent = AGENTS[index++]
      setRunning(agent.id)
      schedule(() => { dispatch({ type: 'RUN_AGENT', agentId: agent.id }); schedule(next, 120) }, 850)
    }
    next()
  }
  function runPipeline() {
    if (busy.current) return
    const reason = getPipelineBlockReason(stateRef.current)
    if (reason) { notify(reason, 'warning'); return }
    busy.current = true
    setPipelineStep(0)
    for (let i = 1; i <= 5; i++) schedule(() => {
      if (i === 5) {
        dispatch({ type: 'RUN_PIPELINE' })
        setPipelineStep(null)
        busy.current = false
        notify('Simulated pipeline passed. You can now create a demo pull request.')
      } else setPipelineStep(i)
    }, i * 800)
  }
  function act(action, message) {
    if (busy.current) { notify('Wait for the current simulation to finish before changing the workspace.', 'warning'); return false }
    const next = reducer(stateRef.current, action)
    if (next === stateRef.current) { notify('Action unavailable. Check the prerequisites and try again.', 'warning'); return false }
    dispatch(action)
    if (message) notify(message)
    return true
  }
  function exportReport() {
    const { connectors, ...report } = state
    downloadFile('qualityos-qa-report.json', JSON.stringify({ application: 'QualityOS', mode: 'SIMULATED DEMO — not actual execution or security results', exportedAt: new Date().toISOString(), metrics: getMetrics(state), ...report }, null, 2), 'application/json')
    notify('QA report exported as JSON. All run results are labeled as simulated.')
  }

  if (!authenticated) return <Login onLogin={login} />

  const common = { state, act, notify, runAgent, running, navigate, openAgent, busy: Boolean(running) || pipelineStep !== null }
  const searchResults = search.trim() ? [
    ...allPages.map(item => ({ id: `page-${item.id}`, title: item.label, category: 'Workspace', page: item.id })),
    ...state.requirements.map(item => ({ id: item.id, title: `${item.id} · ${item.title}`, category: 'Requirement', page: 'agents', agent: 'requirements' })),
    ...state.testCases.map(item => ({ id: item.id, title: `${item.id} · ${item.title}`, category: 'Test case', page: 'testcases' })),
    ...state.knowledge.map(item => ({ id: item.id, title: item.name, category: 'Knowledge', page: 'knowledge' })),
  ].filter(item => item.title.toLowerCase().includes(search.toLowerCase())).slice(0, 12) : []

  return <div className="app-shell">{sidebarOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}<aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}><Brand /><button className="workspace-switcher" onClick={() => setModal('workspace')}><span className="workspace-avatar">C</span><span>Commerce Platform<small>QA workspace</small></span><ChevronDown size={16} /></button><nav aria-label="Main navigation">{navigation.map(section => { const open = expandedNav.has(section.id); const selected = section.tabs.some(item => item.id === page); const count = section.id === 'lab' ? state.testLab.apiTests.length : section.id === 'execution' ? state.runs.length : section.id === 'finops' ? state.finOps.tokens.byRun.length : null; return <div className={`nav-section ${selected ? 'selected' : ''}`} key={section.id}><button className="nav-section-head" onClick={() => setExpandedNav(current => { const next = new Set(current); next.has(section.id) ? next.delete(section.id) : next.add(section.id); return next })}><section.icon size={18} /><span>{section.label}</span>{count !== null && <span className="nav-count">{count}</span>}{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button>{open && <div className="nav-sub-tabs">{section.tabs.map(item => <button className={`nav-sub-tab ${page === item.id ? 'selected' : ''}`} key={item.id} onClick={() => { if (item.id === 'agents') setAgentFocus('all'); navigate(item.id) }} aria-current={page === item.id ? 'page' : undefined}><span>{item.label}</span>{item.count && <span className="nav-count">{item.count}</span>}{item.id === 'healing' && state.healings.some(item => item.status === 'pending') && <span className="nav-alert" />}</button>)}</div>}</div> })}</nav><div className="sidebar-bottom"><div className="workspace-status"><span className="pulsing-dot" /><span>Local demo workspace<small>No external services connected</small></span><ShieldCheck size={17} /></div><button className="help-button" onClick={() => setModal('help')}><CircleHelp size={18} />Quick start guide<ArrowUpRight size={15} /></button><button className="user-profile" onClick={() => setModal('account')}><span className="user-avatar">AD</span><span>Admin<small>Workspace administrator</small></span><MoreHorizontal size={18} /></button></div></aside><div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button><span className="breadcrumb-root">Workspace</span><ChevronRight size={14} /><strong>{allPages.find(item => item.id === page)?.label}</strong></div><div className="topbar-actions"><label className="autonomous-toggle"><span className={`autonomous-dot ${state.autonomous.enabled ? 'on' : ''}`} />Autonomous <input type="checkbox" checked={state.autonomous.enabled} onChange={event => toggleAutonomous(event.target.checked)} disabled={Boolean(running)} /></label><button className="global-search" onClick={() => setModal('search')}><Search size={16} /><span>Search workspace…</span><kbd>Ctrl K</kbd></button><span className="environment-tag"><span />Demo</span><button className="notification-button icon-button" aria-label="View notifications" onClick={() => setModal('notifications')}><Bell size={19} /><i /></button><span className="topbar-divider" /><button className="topbar-avatar" aria-label="Open admin account" onClick={() => setModal('account')}>AD</button></div></header><main className="main-content">{storageWarning && <div className="storage-warning" role="alert">Browser storage is unavailable or full. New changes may not persist. Export a report to keep a copy.</div>}{running && <div className="running-banner" role="status"><span className="loading-dots"><i /><i /><i /></span><strong>{AGENTS.find(agent => agent.id === running)?.name}</strong><span>Simulating agent workflow…</span><Badge status="running">Demo run</Badge></div>}{page === 'overview' && <Overview {...common} runLifecycle={runLifecycle} pipelineStep={pipelineStep} exportReport={exportReport} />}{page === 'agents' && <AgentsPage {...common} focus={agentFocus} setFocus={setAgentFocus} AgentCard={AgentCard} />}{page.startsWith('testlab-') && <TestLabPage {...common} key={page} initialTab={page.replace('testlab-', '')} />}{page.startsWith('finops-') && <FinOpsPage {...common} key={page} initialTab={page === 'finops-tokens' ? 'tokens' : 'cloud'} />}{page === 'testcases' && <TestsPage {...common} />}{page === 'scripts' && <ScriptsPage {...common} />}{page === 'runs' && <RunsPage {...common} />}{page === 'healing' && <HealingPage {...common} />}{page === 'pipeline' && <PipelinePage {...common} pipelineStep={pipelineStep} runPipeline={runPipeline} />}{page === 'prs' && <PullRequestsPage {...common} />}{page === 'knowledge' && <KnowledgePage {...common} />}{page === 'integrations' && <IntegrationsPage {...common} />}{page.startsWith('governance-') && <GovernancePage {...common} key={page} initialTab={page.replace('governance-', '')} />}{page === 'activity' && <><PageHeading eyebrow="WORKSPACE AUDIT TRAIL" title="Every action, in the open." description="A chronological record of local demo activity. The most recent 50 events are retained."><Button variant="secondary" icon={ArrowDownToLine} onClick={() => downloadFile('qualityos-activity.json', JSON.stringify(state.activity, null, 2), 'application/json')}>Export activity</Button></PageHeading><Panel title="Recent activity" action={<Badge dot={false}>{state.activity.length} events</Badge>}><ActivityList items={state.activity} /></Panel></>}</main></div>{toast && <div className={`toast ${toast.type}`} role="status"><CheckCircle2 size={20} /><span>{toast.message}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={16} /></button></div>}{modal === 'account' && <Modal title="Your account" subtitle="Local demo administrator" onClose={() => setModal(null)}><div className="account-summary"><span className="user-avatar large">AD</span><div><h3>Admin</h3><p>Workspace administrator · Demo access</p></div></div><DemoNotice>The admin / admin login is for demonstration only. Real authentication, authorization, and audit persistence require a backend.</DemoNotice><div className="modal-actions"><Button variant="secondary" onClick={() => setModal(null)}>Stay in workspace</Button><Button icon={LogOut} onClick={logout}>Sign out</Button></div></Modal>}{modal === 'workspace' && <Modal title="Commerce Platform" subtitle="Your local QA demonstration workspace" onClose={() => setModal(null)}><div className="detail-grid"><div><span>Project</span><strong>Commerce Platform</strong></div><div><span>Environment</span><strong>Local simulation</strong></div><div><span>Script framework</span><strong>Playwright · JavaScript</strong></div><div><span>Storage</span><strong>This browser only</strong></div></div><DemoNotice>Connector settings are configuration drafts. This application does not call external APIs, run generated scripts, or deploy software.</DemoNotice><div className="modal-actions"><Button onClick={() => { setModal(null); navigate('integrations') }}>Manage integrations <ArrowRight size={16} /></Button></div></Modal>}{modal === 'notifications' && <Modal title="Workspace notifications" subtitle="Recent demo events and review items" onClose={() => setModal(null)}><ActivityList items={state.activity.slice(0, 6)} /><div className="modal-actions"><Button variant="secondary" onClick={() => { setModal(null); navigate('healing') }}>Review healing proposals</Button><Button onClick={() => { setModal(null); navigate('activity') }}>View activity log</Button></div></Modal>}{modal === 'search' && <Modal title="Search your workspace" subtitle="Find pages, requirements, test cases, and knowledge sources." onClose={() => { setModal(null); setSearch('') }}><div className="command-search"><Search size={21} /><input autoFocus aria-label="Search all workspace content" value={search} onChange={event => setSearch(event.target.value)} placeholder="What are you looking for?" /></div><div className="search-results">{!search.trim() ? allPages.slice(0, 6).map(item => <button key={item.id} onClick={() => { setModal(null); navigate(item.id) }}><item.icon size={18} /><span>{item.label}</span><ArrowUpRight size={16} /></button>) : searchResults.length ? searchResults.map(item => <button key={item.id} onClick={() => { setModal(null); setSearch(''); if (item.agent) openAgent(item.agent); else navigate(item.page) }}><Search size={16} /><span>{item.title}<small>{item.category}</small></span><ArrowUpRight size={16} /></button>) : <EmptyState icon={Search} title="No matches found" description="Try a different requirement, test name, or page." />}</div></Modal>}{modal === 'help' && <Modal title="From requirement to release" subtitle="A quick guide to your QualityOS demo" onClose={() => setModal(null)}><ol className="quick-start">{[['Give your agents context', 'Browse the Knowledge layer or upload non-sensitive text artifacts. Connector settings are local drafts, not live integrations.'], ['Run the QA lifecycle', 'From Overview, run the lifecycle to import a demo requirement, generate test cases and scripts, and simulate execution.'], ['Keep a human in the loop', 'Review and apply self-healing proposals, then rerun the execution agent. Applied changes do not count as verified until rerun.'], ['Move through delivery gates', 'Once execution passes, simulate Build → Test → SAST → DAST → Deploy. Then create, approve, and merge a local demo PR.']].map(([title, text]) => <li key={title}><strong>{title}</strong><p>{text}</p></li>)}</ol><DemoNotice /><div className="modal-actions"><Button onClick={() => setModal(null)}>Got it <Check size={16} /></Button></div></Modal>}</div>
}
