import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AGENTS,
  CONNECTOR_CATALOG,
  SUB_AGENTS,
  canRunAgent,
  createInitialState,
  getAgentBlockReason,
  getFinOpsSummary,
  getMetrics,
  getNextAutonomousAgent,
  getPipelineBlockReason,
  getTestLabMetrics,
  initialState,
  loadState,
  reducer,
  saveState,
} from './model.js'

const run = (state, agentId) => reducer(state, { type: 'RUN_AGENT', agentId })
const act = (state, type, fields = {}) => reducer(state, { type, ...fields })

function passingState() {
  let state = run(createInitialState(), 'scripts')
  state = act(state, 'APPLY_HEALING', { id: state.healings[0].id })
  return run(state, 'execution')
}

function approvedState() {
  let state = act(passingState(), 'RUN_PIPELINE')
  state = act(state, 'CREATE_PR', { title: 'Add checkout regression coverage' })
  return act(state, 'APPROVE_PR', { id: state.pullRequests[0].id })
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value)
    Object.values(value).forEach(freeze)
  }
  return value
}

function storage(raw = null) {
  const entries = new Map(raw === null ? [] : [['qa-agent-studio:v1', raw]])
  const mock = {
    getItem: vi.fn((key) => entries.get(key) ?? null),
    setItem: vi.fn((key, value) => entries.set(key, value)),
  }
  vi.stubGlobal('localStorage', mock)
  return mock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('workspace contracts', () => {
  it('exports five agents and seven non-secret connector definitions', () => {
    expect(AGENTS.map(({ id }) => id)).toEqual(['requirements', 'testcases', 'scripts', 'execution', 'healing'])
    for (const agent of AGENTS) {
      for (const key of ['name', 'shortName', 'description', 'icon', 'color', 'outputLabel']) expect(agent[key]).toBeTruthy()
    }
    expect(CONNECTOR_CATALOG.map(({ id }) => id)).toEqual(['jira', 'ado', 'confluence', 'github', 'postgres', 'splunk', 'custom'])
    for (const connector of CONNECTOR_CATALOG) {
      expect(connector.fields.length).toBeGreaterThan(0)
      for (const field of connector.fields) {
        expect(field).toEqual({ key: expect.any(String), label: expect.any(String), placeholder: expect.any(String) })
        expect(`${field.key} ${field.label}`).not.toMatch(/token|password|secret|api.?key/i)
      }
    }
  })

  it('seeds isolated, traceable ecommerce artifacts and explicit historical simulations', () => {
    const state = createInitialState()
    expect(state.project).toBe('Commerce Platform')
    expect(state.requirements).toHaveLength(3)
    expect(state.testCases).toHaveLength(6)
    expect(new Set(state.testCases.map(({ status }) => status))).toEqual(new Set(['ready', 'passed', 'failed']))
    expect(state.scripts).toHaveLength(2)
    expect(state.scripts.every((script) => script.framework === 'Playwright' && state.testCases.some((item) => item.id === script.testCaseId))).toBe(true)
    expect(state.testCases.every((item) => state.requirements.some((requirement) => requirement.id === item.requirementId))).toBe(true)
    expect(state.runs.map(({ total, passed }) => [total, passed])).toEqual([[24, 23], [24, 24]])
    expect(state.runs.every((item) => item.logs.some((line) => /demo simulation/i.test(line)))).toBe(true)
    expect(state.healings).toHaveLength(1)
    expect(state.testCases.find((item) => item.id === state.healings[0].testCaseId).status).toBe('failed')
    expect(state.knowledge).toHaveLength(3)
    expect(state.pullRequests).toEqual([])
    expect(state.pipeline).toMatchObject({ status: 'idle', runNumber: 41 })
    expect(state.pipeline.stages.map(({ id }) => id)).toEqual(['build', 'test', 'sast', 'dast', 'deploy'])
    expect(state.pipeline.stages.every(({ status }) => status === 'pending')).toBe(true)
    expect(Object.values(state.connectors).every((item) => !item.enabled && Object.keys(item.config).length === 0)).toBe(true)
    expect(state.lastAgentRuns).toEqual({})
    state.requirements[0].criteria.push('Changed locally')
    state.connectors.jira.config.project = 'LOCAL'
    expect(createInitialState()).toEqual(initialState)
  })

  it('derives result metrics from the newest run, not the current case statuses', () => {
    const state = createInitialState()
    expect(getMetrics(state)).toEqual({ totalCases: 6, passRate: 96, activeAgents: 0, knowledgeCount: 3, passed: 23, failed: 1 })
    expect(getMetrics({ ...state, runs: [] })).toMatchObject({ passRate: 0, passed: 0, failed: 0 })
    expect(getMetrics(run(state, 'requirements'))).toMatchObject({ activeAgents: 1 })
  })
})

describe('agent prerequisites and generation', () => {
  it('returns the identical state for denied or unknown actions', () => {
    const state = { ...createInitialState(), requirements: [], testCases: [], scripts: [], healings: [], runs: [] }
    expect(canRunAgent(state, 'requirements')).toBe(true)
    for (const id of ['testcases', 'scripts', 'execution', 'healing', 'unknown']) {
      expect(canRunAgent(state, id)).toBe(false)
      expect(getAgentBlockReason(state, id)).not.toBe('')
      expect(run(state, id)).toBe(state)
    }
    for (const type of ['RUN_PIPELINE', 'CREATE_PR', 'APPROVE_PR', 'MERGE_PR', 'APPLY_HEALING', 'DISMISS_HEALING', 'REMOVE_KNOWLEDGE', 'SAVE_CONNECTOR', 'UNKNOWN']) expect(act(state, type, { id: 'missing' })).toBe(state)
    expect(reducer(state, null)).toBe(state)
    expect(act(state, 'ADD_REQUIREMENT', { title: '   ' })).toBe(state)
    expect(act(state, 'ADD_KNOWLEDGE', { items: [null, {}, { name: '' }] })).toBe(state)
  })

  it('permits healing with pending proposals even when there are no failed cases', () => {
    const state = createInitialState()
    state.testCases = state.testCases.map((item) => ({ ...item, status: 'ready' }))
    expect(canRunAgent(state, 'healing')).toBe(true)
    expect(getAgentBlockReason(state, 'healing')).toBe('')
  })

  it('adds unique requirements and timestamps without mutating the input', () => {
    const original = freeze(createInitialState())
    let state = original
    for (let index = 0; index < 4; index += 1) state = run(state, 'requirements')
    expect(original.requirements).toHaveLength(3)
    expect(state.requirements).toHaveLength(7)
    expect(new Set(state.requirements.map(({ id }) => id)).size).toBe(7)
    expect(new Set(state.requirements.map(({ title }) => title)).size).toBe(7)
    expect(state.lastAgentRuns.requirements).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(Number.isFinite(Date.parse(state.lastAgentRuns.requirements))).toBe(true)
  })

  it('generates exactly two cases for uncovered requirements and only missing scripts', () => {
    const original = createInitialState()
    let state = run(original, 'testcases')
    expect(state.testCases).toEqual(original.testCases)
    state = run(state, 'requirements')
    const requirementId = state.requirements.at(-1).id
    state = run(state, 'testcases')
    expect(state.testCases).toHaveLength(8)
    expect(state.testCases.filter((item) => item.requirementId === requirementId)).toHaveLength(2)
    expect(run(state, 'testcases').testCases).toEqual(state.testCases)
    state = run(state, 'scripts')
    expect(state.scripts).toHaveLength(8)
    expect(new Set(state.scripts.map(({ testCaseId }) => testCaseId)).size).toBe(8)
    expect(run(state, 'scripts').scripts).toEqual(state.scripts)
  })

  it('fills a partially covered requirement without creating three cases', () => {
    const state = createInitialState()
    state.testCases = state.testCases.filter((item) => item.id !== 'TC-002')
    const next = run(state, 'testcases')
    expect(next.testCases).toHaveLength(6)
    expect(next.testCases.filter((item) => item.requirementId === 'REQ-101')).toHaveLength(2)
    expect(run(next, 'testcases').testCases).toEqual(next.testCases)
  })

  it('adds direct-action requirements with safe defaults', () => {
    const state = act(createInitialState(), 'ADD_REQUIREMENT', { title: '  Saved addresses  ', source: 'Manual', description: 'Customers can save a delivery address.', priority: 'High' })
    expect(state.requirements.at(-1)).toMatchObject({ title: 'Saved addresses', source: 'Manual', description: 'Customers can save a delivery address.', priority: 'High', criteria: ['Customers can save a delivery address.'] })
    expect(act(state, 'ADD_REQUIREMENT', { title: 'Wish lists' }).requirements.at(-1)).toMatchObject({ title: 'Wish lists', source: 'Manual', priority: 'Medium' })
  })

  it('uses a collision-free fallback when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', undefined)
    let state = createInitialState()
    for (let index = 0; index < 20; index += 1) state = run(state, 'requirements')
    expect(new Set(state.requirements.map(({ id }) => id)).size).toBe(23)
  })
})

describe('execution, healing, pipeline, and pull requests', () => {
  it('requires scripts and a passed latest run to run the pipeline', () => {
    const state = createInitialState()
    expect(getPipelineBlockReason(state)).toMatch(/latest execution must pass/i)
    expect(getPipelineBlockReason({ ...state, scripts: [] })).toMatch(/scripts/i)
    expect(getPipelineBlockReason({ ...state, runs: [] })).toMatch(/execution/i)
    expect(act(state, 'RUN_PIPELINE')).toBe(state)
    expect(getPipelineBlockReason(passingState())).toBe('')
  })

  it('runs the complete failure, reviewed repair, rerun, pipeline, and PR sequence', () => {
    let state = run(createInitialState(), 'scripts')
    state = run(state, 'execution')
    expect(state.runs[0]).toMatchObject({ total: 6, passed: 5, failed: 1, status: 'failed' })
    expect(state.runs[0].logs.join('\n')).toMatch(/DEMO SIMULATION/)
    expect(state.runs[0].logs.join('\n')).toContain('[data-testid="checkout-submit"]')
    const healing = state.healings[0]
    const originalCode = state.scripts.find((item) => item.testCaseId === healing.testCaseId).code
    expect(originalCode).toContain(JSON.stringify(healing.oldSelector))
    state = run(state, 'healing')
    expect(state.healings).toHaveLength(1)
    expect(state.healings[0].status).toBe('pending')
    expect(state.scripts.find((item) => item.testCaseId === healing.testCaseId).code).toBe(originalCode)
    state = run(state, 'execution')
    expect(state.runs[0].failed).toBe(1)
    expect(state.healings).toHaveLength(1)
    state = act(state, 'APPLY_HEALING', { id: healing.id })
    expect(state.healings[0].status).toBe('applied')
    expect(state.testCases.find((item) => item.id === healing.testCaseId).status).toBe('ready')
    expect(state.scripts.find((item) => item.testCaseId === healing.testCaseId).code).toContain(JSON.stringify(healing.newSelector))
    expect(state.scripts.find((item) => item.testCaseId === healing.testCaseId).code).not.toContain(JSON.stringify(healing.oldSelector))
    expect(act(state, 'RUN_PIPELINE')).toBe(state)
    expect(act(state, 'APPLY_HEALING', { id: healing.id })).toBe(state)
    state = run(state, 'execution')
    expect(state.runs[0]).toMatchObject({ total: 6, passed: 6, failed: 0, status: 'passed' })
    expect(state.testCases.every((item) => item.status === 'passed')).toBe(true)
    state = act(state, 'RUN_PIPELINE')
    expect(state.pipeline).toMatchObject({ status: 'passed', runNumber: 42 })
    expect(state.pipeline.stages.every((item) => item.status === 'passed')).toBe(true)
    state = act(state, 'CREATE_PR', { title: 'Automate the commerce regression suite' })
    const pr = state.pullRequests[0]
    expect(pr).toMatchObject({ title: 'Automate the commerce regression suite', branch: 'qa/automation-42', checks: 'passed', status: 'open' })
    expect(act(state, 'CREATE_PR', { title: 'Duplicate branch' })).toBe(state)
    expect(act(state, 'MERGE_PR', { id: pr.id })).toBe(state)
    state = act(state, 'APPROVE_PR', { id: pr.id })
    expect(state.pullRequests[0].status).toBe('approved')
    state = act(state, 'MERGE_PR', { id: pr.id })
    expect(state.pullRequests[0].status).toBe('merged')
    expect(act(state, 'MERGE_PR', { id: pr.id })).toBe(state)
    expect(state.activity[0].detail).toMatch(/local demo state/i)
  })

  it('creates only one pending proposal for a failed case when no proposal exists', () => {
    let state = { ...createInitialState(), healings: [] }
    state = run(state, 'execution')
    expect(state.healings).toHaveLength(1)
    state = run(state, 'healing')
    state = run(state, 'execution')
    expect(state.healings).toHaveLength(1)
    expect(state.healings[0]).toMatchObject({ testCaseId: 'TC-003', status: 'pending' })
  })

  it('dismisses only pending repairs without modifying scripts or marking tests passed', () => {
    const original = createInitialState()
    const id = original.healings[0].id
    const state = act(original, 'DISMISS_HEALING', { id })
    expect(state.healings[0].status).toBe('dismissed')
    expect(state.scripts).toBe(original.scripts)
    expect(state.testCases).toBe(original.testCases)
    expect(act(state, 'DISMISS_HEALING', { id })).toBe(state)
    expect(act(state, 'APPLY_HEALING', { id })).toBe(state)
    expect(run(state, 'healing').healings).toHaveLength(1)
    expect(run(state, 'execution').runs[0].status).toBe('failed')
    const applied = act(original, 'APPLY_HEALING', { id })
    expect(act(applied, 'DISMISS_HEALING', { id })).toBe(applied)
  })

  it.each(['requirements', 'testcases', 'scripts'])('invalidates checks and approval when the %s agent produces new work', (agentId) => {
    let state = approvedState()
    if (agentId === 'testcases') state = { ...state, testCases: state.testCases.slice(1) }
    if (agentId === 'scripts') state = { ...state, scripts: state.scripts.slice(1) }
    const next = run(state, agentId)
    expect(next.artifactRevision).toBe(state.artifactRevision + 1)
    expect(next.runs[0].artifactRevision).toBe(state.artifactRevision)
    expect(getPipelineBlockReason(next)).toMatch(/stale/i)
    expect(act(next, 'RUN_PIPELINE')).toBe(next)
    expect(next.pipeline.status).toBe('idle')
    expect(next.pipeline.stages.every((item) => item.status === 'pending')).toBe(true)
    expect(next.pullRequests[0]).toMatchObject({ status: 'open', checks: 'pending' })
    expect(act(next, 'APPROVE_PR', { id: next.pullRequests[0].id })).toBe(next)
    expect(act(next, 'MERGE_PR', { id: next.pullRequests[0].id })).toBe(next)
  })

  it('does not invalidate a passed pipeline when generation finds no missing work', () => {
    const state = approvedState()
    expect(run(state, 'testcases').pipeline.status).toBe('passed')
    expect(run(state, 'scripts').pullRequests[0].status).toBe('approved')
  })

  it('invalidates manual new work and allows reapproval only after checks pass again', () => {
    const original = approvedState()
    let state = act(original, 'ADD_REQUIREMENT', { title: 'Guest checkout' })
    expect(state.pipeline.status).toBe('idle')
    expect(state.pullRequests[0]).toMatchObject({ status: 'open', checks: 'pending' })
    state = run(state, 'testcases')
    state = run(state, 'scripts')
    state = run(state, 'execution')
    state = act(state, 'RUN_PIPELINE')
    expect(state.pipeline.runNumber).toBe(43)
    expect(state.pullRequests[0]).toMatchObject({ status: 'open', checks: 'passed' })
    state = act(state, 'APPROVE_PR', { id: state.pullRequests[0].id })
    expect(state.pullRequests[0].status).toBe('approved')
  })

  it('preserves already merged PRs when artifacts change', () => {
    let state = approvedState()
    state = act(state, 'MERGE_PR', { id: state.pullRequests[0].id })
    const pr = state.pullRequests[0]
    state = run(state, 'requirements')
    expect(state.pullRequests[0]).toBe(pr)
  })

  it('invalidates a previously approved PR on execution failure and on applying healing', () => {
    const approved = approvedState()
    const seed = createInitialState()
    const broken = { ...approved, scripts: seed.scripts, healings: seed.healings, testCases: seed.testCases }
    for (const next of [run(broken, 'execution'), act(broken, 'APPLY_HEALING', { id: broken.healings[0].id })]) {
      expect(next.pipeline.status).toBe('idle')
      expect(next.pullRequests[0]).toMatchObject({ status: 'open', checks: 'pending' })
    }
  })

  it('guards approvals and merges independently on check and pipeline state', () => {
    const state = approvedState()
    const id = state.pullRequests[0].id
    for (const type of ['APPROVE_PR', 'MERGE_PR']) {
      const status = type === 'APPROVE_PR' ? 'open' : 'approved'
      const blockedChecks = { ...state, pullRequests: [{ ...state.pullRequests[0], status, checks: 'pending' }] }
      expect(act(blockedChecks, type, { id })).toBe(blockedChecks)
      const blockedPipeline = { ...state, pipeline: { ...state.pipeline, status: 'idle' }, pullRequests: [{ ...state.pullRequests[0], status }] }
      expect(act(blockedPipeline, type, { id })).toBe(blockedPipeline)
    }
  })

  it('limits run and activity histories to 50 entries, newest first', () => {
    let state = passingState()
    const firstRunId = state.runs[0].id
    for (let index = 0; index < 55; index += 1) state = run(state, 'execution')
    expect(state.runs).toHaveLength(50)
    expect(state.activity).toHaveLength(50)
    expect(state.runs.some((item) => item.id === firstRunId)).toBe(false)
    expect(new Set(state.runs.map(({ id }) => id)).size).toBe(50)
  })
})

describe('artifact freshness and complete coverage', () => {
  it('tracks revisions only when requirements, cases, scripts, or applied healing change', () => {
    let state = createInitialState()
    expect(state.artifactRevision).toBe(0)
    expect(state.runs.every((item) => item.artifactRevision === undefined)).toBe(true)
    state = run(state, 'healing')
    state = run(state, 'testcases')
    state = act(state, 'ADD_KNOWLEDGE', { items: [{ name: 'Context' }] })
    state = act(state, 'SAVE_CONNECTOR', { id: 'jira', config: { project: 'COM' }, enabled: true })
    expect(state.artifactRevision).toBe(0)
    state = act(state, 'ADD_REQUIREMENT', { title: 'Order returns' })
    expect(state.artifactRevision).toBe(1)
    state = run(state, 'testcases')
    expect(state.artifactRevision).toBe(2)
    state = run(state, 'scripts')
    expect(state.artifactRevision).toBe(3)
    state = act(state, 'APPLY_HEALING', { id: state.healings[0].id })
    expect(state.artifactRevision).toBe(4)
    state = run(state, 'execution')
    expect(state.artifactRevision).toBe(4)
    expect(state.runs[0].artifactRevision).toBe(4)
    expect(getPipelineBlockReason(state)).toBe('')
    state = act(state, 'RUN_PIPELINE')
    expect(state.artifactRevision).toBe(4)
    expect(run(state, 'testcases').artifactRevision).toBe(4)
    expect(run(state, 'scripts').artifactRevision).toBe(4)
    const dismissed = act(createInitialState(), 'DISMISS_HEALING', { id: 'HEAL-001' })
    expect(dismissed.artifactRevision).toBe(0)
  })

  it('requires a fresh execution after every artifact generation step', () => {
    let state = act(passingState(), 'ADD_REQUIREMENT', { title: 'Guest checkout' })
    for (const nextAgent of ['testcases', 'scripts', 'execution']) {
      expect(getPipelineBlockReason(state)).toMatch(/stale/i)
      expect(act(state, 'RUN_PIPELINE')).toBe(state)
      state = run(state, nextAgent)
    }
    expect(getPipelineBlockReason(state)).toBe('')
    expect(act(state, 'RUN_PIPELINE').pipeline.status).toBe('passed')
  })

  it('blocks fresh partial runs with unscripted ready test cases', () => {
    let state = createInitialState()
    state = act(state, 'APPLY_HEALING', { id: state.healings[0].id })
    state = run(state, 'execution')
    expect(state.runs[0]).toMatchObject({ status: 'passed', total: 2, artifactRevision: state.artifactRevision })
    expect(state.testCases.some((item) => item.status === 'ready')).toBe(true)
    expect(getPipelineBlockReason(state)).toMatch(/scripts for every test case/i)
    expect(act(state, 'RUN_PIPELINE')).toBe(state)
    state = run(state, 'scripts')
    expect(getPipelineBlockReason(state)).toMatch(/stale/i)
    state = run(state, 'execution')
    expect(getPipelineBlockReason(state)).toBe('')
  })

  it('requires at least two linked cases for each requirement even when all scripted cases pass', () => {
    let state = act(passingState(), 'ADD_REQUIREMENT', { title: 'Uncovered story' })
    state = run(state, 'execution')
    expect(getPipelineBlockReason(state)).toMatch(/2 linked test cases for every requirement/i)
    expect(act(state, 'RUN_PIPELINE')).toBe(state)
    const covered = passingState()
    const partiallyCovered = run({ ...covered, testCases: covered.testCases.slice(1) }, 'execution')
    expect(getPipelineBlockReason(partiallyCovered)).toMatch(/2 linked test cases/i)
    const orphanCase = { ...covered.testCases[0], id: 'TC-ORPHAN', requirementId: 'REQ-MISSING' }
    const orphaned = run({ ...covered, testCases: [...covered.testCases, orphanCase], scripts: [...covered.scripts, { ...covered.scripts[0], id: 'SCRIPT-ORPHAN', testCaseId: orphanCase.id }] }, 'execution')
    expect(getPipelineBlockReason(orphaned)).toMatch(/Link every test case/i)
  })

  it('treats historical and unversioned successful executions as stale', () => {
    const state = passingState()
    const historical = { ...state, runs: [createInitialState().runs[1]] }
    expect(getPipelineBlockReason(historical)).toMatch(/stale/i)
    expect(act(historical, 'RUN_PIPELINE')).toBe(historical)
    const unversionedRun = { ...state.runs[0] }
    delete unversionedRun.artifactRevision
    expect(getPipelineBlockReason({ ...state, runs: [unversionedRun] })).toMatch(/stale/i)
  })

  it('invalidates checks after a new successful execution without changing artifact revision', () => {
    const original = approvedState()
    let state = run(freeze(original), 'execution')
    expect(state.artifactRevision).toBe(original.artifactRevision)
    expect(state.runs[0].status).toBe('passed')
    expect(state.pipeline).toMatchObject({ status: 'idle', runNumber: 42 })
    expect(state.pullRequests[0]).toMatchObject({ status: 'open', checks: 'pending' })
    expect(act(state, 'CREATE_PR')).toBe(state)
    expect(act(state, 'APPROVE_PR', { id: state.pullRequests[0].id })).toBe(state)
    expect(act(state, 'MERGE_PR', { id: state.pullRequests[0].id })).toBe(state)
    state = act(state, 'RUN_PIPELINE')
    expect(state.pipeline.runNumber).toBe(43)
    expect(state.pullRequests[0]).toMatchObject({ status: 'open', checks: 'passed' })
    state = act(state, 'APPROVE_PR', { id: state.pullRequests[0].id })
    expect(act(state, 'MERGE_PR', { id: state.pullRequests[0].id }).pullRequests[0].status).toBe('merged')
  })

  it('invalidates a successful run when another pending selector repair is applied', () => {
    const original = passingState()
    const healing = { ...original.healings[0], id: 'HEAL-FOLLOWUP', oldSelector: original.healings[0].newSelector, newSelector: '[data-testid="confirm-order"]', status: 'pending' }
    const state = act({ ...original, healings: [healing, ...original.healings] }, 'APPLY_HEALING', { id: healing.id })
    expect(state.artifactRevision).toBe(original.artifactRevision + 1)
    expect(state.runs[0].status).toBe('passed')
    expect(getPipelineBlockReason(state)).toMatch(/stale/i)
    expect(act(state, 'RUN_PIPELINE')).toBe(state)
    expect(getPipelineBlockReason(run(state, 'execution'))).toBe('')
  })

  it('does not trust passed labels when execution totals or current case statuses are incomplete', () => {
    const state = passingState()
    const mismatchedTotal = { ...state, runs: [{ ...state.runs[0], total: 1, passed: 1 }] }
    expect(getPipelineBlockReason(mismatchedTotal)).toMatch(/every current test case/i)
    const unverifiedCase = { ...state, testCases: state.testCases.map((item, index) => index === 0 ? { ...item, status: 'ready' } : item) }
    expect(getPipelineBlockReason(unverifiedCase)).toMatch(/every current test case/i)
  })

  it('escapes generated titles and selectors and keeps repaired selectors as safe literals', () => {
    const state = createInitialState()
    const title = 'Checkout "quoted"\nwith an apostrophe\' and `backtick`'
    const selector = '[data-testid="customer\'s-order\\path"]\n$&`'
    state.testCases[0] = { ...state.testCases[0], title }
    state.scripts = []
    state.healings = [{ ...state.healings[0], testCaseId: state.testCases[0].id, status: 'applied', newSelector: selector }]
    const generated = run(state, 'scripts')
    const script = generated.scripts[0]
    expect(script.code).toContain(`test(${JSON.stringify(title)},`)
    expect(script.code).toContain(`page.locator(${JSON.stringify(selector)})`)
    const healingState = createInitialState()
    healingState.healings[0] = { ...healingState.healings[0], newSelector: selector }
    const healed = act(healingState, 'APPLY_HEALING', { id: healingState.healings[0].id })
    expect(healed.scripts[1].code).toContain(`page.locator(${JSON.stringify(selector)})`)
    for (const code of [script.code, healed.scripts[1].code]) expect(() => new Function('test', 'expect', code.replace(/^import[^\n]*\n/, ''))).not.toThrow()
  })
})

describe('knowledge and connector configuration', () => {
  it('adds and removes local knowledge with generated identity and timestamps', () => {
    const original = createInitialState()
    const state = act(original, 'ADD_KNOWLEDGE', { items: [{ id: 'untrusted', addedAt: 'invalid', name: '  Shipping rules.md ', source: 'Upload', type: 'Markdown', size: '2 KB', content: 'Free shipping over $50.' }, { name: 'API schema', size: 2048 }] })
    expect(state.knowledge).toHaveLength(5)
    expect(state.knowledge[0]).toMatchObject({ name: 'Shipping rules.md', source: 'Upload', content: 'Free shipping over $50.', size: '2 KB' })
    expect(state.knowledge[0].id).not.toBe('untrusted')
    expect(Number.isFinite(Date.parse(state.knowledge[0].addedAt))).toBe(true)
    expect(state.knowledge[1]).toMatchObject({ source: 'Upload', type: 'Document', size: 2048 })
    expect(act(state, 'REMOVE_KNOWLEDGE', { id: state.knowledge[0].id }).knowledge).toHaveLength(4)
    expect(original.knowledge).toHaveLength(3)
  })

  it('stores only allowlisted non-secret connector fields and respects enabled state', () => {
    const original = createInitialState()
    const state = act(original, 'SAVE_CONNECTOR', { id: 'jira', enabled: true, config: { baseUrl: ' https://example.atlassian.net ', project: ' COM ', token: 'do-not-save', password: 'do-not-save', arbitrary: 'ignored' } })
    expect(state.connectors.jira).toEqual({ enabled: true, config: { baseUrl: 'https://example.atlassian.net', project: 'COM' } })
    expect(original.connectors.jira).toEqual({ enabled: false, config: {} })
    expect(state.activity[0].detail).toMatch(/No connection was attempted/)
    expect(act(state, 'SAVE_CONNECTOR', { id: 'jira', enabled: false, config: state.connectors.jira.config }).connectors.jira.enabled).toBe(false)
    expect(act(state, 'SAVE_CONNECTOR', { id: 'jira', enabled: true, config: null }).connectors.jira.config).toEqual({})
  })
})

describe('local persistence', () => {
  it('round-trips a valid workspace using the exact versioned key', () => {
    const mock = storage()
    const state = approvedState()
    expect(saveState(state)).toBe(true)
    expect(mock.setItem).toHaveBeenCalledWith('qa-agent-studio:v1', JSON.stringify(state))
    expect(loadState()).toEqual(state)
    expect(mock.getItem).toHaveBeenCalledWith('qa-agent-studio:v1')
  })

  it.each(['not json', 'null', '[]', '17', '"text"'])('recovers gracefully from malformed storage: %s', (raw) => {
    storage(raw)
    expect(loadState()).toEqual(createInitialState())
  })

  it('merges partial state with defaults and retains intentionally empty arrays', () => {
    storage(JSON.stringify({ project: 'My QA workspace', requirements: [], lastAgentRuns: { requirements: '2026-06-18T11:00:00.000Z', unknown: '2026-06-18T11:00:00.000Z', scripts: 'bad date' } }))
    expect(loadState()).toMatchObject({ project: 'My QA workspace', requirements: [], lastAgentRuns: { requirements: '2026-06-18T11:00:00.000Z' } })
    expect(loadState().scripts).toHaveLength(2)
  })

  it('validates malformed array entries, nested collections, and pipeline stages', () => {
    storage(JSON.stringify({ project: {}, requirements: [{ id: 'bad', title: 'Missing fields' }], testCases: [null], scripts: 'bad', runs: [{ id: 'bad', total: -1 }], healings: [{}], knowledge: [1], activity: [null], pullRequests: 'bad', pipeline: { status: 'passed', runNumber: '42', stages: [null] }, connectors: { jira: { enabled: true, config: { project: 'COM', token: 'never-save' } }, github: null }, lastAgentRuns: [] }))
    const state = loadState()
    const defaults = createInitialState()
    for (const key of ['project', 'requirements', 'testCases', 'scripts', 'runs', 'healings', 'knowledge', 'activity', 'pullRequests', 'pipeline', 'lastAgentRuns']) expect(state[key]).toEqual(defaults[key])
    expect(state.connectors.jira).toEqual({ enabled: true, config: { project: 'COM' } })
    expect(state.connectors.github).toEqual({ enabled: false, config: {} })
    expect(() => getMetrics(state)).not.toThrow()
    expect(() => run(state, 'execution')).not.toThrow()
  })

  it('rejects invalid nested fields and duplicate identities instead of crashing the UI', () => {
    const state = createInitialState()
    state.requirements[0].criteria = null
    state.testCases[0].steps = { bad: true }
    state.runs[0].logs = [null]
    state.knowledge[0].content = { bad: true }
    state.scripts.push({ ...state.scripts[0] })
    state.pipeline.stages[1].id = 'build'
    storage(JSON.stringify(state))
    expect(loadState()).toEqual(createInitialState())
  })

  it('invalidates persisted passed checks when the latest run is failed', () => {
    const state = approvedState()
    state.runs = createInitialState().runs
    storage(JSON.stringify(state))
    const loaded = loadState()
    expect(loaded.pipeline.status).toBe('idle')
    expect(loaded.pullRequests[0]).toMatchObject({ status: 'open', checks: 'pending' })
  })

  it('preserves revisions across storage and rejects stale persisted successes', () => {
    const state = approvedState()
    state.artifactRevision += 1
    storage(JSON.stringify(state))
    const loaded = loadState()
    expect(loaded.artifactRevision).toBe(state.artifactRevision)
    expect(loaded.runs[0].artifactRevision).toBe(state.runs[0].artifactRevision)
    expect(loaded.pipeline.status).toBe('idle')
    expect(loaded.pullRequests[0]).toMatchObject({ status: 'open', checks: 'pending' })
    expect(getPipelineBlockReason(loaded)).toMatch(/stale/i)
  })

  it.each([undefined, null, -1, '2', 1.5])('defaults invalid workspace revisions without trusting old checks: %s', (revision) => {
    const state = approvedState()
    state.artifactRevision = revision
    storage(JSON.stringify(state))
    const loaded = loadState()
    expect(loaded.artifactRevision).toBe(0)
    expect(loaded.runs[0].artifactRevision).toBeUndefined()
    expect(loaded.pipeline.status).toBe('idle')
    expect(loaded.pullRequests[0]).toMatchObject({ status: 'open', checks: 'pending' })
    expect(getPipelineBlockReason(loaded)).toMatch(/stale/i)
    expect(getPipelineBlockReason(run(loaded, 'execution'))).toBe('')
  })

  it('invalidates persisted runs when malformed artifacts must be replaced by defaults', () => {
    const state = approvedState()
    state.requirements = [null]
    storage(JSON.stringify(state))
    const loaded = loadState()
    expect(loaded.requirements).toEqual(createInitialState().requirements)
    expect(loaded.runs[0].artifactRevision).toBeUndefined()
    expect(loaded.pipeline.status).toBe('idle')
    expect(loaded.pullRequests[0]).toMatchObject({ status: 'open', checks: 'pending' })
  })

  it('rejects malformed run revision metadata and clears approvals on idle persisted pipelines', () => {
    const state = approvedState()
    state.runs[0].artifactRevision = '2'
    state.pipeline = createInitialState().pipeline
    storage(JSON.stringify(state))
    const loaded = loadState()
    expect(loaded.runs).toEqual(createInitialState().runs)
    expect(loaded.pullRequests[0]).toMatchObject({ status: 'open', checks: 'pending' })
  })

  it('handles unavailable, denied, and full storage without throwing', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(loadState()).toEqual(createInitialState())
    expect(saveState(createInitialState())).toBe(false)
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Access denied') }, setItem: () => { throw new Error('Quota exceeded') } })
    expect(loadState()).toEqual(createInitialState())
    expect(saveState(createInitialState())).toBe(false)
  })
})

describe('test lab, autonomy, and FinOps', () => {
  it('seeds sub-agents, test lab data, and FinOps summaries', () => {
    const state = createInitialState()
    expect(SUB_AGENTS).toHaveLength(7)
    expect(SUB_AGENTS.every((item) => Number.isInteger(item.tokenCost) && item.tokenCost >= 10 && item.tokenCost <= 500 && /^#[0-9a-f]{6}$/i.test(item.color))).toBe(true)
    expect(getTestLabMetrics(state)).toEqual({ harCount: 1, apiTestCount: 3, crawlCount: 1 })
    expect(getFinOpsSummary(state)).toEqual({ awsTotal: 142.17, tokenTotal: 2450, topService: 'EC2', topAgent: 'scripts', topSubAgent: 'script-optimizer', runCount: 1 })
    expect(state.autonomous).toEqual({ enabled: false, queue: [], lastRunAt: null })
  })

  it('imports HAR entries without changing artifact or pipeline revisions', () => {
    const original = createInitialState()
    const state = act(original, 'IMPORT_HAR', { fileName: 'orders.har', entries: [{ method: 'GET', url: 'https://example.test/api/orders', status: 200, mimeType: 'application/json' }, { method: 'PATCH', url: 'https://example.test/api/orders/1', status: 200, mimeType: 'application/json' }, { method: 'POST', url: 'https://example.test/login', status: 401, mimeType: 'application/json' }] })
    expect(state.testLab.harImports.at(-1)).toMatchObject({ fileName: 'orders.har', entryCount: 3 })
    expect(state.testLab.apiTests.at(-1)).toMatchObject({ name: 'GET /api/orders', expectedStatus: 200, status: 'generated' })
    expect(state.testLab.apiTests).toHaveLength(4)
    expect(state.artifactRevision).toBe(original.artifactRevision)
    expect(state.pipeline).toEqual(original.pipeline)
    expect(act(original, 'IMPORT_HAR', { fileName: '', entries: [] })).toBe(original)
  })

  it('adds crawl scenarios and AWS usage', () => {
    const original = createInitialState()
    let state = act(original, 'ADD_CRAWL_SCENARIO', { name: 'Account crawl', startUrl: 'https://commerce.example.test/account', maxPages: 5, discovered: [{ url: 'https://commerce.example.test/account', title: 'Account' }] })
    expect(state.testLab.crawlScenarios.at(-1)).toMatchObject({ name: 'Account crawl', maxPages: 5, pageCount: 1 })
    expect(state.artifactRevision).toBe(0)
    state = act(state, 'ADD_AWS_USAGE', { service: 'S3', cost: 1.4 })
    state = act(state, 'ADD_AWS_USAGE', { service: 'DynamoDB', cost: 2.03 })
    expect(state.finOps.aws.services.find((item) => item.service === 'S3').cost).toBe(20)
    expect(state.finOps.aws.services.find((item) => item.service === 'DynamoDB')).toMatchObject({ cost: 2.03, unit: 'USD', trend: 'flat' })
    expect(state.finOps.aws.total).toBe(145.6)
  })

  it('toggles autonomy and chooses lifecycle agents after the last autonomous run', () => {
    let state = act(createInitialState(), 'TOGGLE_AUTONOMOUS', { enabled: true })
    expect(state.autonomous.enabled).toBe(true)
    expect(getNextAutonomousAgent(state)).toBe('requirements')
    state = { ...state, autonomous: { ...state.autonomous, lastRunAt: '2026-06-18T11:00:00.000Z' }, lastAgentRuns: { requirements: '2026-06-18T11:01:00.000Z' } }
    expect(getNextAutonomousAgent(state)).toBe('testcases')
    state = { ...state, lastAgentRuns: Object.fromEntries(AGENTS.map(({ id }) => [id, '2026-06-18T11:01:00.000Z'])) }
    expect(getNextAutonomousAgent(state)).toBeNull()
  })

  it('accumulates parent and sub-agent tokens on every agent run', () => {
    const original = createInitialState()
    const state = run(original, 'testcases')
    expect(state.finOps.tokens.total - original.finOps.tokens.total).toBe(580)
    expect(state.finOps.tokens.byAgent.testcases - original.finOps.tokens.byAgent.testcases).toBe(320)
    expect(state.finOps.tokens.bySubAgent['har-parser'] - original.finOps.tokens.bySubAgent['har-parser']).toBe(80)
    expect(state.finOps.tokens.bySubAgent['api-scenario-writer'] - original.finOps.tokens.bySubAgent['api-scenario-writer']).toBe(180)
    expect(state.finOps.tokens.byRun[0]).toMatchObject({ agent: 'Test cases', tokens: 580 })
    expect(state.subAgentRuns.map(({ subAgentId }) => subAgentId)).toEqual(['har-parser', 'api-scenario-writer'])
    expect(state.subAgentRuns.every((item) => item.parentId === 'testcases' && Number.isFinite(Date.parse(item.time)))).toBe(true)
  })

  it('defaults malformed persisted test lab and FinOps collections', () => {
    const defaults = createInitialState()
    storage(JSON.stringify({ testLab: { harImports: [null], crawlScenarios: 'bad', apiTests: [{}] }, finOps: { aws: { services: [null] }, tokens: { byRun: [null] } }, autonomous: { enabled: true, queue: ['requirements', 'unknown'], lastRunAt: 'bad' }, subAgentRuns: [null] }))
    const state = loadState()
    expect(state.testLab).toEqual(defaults.testLab)
    expect(state.finOps).toEqual(defaults.finOps)
    expect(state.subAgentRuns).toEqual([])
    expect(state.autonomous).toEqual({ enabled: true, queue: ['requirements'], lastRunAt: null })
  })
})
