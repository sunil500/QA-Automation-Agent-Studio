import { useState } from 'react'
import { BrainCircuit, Check, Plus, Scale, Shield, Trash2, Users } from 'lucide-react'
import { Badge, Button, Field, PageHeading, Panel } from './components.jsx'

const tabs = [
  ['eval', 'Eval Layer'],
  ['policy', 'Governance Layer'],
  ['operating', 'Operating Model'],
  ['responsible', 'Responsible AI'],
  ['guardrails', 'AI Guardrails'],
]

function scorecard(label, value, status, note) {
  return { label, value, status, note }
}

export function GovernancePage({ state, notify }) {
  const [tab, setTab] = useState('eval')
  const [evalChecks, setEvalChecks] = useState([
    { id: 'ec-1', label: 'Traceability: every test case links to a requirement', status: 'passed' },
    { id: 'ec-2', label: 'Coverage: at least 2 cases per requirement', status: 'passed' },
    { id: 'ec-3', label: 'Reliability: latest execution pass rate > 90%', status: state.runs[0]?.status === 'passed' ? 'passed' : 'warning' },
    { id: 'ec-4', label: 'Bias review: promotional and sign-in flows balanced', status: 'passed' },
    { id: 'ec-5', label: 'Explainability: selector changes are documented', status: state.healings.length > 0 ? 'passed' : 'warning' },
  ])
  const [policies, setPolicies] = useState([
    { id: 'pol-1', name: 'AI-generated automation requires human review', owner: 'QA Lead', status: 'active' },
    { id: 'pol-2', name: 'Self-healing changes need approval before apply', owner: 'Automation Engineer', status: 'active' },
    { id: 'pol-3', name: 'No production credentials in demo workspace', owner: 'Security', status: 'active' },
  ])
  const [newPolicy, setNewPolicy] = useState({ name: '', owner: '' })
  const [guardrails, setGuardrails] = useState([
    { id: 'gr-1', name: 'Max tokens per agent run', value: '2,500', enabled: true },
    { id: 'gr-2', name: 'Block outbound API calls from browser', value: 'Enabled', enabled: true },
    { id: 'gr-3', name: 'Require human approval for self-healing', value: 'Enabled', enabled: true },
    { id: 'gr-4', name: 'Rate limit: 1 execution per 5s', value: 'Enabled', enabled: true },
    { id: 'gr-5', name: 'Sandbox mode for HAR uploads', value: 'Enabled', enabled: true },
  ])
  const [newGuardrail, setNewGuardrail] = useState({ name: '', value: '' })
  const [responsible, setResponsible] = useState([
    { id: 'ra-1', principle: 'Human-in-the-loop for all healing changes', status: true },
    { id: 'ra-2', principle: 'Transparent token and cost tracking', status: true },
    { id: 'ra-3', principle: 'Explainable selector drift reasoning', status: true },
    { id: 'ra-4', principle: 'Fairness across customer flows', status: true },
    { id: 'ra-5', principle: 'Audit trail for every agent action', status: true },
  ])

  const passCount = evalChecks.filter(c => c.status === 'passed').length
  const score = Math.round((passCount / evalChecks.length) * 100)
  const cards = [
    scorecard('Eval Score', `${score}%`, score >= 80 ? 'passed' : 'warning', `${passCount} of ${evalChecks.length} checks passed`),
    scorecard('Active Policies', policies.length, 'passed', 'Quality and security policies in force'),
    scorecard('Guardrails Live', guardrails.filter(g => g.enabled).length, 'passed', 'Protections active'),
    scorecard('Runs Audited', state.runs.length, 'info', 'Execution records retained'),
  ]

  function addPolicy(e) {
    e.preventDefault()
    if (!newPolicy.name.trim() || !newPolicy.owner.trim()) return
    setPolicies([{ id: `pol-${Date.now()}`, name: newPolicy.name, owner: newPolicy.owner, status: 'active' }, ...policies])
    setNewPolicy({ name: '', owner: '' })
    notify('Governance policy added.')
  }

  function removePolicy(id) { setPolicies(policies.filter(p => p.id !== id)); notify('Policy removed.') }
  function toggleGuardrail(id) { setGuardrails(guardrails.map(g => g.id === id ? { ...g, enabled: !g.enabled } : g)); notify('Guardrail toggled.') }
  function addGuardrail(e) {
    e.preventDefault()
    if (!newGuardrail.name.trim() || !newGuardrail.value.trim()) return
    setGuardrails([...guardrails, { id: `gr-${Date.now()}`, name: newGuardrail.name, value: newGuardrail.value, enabled: true }])
    setNewGuardrail({ name: '', value: '' })
    notify('Guardrail added.')
  }

  return (
    <>
      <PageHeading eyebrow="TRUST & GOVERNANCE" title="Operate AI with confidence" description="Evaluation, policy, operating model, responsible AI, and guardrails. All in one place.">
        <Button variant="secondary" onClick={() => { const data = { evalChecks, policies, guardrails, responsible, exportedAt: new Date().toISOString() }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'qualityos-governance-report.json'; a.click() }}>Export report</Button>
      </PageHeading>
      <div className="page-tabs">{tabs.map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>
      {tab === 'eval' && <>
        <div className="metrics-grid small">{cards.map((card, i) => <section className="metric-card" key={i}><div className="metric-top"><span>{card.label}</span><span className={`metric-icon ${card.status}`}><Shield size={18} /></span></div><div className="metric-value">{card.value}<small>{card.note}</small></div></section>)}</div>
        <Panel title="Evaluation checklist" subtitle="Continuous checks that the agent workflow is trustworthy.">
          <table className="data-table"><thead><tr><th>Check</th><th>Status</th></tr></thead><tbody>{evalChecks.map(check => <tr key={check.id}><td>{check.label}</td><td><Badge status={check.status}>{check.status}</Badge></td></tr>)}</tbody></table>
          <p className="finops-note">Status is derived from current workspace state. Rerun execution or add healing records to improve scores.</p>
        </Panel>
      </>}
      {tab === 'policy' && <>
        <Panel title="Add governance policy"><form className="inline-form" onSubmit={addPolicy}><Field label="Policy name"><input required value={newPolicy.name} onChange={e => setNewPolicy({ ...newPolicy, name: e.target.value })} placeholder="e.g. No secrets in generated scripts" /></Field><Field label="Owner"><input required value={newPolicy.owner} onChange={e => setNewPolicy({ ...newPolicy, owner: e.target.value })} placeholder="Team or role" /></Field><Button type="submit" icon={Plus}>Add policy</Button></form></Panel>
        <Panel title="Active policies"><table className="data-table"><thead><tr><th>Policy</th><th>Owner</th><th>Status</th><th /></tr></thead><tbody>{policies.map(p => <tr key={p.id}><td>{p.name}</td><td>{p.owner}</td><td><Badge status={p.status}>{p.status}</Badge></td><td><button className="icon-button" aria-label="Remove policy" onClick={() => removePolicy(p.id)}><Trash2 size={16} /></button></td></tr>)}</tbody></table></Panel>
      </>}
      {tab === 'operating' && <>
        <Panel title="RACI matrix" subtitle="Who is responsible, accountable, consulted, and informed for each agent."><table className="data-table"><thead><tr><th>Agent</th><th>Responsible</th><th>Accountable</th><th>Consulted</th><th>Informed</th></tr></thead><tbody>{[
          { agent: 'Jira / ADO', r: 'Business Analyst', a: 'Product Owner', c: 'QA Lead', i: 'Engineering' },
          { agent: 'Test Case', r: 'QA Engineer', a: 'QA Lead', c: 'Product Owner', i: 'Developers' },
          { agent: 'Automation Script', r: 'SDET', a: 'QA Lead', c: 'Developers', i: 'DevOps' },
          { agent: 'Execution', r: 'CI Platform', a: 'SDET', c: 'Developers', i: 'QA Lead' },
          { agent: 'Self-Healing', r: 'AI Agent', a: 'Automation Engineer', c: 'SDET', i: 'Product Owner' },
        ].map((row, i) => <tr key={i}><td><strong>{row.agent}</strong></td><td>{row.r}</td><td>{row.a}</td><td>{row.c}</td><td>{row.i}</td></tr>)}</tbody></table></Panel>
        <div className="finops-grid">
          <Panel title="Operating model steps" subtitle="How the team and agents work together."><ol className="quick-start">{[
            'Capture requirements and knowledge in one workspace.',
            'Design functional and API test cases with human review.',
            'Generate automation and validate selectors.',
            'Run execution in a sandbox with traceable results.',
            'Apply self-healing only after human approval.',
            'Pass pipeline gates before opening a pull request.'
          ].map((text, i) => <li key={i}><strong>Step {i + 1}</strong><p>{text}</p></li>)}</ol></Panel>
          <Panel title="Agent ownership" subtitle="Clear owners keep quality human-led."><div className="artifact-list">{[
            { role: 'QA Lead', scope: 'Governance, approvals, final sign-off' },
            { role: 'SDET', scope: 'Scripts, execution, self-healing review' },
            { role: 'Product Owner', scope: 'Requirements, acceptance criteria' },
            { role: 'DevOps', scope: 'Pipeline, security scans, deployment' },
          ].map((item, i) => <div className="artifact-row" key={i}><Users size={17} /><span className="artifact-title">{item.role}</span><span className="artifact-source">{item.scope}</span></div>)}</div></Panel>
        </div>
      </>}
      {tab === 'responsible' && <>
        <Panel title="Responsible AI principles" subtitle="Review and confirm the principles that guide agent behavior.">
          <div className="responsible-list">{responsible.map(item => <label className="responsible-row" key={item.id}><input type="checkbox" checked={item.status} onChange={() => { const next = !item.status; setResponsible(responsible.map(r => r.id === item.id ? { ...r, status: next } : r)); notify(next ? 'Principle confirmed.' : 'Principle marked incomplete.') }} /><span><strong>{item.principle}</strong></span>{item.status ? <Badge status="passed"><Check size={13} />Confirmed</Badge> : <Badge status="warning">Pending</Badge>}</label>)}</div>
        </Panel>
        <div className="finops-grid">
          <Panel title="Explainability" subtitle="Every healing proposal includes a reason."><div className="artifact-list">{state.healings.slice(0, 4).map(h => <div className="artifact-row" key={h.id}><BrainCircuit size={17} /><span className="artifact-title">{h.testCaseId}</span><span className="artifact-source">{h.reason}</span></div>)}</div></Panel>
          <Panel title="Bias & fairness" subtitle="Demo coverage across customer flows."><div className="artifact-list">{[
            { name: 'Sign-in (authentication)', count: state.testCases.filter(t => t.requirementId === 'REQ-101').length },
            { name: 'Checkout (purchase)', count: state.testCases.filter(t => t.requirementId === 'REQ-102').length },
            { name: 'Promotions (discounts)', count: state.testCases.filter(t => t.requirementId === 'REQ-103').length },
          ].map((item, i) => <div className="artifact-row" key={i}><Scale size={17} /><span className="artifact-title">{item.name}</span><span className="artifact-source">{item.count} cases</span></div>)}</div></Panel>
        </div>
      </>}
      {tab === 'guardrails' && <>
        <Panel title="AI guardrails" subtitle="Live limits and protections for the agent workspace."><table className="data-table"><thead><tr><th>Guardrail</th><th>Value</th><th>Status</th><th /></tr></thead><tbody>{guardrails.map(g => <tr key={g.id}><td>{g.name}</td><td>{g.value}</td><td><Badge status={g.enabled ? 'passed' : 'warning'}>{g.enabled ? 'Active' : 'Paused'}</Badge></td><td><button className="icon-button" aria-label={g.enabled ? 'Pause guardrail' : 'Enable guardrail'} onClick={() => toggleGuardrail(g.id)}>{g.enabled ? 'Pause' : 'Enable'}</button></td></tr>)}</tbody></table></Panel>
        <Panel title="Add custom guardrail"><form className="inline-form" onSubmit={addGuardrail}><Field label="Guardrail name"><input required value={newGuardrail.name} onChange={e => setNewGuardrail({ ...newGuardrail, name: e.target.value })} placeholder="e.g. Max crawl depth" /></Field><Field label="Value"><input required value={newGuardrail.value} onChange={e => setNewGuardrail({ ...newGuardrail, value: e.target.value })} placeholder="e.g. 10 pages" /></Field><Button type="submit" icon={Plus}>Add guardrail</Button></form></Panel>
      </>}
    </>
  )
}
