export const AGENTS = [
  { id: 'requirements', name: 'Jira / ADO Agent', shortName: 'Requirements', description: 'Turn demo Jira and Azure DevOps stories into clear, testable requirements.', icon: 'FileText', color: '#8b5cf6', outputLabel: 'Requirements' },
  { id: 'testcases', name: 'Functional Test Case Agent', shortName: 'Test cases', description: 'Generate traceable happy-path and validation scenarios for every requirement.', icon: 'ListChecks', color: '#3b82f6', outputLabel: 'Test cases' },
  { id: 'scripts', name: 'Automation Script Agent', shortName: 'Scripts', description: 'Create readable Playwright automation from your functional test cases.', icon: 'Code2', color: '#06b6d4', outputLabel: 'Scripts' },
  { id: 'execution', name: 'Automation Execution Agent', shortName: 'Execution', description: 'Simulate a test run and review deterministic results and execution logs.', icon: 'Play', color: '#10b981', outputLabel: 'Test runs' },
  { id: 'healing', name: 'Self-Healing Agent', shortName: 'Self-healing', description: 'Propose selector repairs for failed tests, with human approval before applying.', icon: 'WandSparkles', color: '#f59e0b', outputLabel: 'Healing proposals' },
]

export const SUB_AGENTS = [
  { id: 'har-parser', parentId: 'testcases', name: 'HAR API Scenario Parser', description: 'Parses captured HTTP traffic into reusable API scenarios.', tokenCost: 80, color: '#f59e0b' },
  { id: 'api-scenario-writer', parentId: 'testcases', name: 'API Scenario Writer', description: 'Turns API traffic into clear generated test scenarios.', tokenCost: 180, color: '#3b82f6' },
  { id: 'ui-crawler', parentId: 'requirements', name: 'UI Crawler', description: 'Discovers application pages and candidate user journeys.', tokenCost: 150, color: '#8b5cf6' },
  { id: 'selector-analyst', parentId: 'healing', name: 'Selector Drift Analyst', description: 'Reviews selector changes and proposes stable alternatives.', tokenCost: 140, color: '#f97316' },
  { id: 'script-optimizer', parentId: 'scripts', name: 'Automation Script Optimizer', description: 'Improves generated automation for clarity and reuse.', tokenCost: 220, color: '#06b6d4' },
  { id: 'token-monitor', parentId: '*', name: 'Token Consumption Monitor', description: 'Tracks token consumption for agent activity.', tokenCost: 130, color: '#10b981' },
  { id: 'aws-cost-scout', parentId: '*', name: 'AWS Cost Scout', description: 'Summarizes AWS service costs and trends.', tokenCost: 150, color: '#ef4444' },
]

export const CONNECTOR_CATALOG = [
  { id: 'jira', name: 'Jira', category: 'Project management', description: 'Map demo stories, acceptance criteria, and issue priorities.', initials: 'JI', color: '#2684ff', fields: [{ key: 'baseUrl', label: 'Workspace URL', placeholder: 'https://your-team.atlassian.net' }, { key: 'project', label: 'Project key', placeholder: 'COM' }] },
  { id: 'ado', name: 'Azure DevOps', category: 'Project management', description: 'Configure a demo organization and project for work items.', initials: 'AZ', color: '#0078d4', fields: [{ key: 'baseUrl', label: 'Organization URL', placeholder: 'https://dev.azure.com/your-team' }, { key: 'project', label: 'Project', placeholder: 'Commerce Platform' }] },
  { id: 'confluence', name: 'Confluence', category: 'Knowledge', description: 'Describe the documentation space used as demo context.', initials: 'CO', color: '#1868db', fields: [{ key: 'baseUrl', label: 'Workspace URL', placeholder: 'https://your-team.atlassian.net/wiki' }, { key: 'space', label: 'Space key', placeholder: 'PRODUCT' }] },
  { id: 'github', name: 'GitHub', category: 'Source control', description: 'Configure a demo repository for generated automation.', initials: 'GH', color: '#64748b', fields: [{ key: 'repository', label: 'Repository', placeholder: 'your-team/commerce-tests' }, { key: 'branch', label: 'Default branch', placeholder: 'main' }] },
  { id: 'postgres', name: 'PostgreSQL', category: 'Database', description: 'Describe a demo test-data database without credentials.', initials: 'PG', color: '#336791', fields: [{ key: 'host', label: 'Host', placeholder: 'localhost:5432' }, { key: 'database', label: 'Database', placeholder: 'commerce_test' }] },
  { id: 'splunk', name: 'Splunk', category: 'Observability', description: 'Configure a demo search workspace for execution context.', initials: 'SP', color: '#65a637', fields: [{ key: 'baseUrl', label: 'Workspace URL', placeholder: 'https://splunk.example.com' }, { key: 'index', label: 'Index', placeholder: 'commerce-qa' }] },
  { id: 'custom', name: 'Custom connector', category: 'Custom', description: 'Describe a custom demo endpoint. No external requests are made.', initials: 'CU', color: '#a855f7', fields: [{ key: 'name', label: 'Display name', placeholder: 'Internal knowledge API' }, { key: 'baseUrl', label: 'Base URL', placeholder: 'https://api.example.com' }] },
]

const STORAGE_KEY = 'qa-agent-studio:v1'
const OLD_SELECTOR = '[data-testid="checkout-submit"]'
const NEW_SELECTOR = '[data-testid="place-order-button"]'
const STAGES = [
  { id: 'build', name: 'Build' },
  { id: 'test', name: 'Test' },
  { id: 'sast', name: 'SAST' },
  { id: 'dast', name: 'DAST' },
  { id: 'deploy', name: 'Deploy' },
]
const now = () => new Date().toISOString()
let sequence = 0
const makeId = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${(++sequence).toString(36)}`}`
const text = (value, fallback = '') => typeof value === 'string' ? value.trim() : fallback
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const pendingStages = () => STAGES.map((stage) => ({ ...stage, status: 'pending' }))
const validRevision = (value) => Number.isSafeInteger(value) && value >= 0
const artifactRevision = (state) => validRevision(state.artifactRevision) ? state.artifactRevision : 0
const encodedSelector = (selector) => JSON.stringify(selector).slice(1, -1)

function playwrightCode(testCase, selector = '[data-testid="sign-in-button"]') {
  return `import { test, expect } from '@playwright/test';\n\ntest(${JSON.stringify(testCase.title)}, async ({ page }) => {\n  await page.goto('https://commerce.example.test');\n  await page.locator(${JSON.stringify(selector)}).click();\n  await expect(page.getByRole('status')).toBeVisible();\n});\n`
}

export function createInitialState() {
  const requirements = [
    { id: 'REQ-101', title: 'Secure customer sign-in', source: 'Jira', priority: 'High', description: 'Customers can sign in with a registered email and password and receive clear feedback for invalid credentials.', criteria: ['Valid credentials open the customer account.', 'Invalid credentials show a safe error without exposing account details.', 'Account pages are unavailable to signed-out visitors.'] },
    { id: 'REQ-102', title: 'Reliable checkout and order confirmation', source: 'Azure DevOps', priority: 'Critical', description: 'Customers can review their cart, submit a valid payment, and receive a unique order confirmation.', criteria: ['The checkout displays the correct items, tax, and total.', 'A successful payment creates one order and shows its confirmation.', 'An invalid payment keeps the cart intact and displays an error.'] },
    { id: 'REQ-103', title: 'Promotional discounts in the cart', source: 'Jira', priority: 'Medium', description: 'Customers can apply an eligible promotional code and understand why expired codes are rejected.', criteria: ['A valid promotion updates the total immediately.', 'Expired codes do not change the total.', 'Removing a promotion restores the original total.'] },
  ]
  const testCases = [
    { id: 'TC-001', requirementId: 'REQ-101', title: 'Sign in with valid customer credentials', type: 'Positive', priority: 'High', steps: ['Open the sign-in page.', 'Enter a registered demo email and password.', 'Select Sign in.'], expected: 'The customer account opens and a welcome message appears.', status: 'passed' },
    { id: 'TC-002', requirementId: 'REQ-101', title: 'Reject incorrect sign-in credentials', type: 'Negative', priority: 'High', steps: ['Open the sign-in page.', 'Enter an incorrect demo password.', 'Select Sign in.'], expected: 'A safe error appears and the customer remains signed out.', status: 'ready' },
    { id: 'TC-003', requirementId: 'REQ-102', title: 'Complete checkout with a valid payment', type: 'Positive', priority: 'Critical', steps: ['Add a demo item to the cart.', 'Enter a valid delivery address and demo payment.', 'Select Place order.'], expected: 'A unique order confirmation appears with the correct total.', status: 'failed' },
    { id: 'TC-004', requirementId: 'REQ-102', title: 'Keep the cart after a declined payment', type: 'Negative', priority: 'Critical', steps: ['Add a demo item to the cart.', 'Use the demo declined-payment fixture.', 'Submit checkout.'], expected: 'Payment is rejected, the cart is preserved, and no order is created.', status: 'ready' },
    { id: 'TC-005', requirementId: 'REQ-103', title: 'Apply an eligible promotional code', type: 'Positive', priority: 'Medium', steps: ['Add an eligible item to the cart.', 'Enter the demo SAVE10 promotion.', 'Apply the code.'], expected: 'The eligible subtotal is discounted by 10 percent.', status: 'passed' },
    { id: 'TC-006', requirementId: 'REQ-103', title: 'Reject an expired promotional code', type: 'Negative', priority: 'Medium', steps: ['Add an item to the cart.', 'Enter an expired demo promotion.', 'Apply the code.'], expected: 'An expiry message appears and the total remains unchanged.', status: 'ready' },
  ]
  return {
    project: 'Commerce Platform',
    artifactRevision: 0,
    requirements,
    testCases,
    scripts: [
      { id: 'SCRIPT-001', testCaseId: 'TC-001', name: 'customer-sign-in.spec.js', framework: 'Playwright', code: playwrightCode(testCases[0]) },
      { id: 'SCRIPT-002', testCaseId: 'TC-003', name: 'checkout.spec.js', framework: 'Playwright', code: playwrightCode(testCases[2], OLD_SELECTOR) },
    ],
    runs: [
      { id: 'RUN-041', name: 'Demo regression #41', date: '2026-06-18T10:24:00.000Z', total: 24, passed: 23, failed: 1, status: 'failed', duration: '2m 14s', logs: ['DEMO SIMULATION: Historical sample; no tests were executed.', '23 of 24 sample checks passed.', `Checkout selector ${OLD_SELECTOR} was not found.`, 'Review the pending self-healing proposal before rerunning.'] },
      { id: 'RUN-040', name: 'Demo regression #40', date: '2026-06-17T14:08:00.000Z', total: 24, passed: 24, failed: 0, status: 'passed', duration: '2m 08s', logs: ['DEMO SIMULATION: Historical sample; no tests were executed.', 'All 24 sample checks passed.'] },
    ],
    healings: [{ id: 'HEAL-001', testCaseId: 'TC-003', oldSelector: OLD_SELECTOR, newSelector: NEW_SELECTOR, confidence: 98, reason: 'Demo DOM comparison: the checkout submit control was renamed to place-order-button. Review this simulated selector repair before applying.', status: 'pending' }],
    pipeline: { status: 'idle', stages: pendingStages(), runNumber: 41 },
    pullRequests: [],
    knowledge: [
      { id: 'KB-001', name: 'Commerce product requirements', source: 'Confluence', type: 'Document', size: '24 KB', addedAt: '2026-06-16T09:00:00.000Z', content: 'Demo commerce requirements: secure sign-in, reliable checkout, and promotional discount validation.' },
      { id: 'KB-002', name: 'Checkout API specification', source: 'Upload', type: 'OpenAPI', size: '18 KB', addedAt: '2026-06-16T09:05:00.000Z', content: 'Demo API contract: POST /orders creates a unique order; declined payments must preserve the cart.' },
      { id: 'KB-003', name: 'Automation engineering guidelines', source: 'GitHub', type: 'Markdown', size: '8 KB', addedAt: '2026-06-16T09:10:00.000Z', content: 'Demo automation guidelines: prefer stable data-testid selectors, isolate fixtures, and require review for self-healing changes.' },
    ],
    connectors: Object.fromEntries(CONNECTOR_CATALOG.map(({ id }) => [id, { enabled: false, config: {} }])),
    testLab: {
      harImports: [{ id: 'HAR-001', fileName: 'checkout.har', importedAt: '2026-06-18T10:10:00.000Z', entryCount: 2 }],
      crawlScenarios: [{ id: 'CRAWL-001', name: 'Commerce storefront crawl', startUrl: 'https://commerce.example.test', maxPages: 10, pageCount: 4, discovered: [{ url: 'https://commerce.example.test', title: 'Storefront' }, { url: 'https://commerce.example.test/products', title: 'Products' }, { url: 'https://commerce.example.test/cart', title: 'Cart' }, { url: 'https://commerce.example.test/checkout', title: 'Checkout' }], createdAt: '2026-06-18T10:15:00.000Z' }],
      apiTests: [{ id: 'API-001', harImportId: 'HAR-001', name: 'GET /products', method: 'GET', url: 'https://commerce.example.test/api/products', expectedStatus: 200, status: 'ready' }, { id: 'API-002', harImportId: 'HAR-001', name: 'POST /cart', method: 'POST', url: 'https://commerce.example.test/api/cart', expectedStatus: 201, status: 'ready' }, { id: 'API-003', harImportId: 'HAR-001', name: 'POST /orders', method: 'POST', url: 'https://commerce.example.test/api/orders', expectedStatus: 201, status: 'ready' }],
    },
    autonomous: { enabled: false, queue: [], lastRunAt: null },
    finOps: { aws: { total: 142.17, period: 'Month-to-date', services: [{ service: 'EC2', cost: 72.40, unit: 'USD', trend: 'up' }, { service: 'S3', cost: 18.60, unit: 'USD', trend: 'down' }, { service: 'RDS', cost: 36.40, unit: 'USD', trend: 'up' }, { service: 'Lambda', cost: 8.50, unit: 'USD', trend: 'flat' }, { service: 'CloudWatch', cost: 6.27, unit: 'USD', trend: 'up' }] }, tokens: { total: 2450, byAgent: { requirements: 150, testcases: 320, scripts: 480, execution: 260, healing: 190 }, bySubAgent: Object.fromEntries(SUB_AGENTS.map(({ id, tokenCost }) => [id, tokenCost])), byRun: [{ id: 'TOK-001', agent: 'Execution', tokens: 2450, time: '2026-06-18T10:24:00.000Z' }] } },
    subAgentRuns: [],
    activity: [{ id: 'ACT-001', title: 'Demo workspace ready', detail: 'Sample requirements, test cases, scripts, and historical results are loaded. All agent and pipeline runs are local simulations.', time: '2026-06-18T10:24:00.000Z', type: 'info' }],
    lastAgentRuns: {},
  }
}

export const initialState = createInitialState()

export function getAgentBlockReason(state, id) {
  if (id === 'requirements') return ''
  if (id === 'testcases') return state.requirements.length ? '' : 'Add a requirement before generating test cases.'
  if (id === 'scripts') return state.testCases.length ? '' : 'Generate test cases before creating automation scripts.'
  if (id === 'execution') return state.scripts.length ? '' : 'Generate an automation script before running the execution simulation.'
  if (id === 'healing') return state.testCases.some((item) => item.status === 'failed') || state.healings.some((item) => item.status === 'pending') ? '' : 'Run tests first. Self-healing needs a failed test or a pending proposal.'
  return 'Unknown agent.'
}

export function canRunAgent(state, id) {
  return getAgentBlockReason(state, id) === ''
}

export function getPipelineBlockReason(state) {
  if (!state.scripts.length) return 'Generate automation scripts before running the pipeline.'
  if (!state.runs.length) return 'Run the execution simulation before running the pipeline.'
  const latest = state.runs[0]
  if (latest.status !== 'passed') return 'The latest execution must pass. Review failures, apply any repairs, and rerun tests.'
  if (!validRevision(latest.artifactRevision) || latest.artifactRevision !== artifactRevision(state)) return 'The latest execution is stale. Rerun execution against the current requirements, test cases, and scripts.'
  if (!state.requirements.length || state.requirements.some((requirement) => state.testCases.filter((item) => item.requirementId === requirement.id).length < 2)) return 'Generate at least 2 linked test cases for every requirement before running the pipeline.'
  if (state.testCases.some((item) => !state.requirements.some((requirement) => requirement.id === item.requirementId))) return 'Link every test case to a current requirement before running the pipeline.'
  if (state.testCases.some((item) => !state.scripts.some((script) => script.testCaseId === item.id))) return 'Generate scripts for every test case, then rerun execution before running the pipeline.'
  if (latest.total !== state.testCases.length || latest.passed !== state.testCases.length || latest.failed !== 0 || state.testCases.some((item) => item.status !== 'passed')) return 'The latest execution must pass every current test case. Rerun the full simulation before running the pipeline.'
  return ''
}

export function getMetrics(state) {
  const latest = state.runs[0]
  return {
    totalCases: state.testCases.length,
    passRate: latest?.total ? Math.round((latest.passed / latest.total) * 100) : 0,
    activeAgents: AGENTS.filter(({ id }) => Boolean(state.lastAgentRuns[id])).length,
    knowledgeCount: state.knowledge.length,
    passed: latest?.passed ?? 0,
    failed: latest?.failed ?? 0,
  }
}

export function getNextAutonomousAgent(state) {
  const baseline = state.autonomous?.lastRunAt && Number.isFinite(Date.parse(state.autonomous.lastRunAt)) ? Date.parse(state.autonomous.lastRunAt) : 0
  return AGENTS.find(({ id }) => !state.lastAgentRuns?.[id] || Date.parse(state.lastAgentRuns[id]) <= baseline)?.id ?? null
}

export function getFinOpsSummary(state) {
  const aws = state.finOps?.aws ?? { total: 0, services: [] }
  const tokens = state.finOps?.tokens ?? { total: 0, byAgent: {}, bySubAgent: {}, byRun: [] }
  const top = (values) => Object.entries(values).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return { awsTotal: aws.total, tokenTotal: tokens.total, topService: [...aws.services].sort((a, b) => b.cost - a.cost)[0]?.service ?? null, topAgent: top(tokens.byAgent), topSubAgent: top(tokens.bySubAgent), runCount: tokens.byRun.length }
}

export function getTestLabMetrics(state) {
  return { harCount: state.testLab?.harImports?.length ?? 0, apiTestCount: state.testLab?.apiTests?.length ?? 0, crawlCount: state.testLab?.crawlScenarios?.length ?? 0 }
}

const AGENT_TOKEN_COSTS = { requirements: 150, testcases: 320, scripts: 480, execution: 260, healing: 190 }

export function estimateTokenCost(agentId, subAgentIds = []) {
  return (AGENT_TOKEN_COSTS[agentId] ?? 0) + subAgentIds.reduce((sum, id) => sum + (SUB_AGENTS.find((item) => item.id === id)?.tokenCost ?? 0), 0)
}

function trackTokens(state, agentId) {
  const applicable = { requirements: ['ui-crawler'], testcases: ['api-scenario-writer'], scripts: ['script-optimizer'], execution: ['token-monitor'], healing: ['selector-analyst'] }[agentId] ?? []
  if (agentId === 'testcases' && state.testLab?.harImports?.length) applicable.unshift('har-parser')
  const agent = AGENTS.find((item) => item.id === agentId)
  const time = now()
  const tokens = estimateTokenCost(agentId, applicable)
  const current = state.finOps.tokens
  const subAgentRuns = applicable.map((id) => {
    const subAgent = SUB_AGENTS.find((item) => item.id === id)
    return { id: makeId('SUBRUN'), subAgentId: id, parentId: agentId, title: `${subAgent.name} finished`, detail: `Supported the ${agent.shortName.toLowerCase()} agent run.`, tokens: subAgent.tokenCost, time, type: 'success' }
  })
  return { ...state, finOps: { ...state.finOps, tokens: { total: current.total + tokens, byAgent: { ...current.byAgent, [agentId]: (current.byAgent[agentId] ?? 0) + AGENT_TOKEN_COSTS[agentId] }, bySubAgent: applicable.reduce((values, id) => ({ ...values, [id]: (values[id] ?? 0) + SUB_AGENTS.find((item) => item.id === id).tokenCost }), current.bySubAgent), byRun: [{ id: makeId('TOK'), agent: agent.shortName, tokens, time }, ...current.byRun].slice(0, 100) } }, subAgentRuns: [...subAgentRuns, ...state.subAgentRuns].slice(0, 100) }
}

function activity(state, title, detail, type = 'info') {
  return { ...state, activity: [{ id: makeId('ACT'), title, detail, time: now(), type }, ...state.activity].slice(0, 50) }
}

function invalidate(state) {
  return {
    ...state,
    pipeline: { ...state.pipeline, status: 'idle', stages: pendingStages() },
    pullRequests: state.pullRequests.map((pr) => pr.status === 'merged' ? pr : { ...pr, status: 'open', checks: 'pending' }),
  }
}

function changeArtifacts(state) {
  return invalidate({ ...state, artifactRevision: artifactRevision(state) + 1 })
}

function proposal(testCase) {
  return { id: makeId('HEAL'), testCaseId: testCase.id, oldSelector: OLD_SELECTOR, newSelector: NEW_SELECTOR, confidence: 98, reason: `Simulated selector drift in “${testCase.title}”: the checkout button now uses place-order-button. Manual approval is required.`, status: 'pending' }
}

function addProposals(state, failedCases) {
  const additions = failedCases.filter((item) => !state.healings.some((healing) => healing.testCaseId === item.id && healing.oldSelector === OLD_SELECTOR)).map(proposal)
  return { ...state, healings: [...additions, ...state.healings].slice(0, 50) }
}

function runAgent(state, agentId) {
  if (!canRunAgent(state, agentId)) return state
  let next = state
  let detail = ''
  if (agentId === 'requirements') {
    const number = state.requirements.length + 1
    const item = { id: makeId('REQ'), title: `Order tracking and delivery updates · demo story ${number}`, source: 'Jira / ADO demo', priority: 'Medium', description: `Simulated imported story ${number}: customers can view delivery progress and receive a clear update when an order changes status. No external service was contacted.`, criteria: ['Only the order owner can view tracking details.', 'The latest delivery status and estimated arrival are visible.', 'Unavailable tracking shows a helpful fallback message.'] }
    next = changeArtifacts({ ...state, requirements: [...state.requirements, item] })
    detail = 'Added 1 unique demo requirement. No Jira or Azure DevOps request was made.'
  }
  if (agentId === 'testcases') {
    const additions = []
    for (const requirement of state.requirements) {
      const existing = state.testCases.filter((item) => item.requirementId === requirement.id)
      for (let index = existing.length; index < 2; index += 1) {
        const positive = index === 0
        additions.push({ id: makeId('TC'), requirementId: requirement.id, title: `${requirement.title} — ${positive ? 'happy path' : 'validation and error handling'}`, type: positive ? 'Positive' : 'Negative', priority: requirement.priority, steps: ['Prepare an isolated demo customer and test data.', `Open the feature: ${requirement.title}.`, positive ? 'Complete the flow with valid demo inputs.' : 'Submit invalid or missing demo inputs.'], expected: positive ? requirement.criteria[0] || 'The valid flow completes successfully.' : 'A clear validation message appears and existing data is preserved.', status: 'ready' })
      }
    }
    next = additions.length ? changeArtifacts({ ...state, testCases: [...state.testCases, ...additions] }) : state
    detail = additions.length ? `Generated ${additions.length} demo test cases with requirement traceability.` : 'Every requirement already has at least 2 test cases. No duplicates were created.'
  }
  if (agentId === 'scripts') {
    const additions = state.testCases.filter((item) => !state.scripts.some((script) => script.testCaseId === item.id)).map((item) => {
      const healing = state.healings.find((entry) => entry.testCaseId === item.id)
      const selector = healing ? healing.status === 'applied' ? healing.newSelector : healing.oldSelector : `[data-testid="${item.id.toLowerCase()}-action"]`
      return { id: makeId('SCRIPT'), testCaseId: item.id, name: `${item.id.toLowerCase()}.spec.js`, framework: 'Playwright', code: playwrightCode(item, selector) }
    })
    next = additions.length ? changeArtifacts({ ...state, scripts: [...state.scripts, ...additions] }) : state
    detail = additions.length ? `Generated ${additions.length} Playwright demo scripts. Scripts are artifacts only and are not executed by this app.` : 'Every test case already has an automation script. No duplicates were created.'
  }
  if (agentId === 'execution') {
    const runnable = state.testCases.filter((item) => state.scripts.some((script) => script.testCaseId === item.id))
    const failedCases = runnable.filter((item) => state.scripts.some((script) => script.testCaseId === item.id && (script.code.includes(OLD_SELECTOR) || script.code.includes(encodedSelector(OLD_SELECTOR)))))
    const failedIds = new Set(failedCases.map((item) => item.id))
    const runnableIds = new Set(runnable.map((item) => item.id))
    const failed = failedCases.length
    const total = runnable.length
    const passed = total - failed
    const run = { id: makeId('RUN'), name: `Simulated regression · ${now().slice(11, 19)}`, date: now(), artifactRevision: artifactRevision(state), total, passed, failed, status: failed ? 'failed' : 'passed', duration: `${Math.max(1, total * 3)}s (simulated)`, logs: ['DEMO SIMULATION: No browser, external service, or real test runner was started.', `Evaluated ${total} scripted test cases using deterministic demo outcomes.`, ...runnable.map((item) => failedIds.has(item.id) ? `FAIL ${item.id}: selector ${OLD_SELECTOR} was not found in the simulated checkout DOM.` : `PASS ${item.id}: simulated expected outcome matched.`), `${passed} passed, ${failed} failed.`, ...(failed ? ['Review the self-healing proposal, apply the repair, then rerun this simulation.'] : ['All scripted checks passed in simulation. Pipeline availability also requires complete requirement and script coverage.'])] }
    next = addProposals({ ...state, runs: [run, ...state.runs].slice(0, 50), testCases: state.testCases.map((item) => runnableIds.has(item.id) ? { ...item, status: failedIds.has(item.id) ? 'failed' : 'passed' } : item) }, failedCases)
    next = invalidate(next)
    detail = `Simulation complete: ${passed}/${total} passed${failed ? `, ${failed} failed` : ''}. No real tests were executed.`
  }
  if (agentId === 'healing') {
    next = addProposals(state, state.testCases.filter((item) => item.status === 'failed'))
    const count = next.healings.filter((item) => item.status === 'pending').length
    detail = `Demo failure scan complete. ${count} pending selector repair${count === 1 ? '' : 's'} require human review; no changes were applied.`
  }
  next = trackTokens(next, agentId)
  next = { ...next, lastAgentRuns: { ...next.lastAgentRuns, [agentId]: now() } }
  return activity(next, `${AGENTS.find((agent) => agent.id === agentId).shortName} agent finished`, detail, agentId === 'execution' && next.runs[0]?.status === 'failed' ? 'warning' : 'success')
}

function cleanConfig(id, config) {
  const connector = CONNECTOR_CATALOG.find((item) => item.id === id)
  if (!connector || !record(config)) return {}
  return Object.fromEntries(connector.fields.filter(({ key }) => typeof config[key] === 'string').map(({ key }) => [key, config[key].trim()]))
}

export function reducer(state, action) {
  if (!record(action)) return state
  switch (action.type) {
    case 'RUN_AGENT':
      return runAgent(state, action.agentId)
    case 'TOGGLE_AUTONOMOUS':
      return { ...state, autonomous: { ...state.autonomous, enabled: action.enabled === true } }
    case 'IMPORT_HAR': {
      const fileName = text(action.fileName)
      if (!fileName || !Array.isArray(action.entries)) return state
      const harImport = { id: makeId('HAR'), fileName, importedAt: now(), entryCount: action.entries.length }
      const methods = ['GET', 'POST', 'PUT', 'DELETE']
      const tests = action.entries.filter((entry) => record(entry) && methods.includes(text(entry.method).toUpperCase()) && typeof entry.url === 'string' && (entry.url.includes('/api/') || (Number.isFinite(entry.status) && entry.status < 400))).map((entry) => {
        const method = text(entry.method).toUpperCase()
        let path = entry.url
        try { path = new URL(entry.url).pathname || entry.url } catch {}
        return { id: makeId('API'), harImportId: harImport.id, name: `${method} ${path}`, method, url: entry.url, expectedStatus: Number.isInteger(entry.status) ? entry.status : 200, status: 'generated' }
      })
      const next = { ...state, testLab: { ...state.testLab, harImports: [...state.testLab.harImports, harImport].slice(-100), apiTests: [...state.testLab.apiTests, ...tests].slice(-100) } }
      return activity(next, 'HAR imported', `${fileName} added ${tests.length} generated API test${tests.length === 1 ? '' : 's'}.`, 'success')
    }
    case 'ADD_CRAWL_SCENARIO': {
      const name = text(action.name)
      const startUrl = text(action.startUrl)
      if (!name || !startUrl || !Array.isArray(action.discovered)) return state
      const discovered = action.discovered.filter((item) => record(item) && text(item.url)).map((item) => ({ url: text(item.url), title: text(item.title) }))
      const scenario = { id: makeId('CRAWL'), name, startUrl, maxPages: Number.isInteger(action.maxPages) && action.maxPages > 0 ? action.maxPages : discovered.length, pageCount: discovered.length, discovered, createdAt: now() }
      return activity({ ...state, testLab: { ...state.testLab, crawlScenarios: [...state.testLab.crawlScenarios, scenario].slice(-50) } }, 'Crawl scenario added', `${name} discovered ${discovered.length} page${discovered.length === 1 ? '' : 's'}.`, 'success')
    }
    case 'ADD_AWS_USAGE': {
      const service = text(action.service)
      if (!service || !Number.isFinite(action.cost) || action.cost < 0) return state
      const existing = state.finOps.aws.services.find((item) => item.service === service)
      const services = existing ? state.finOps.aws.services.map((item) => item.service === service ? { ...item, cost: item.cost + action.cost, unit: text(action.unit) || item.unit || 'USD' } : item) : [...state.finOps.aws.services, { service, cost: action.cost, unit: text(action.unit) || 'USD', trend: 'flat' }]
      const aws = { ...state.finOps.aws, services, total: Number(services.reduce((sum, item) => sum + item.cost, 0).toFixed(2)) }
      return activity({ ...state, finOps: { ...state.finOps, aws } }, 'AWS usage updated', `${service} usage added to the month-to-date estimate.`)
    }
    case 'ADD_REQUIREMENT': {
      const title = text(action.title)
      if (!title) return state
      const description = text(action.description, 'Manually added demo requirement.')
      const item = { id: makeId('REQ'), title, source: text(action.source) || 'Manual', priority: text(action.priority) || 'Medium', description, criteria: [description || `The feature “${title}” meets its expected business outcome.`] }
      return activity(changeArtifacts({ ...state, requirements: [...state.requirements, item] }), 'Requirement added', `${title} is ready for test case generation.`, 'success')
    }
    case 'ADD_KNOWLEDGE': {
      if (!Array.isArray(action.items)) return state
      const items = action.items.filter((item) => record(item) && text(item.name)).map((item) => ({ id: makeId('KB'), name: text(item.name), source: text(item.source) || 'Upload', type: text(item.type) || 'Document', size: typeof item.size === 'number' && Number.isFinite(item.size) ? item.size : text(item.size) || '—', addedAt: now(), ...(typeof item.content === 'string' ? { content: item.content } : {}) }))
      if (!items.length) return state
      return activity({ ...state, knowledge: [...items, ...state.knowledge] }, 'Knowledge added', `${items.length} source${items.length === 1 ? '' : 's'} added to this local demo workspace.`, 'success')
    }
    case 'REMOVE_KNOWLEDGE': {
      const item = state.knowledge.find((entry) => entry.id === action.id)
      if (!item) return state
      return activity({ ...state, knowledge: state.knowledge.filter((entry) => entry.id !== action.id) }, 'Knowledge removed', `${item.name} was removed from local context.`)
    }
    case 'SAVE_CONNECTOR': {
      const connector = CONNECTOR_CATALOG.find((item) => item.id === action.id)
      if (!connector) return state
      const value = { enabled: action.enabled === true, config: cleanConfig(action.id, action.config) }
      return activity({ ...state, connectors: { ...state.connectors, [action.id]: value } }, `${connector.name} configuration saved`, 'Non-secret demo configuration saved locally. No connection was attempted.', 'success')
    }
    case 'RUN_PIPELINE': {
      if (getPipelineBlockReason(state)) return state
      const pipeline = { ...state.pipeline, status: 'passed', runNumber: state.pipeline.runNumber + 1, stages: STAGES.map((stage) => ({ ...stage, status: 'passed' })) }
      return activity({ ...state, pipeline, pullRequests: state.pullRequests.map((pr) => pr.status === 'merged' ? pr : { ...pr, checks: 'passed' }) }, `Demo pipeline #${pipeline.runNumber} passed`, 'Build, test, SAST, DAST, and deploy were simulated locally. No code was built, scanned, or deployed.', 'success')
    }
    case 'CREATE_PR': {
      if (state.pipeline.status !== 'passed' || getPipelineBlockReason(state)) return state
      const branch = `qa/automation-${state.pipeline.runNumber}`
      if (state.pullRequests.some((pr) => pr.branch === branch && pr.status !== 'merged')) return state
      const pr = { id: makeId('PR'), title: text(action.title) || 'Add generated QA automation', branch, status: 'open', checks: 'passed', createdAt: now() }
      return activity({ ...state, pullRequests: [pr, ...state.pullRequests].slice(0, 50) }, 'Demo pull request created', `${pr.title} on ${branch}. No remote pull request was opened.`, 'success')
    }
    case 'APPROVE_PR':
    case 'MERGE_PR': {
      const pr = state.pullRequests.find((item) => item.id === action.id)
      const approving = action.type === 'APPROVE_PR'
      if (!pr || pr.status !== (approving ? 'open' : 'approved') || pr.checks !== 'passed' || state.pipeline.status !== 'passed' || getPipelineBlockReason(state)) return state
      return activity({ ...state, pullRequests: state.pullRequests.map((item) => item.id === action.id ? { ...item, status: approving ? 'approved' : 'merged' } : item) }, approving ? 'Demo pull request approved' : 'Demo pull request merged', `${pr.title}. This action only updates local demo state.`, 'success')
    }
    case 'APPLY_HEALING': {
      const healing = state.healings.find((item) => item.id === action.id)
      if (!healing || healing.status !== 'pending') return state
      const replaceSelector = (code) => code.replaceAll(`'${healing.oldSelector}'`, () => JSON.stringify(healing.newSelector)).replaceAll(encodedSelector(healing.oldSelector), () => encodedSelector(healing.newSelector))
      const next = changeArtifacts({ ...state, healings: state.healings.map((item) => item.id === action.id ? { ...item, status: 'applied' } : item), scripts: state.scripts.map((script) => script.testCaseId === healing.testCaseId ? { ...script, code: replaceSelector(script.code) } : script), testCases: state.testCases.map((item) => item.id === healing.testCaseId && item.status === 'failed' ? { ...item, status: 'ready' } : item) })
      return activity(next, 'Selector repair applied', `${healing.testCaseId}: updated the demo script selector. Rerun execution to verify; the test is not marked passed.`, 'success')
    }
    case 'DISMISS_HEALING': {
      const healing = state.healings.find((item) => item.id === action.id)
      if (!healing || healing.status !== 'pending') return state
      return activity({ ...state, healings: state.healings.map((item) => item.id === action.id ? { ...item, status: 'dismissed' } : item) }, 'Selector repair dismissed', `${healing.testCaseId}: no scripts or test results were changed.`)
    }
    default:
      return state
  }
}

const strings = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string')
const hasStrings = (item, keys) => record(item) && keys.every((key) => typeof item[key] === 'string')
const validId = (item) => hasStrings(item, ['id']) && item.id.length > 0
const validDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value))
const enumValue = (value, choices) => choices.includes(value)
const validators = {
  requirements: (item) => hasStrings(item, ['title', 'source', 'priority', 'description']) && strings(item.criteria),
  testCases: (item) => hasStrings(item, ['requirementId', 'title', 'type', 'priority', 'expected']) && strings(item.steps) && enumValue(item.status, ['ready', 'passed', 'failed']),
  scripts: (item) => hasStrings(item, ['testCaseId', 'name', 'framework', 'code']),
  runs: (item) => hasStrings(item, ['name', 'duration']) && validDate(item.date) && ['total', 'passed', 'failed'].every((key) => Number.isInteger(item[key]) && item[key] >= 0) && item.passed + item.failed === item.total && enumValue(item.status, ['passed', 'failed']) && strings(item.logs) && (item.artifactRevision === undefined || validRevision(item.artifactRevision)),
  healings: (item) => hasStrings(item, ['testCaseId', 'oldSelector', 'newSelector', 'reason']) && item.oldSelector.length > 0 && Number.isFinite(item.confidence) && enumValue(item.status, ['pending', 'applied', 'dismissed']),
  pullRequests: (item) => hasStrings(item, ['title', 'branch']) && validDate(item.createdAt) && enumValue(item.status, ['open', 'approved', 'merged']) && enumValue(item.checks, ['pending', 'passed']),
  knowledge: (item) => hasStrings(item, ['name', 'source', 'type']) && (typeof item.size === 'string' || Number.isFinite(item.size)) && validDate(item.addedAt) && (item.content === undefined || typeof item.content === 'string'),
  activity: (item) => hasStrings(item, ['title', 'detail', 'type']) && validDate(item.time),
  subAgentRuns: (item) => hasStrings(item, ['subAgentId', 'parentId', 'title', 'detail', 'type']) && Number.isInteger(item.tokens) && item.tokens >= 0 && validDate(item.time),
}

const testLabValidators = {
  harImports: (item) => hasStrings(item, ['fileName']) && validDate(item.importedAt) && Number.isInteger(item.entryCount) && item.entryCount >= 0,
  crawlScenarios: (item) => hasStrings(item, ['name', 'startUrl']) && Number.isInteger(item.maxPages) && Number.isInteger(item.pageCount) && Array.isArray(item.discovered) && item.discovered.every((page) => hasStrings(page, ['url', 'title'])) && validDate(item.createdAt),
  apiTests: (item) => hasStrings(item, ['harImportId', 'name', 'method', 'url']) && Number.isInteger(item.expectedStatus) && enumValue(item.status, ['ready', 'generated']),
}

export function loadState() {
  const defaults = createInitialState()
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const stored = JSON.parse(raw)
    if (!record(stored)) return defaults
    const state = { ...defaults, project: text(stored.project) || defaults.project, artifactRevision: artifactRevision(stored) }
    let recoveredArtifacts = false
    for (const [key, validate] of Object.entries(validators)) {
      const value = stored[key]
      if (Array.isArray(value) && value.every((item) => validId(item) && validate(item)) && new Set(value.map((item) => item.id)).size === value.length) {
        state[key] = ['runs', 'healings', 'pullRequests', 'activity'].includes(key) ? value.slice(0, 50) : key === 'subAgentRuns' ? value.slice(0, 100) : value
      } else if (['requirements', 'testCases', 'scripts', 'healings'].includes(key)) {
        recoveredArtifacts = true
      }
    }
    if (recoveredArtifacts || !validRevision(stored.artifactRevision)) {
      state.runs = state.runs.map((item) => {
        const run = { ...item }
        delete run.artifactRevision
        return run
      })
    }
    const pipeline = stored.pipeline
    if (record(pipeline) && enumValue(pipeline.status, ['idle', 'passed']) && Number.isInteger(pipeline.runNumber) && pipeline.runNumber >= 0 && Array.isArray(pipeline.stages) && pipeline.stages.length === STAGES.length && STAGES.every(({ id }) => pipeline.stages.filter((stage) => record(stage) && stage.id === id && typeof stage.name === 'string' && stage.status === (pipeline.status === 'passed' ? 'passed' : 'pending')).length === 1)) {
      state.pipeline = { status: pipeline.status, runNumber: pipeline.runNumber, stages: STAGES.map(({ id }) => ({ ...pipeline.stages.find((stage) => stage.id === id) })) }
    }
    if (record(stored.connectors)) {
      for (const { id } of CONNECTOR_CATALOG) {
        if (record(stored.connectors[id])) state.connectors[id] = { enabled: stored.connectors[id].enabled === true, config: cleanConfig(id, stored.connectors[id].config) }
      }
    }
    if (record(stored.lastAgentRuns)) state.lastAgentRuns = Object.fromEntries(AGENTS.filter(({ id }) => validDate(stored.lastAgentRuns[id])).map(({ id }) => [id, stored.lastAgentRuns[id]]))
    if (record(stored.testLab)) {
      for (const [key, validate] of Object.entries(testLabValidators)) {
        const value = stored.testLab[key]
        if (Array.isArray(value) && value.every((item) => validId(item) && validate(item)) && new Set(value.map(({ id }) => id)).size === value.length) state.testLab[key] = value.slice(key === 'crawlScenarios' ? -50 : -100)
      }
    }
    if (record(stored.autonomous)) state.autonomous = { enabled: stored.autonomous.enabled === true, queue: Array.isArray(stored.autonomous.queue) ? stored.autonomous.queue.filter((id) => AGENTS.some((agent) => agent.id === id)) : defaults.autonomous.queue, lastRunAt: stored.autonomous.lastRunAt === null || validDate(stored.autonomous.lastRunAt) ? stored.autonomous.lastRunAt : defaults.autonomous.lastRunAt }
    if (record(stored.finOps)) {
      const aws = stored.finOps.aws
      if (record(aws) && Array.isArray(aws.services) && aws.services.every((item) => record(item) && text(item.service) && Number.isFinite(item.cost) && item.cost >= 0 && typeof item.unit === 'string' && enumValue(item.trend, ['up', 'down', 'flat']))) state.finOps.aws = { total: Number(aws.services.reduce((sum, item) => sum + item.cost, 0).toFixed(2)), period: 'Month-to-date', services: aws.services }
      const tokens = stored.finOps.tokens
      if (record(tokens) && Number.isFinite(tokens.total) && tokens.total >= 0 && record(tokens.byAgent) && record(tokens.bySubAgent) && Object.values(tokens.byAgent).every((value) => Number.isFinite(value) && value >= 0) && Object.values(tokens.bySubAgent).every((value) => Number.isFinite(value) && value >= 0) && Array.isArray(tokens.byRun) && tokens.byRun.every((item) => validId(item) && hasStrings(item, ['agent']) && Number.isInteger(item.tokens) && item.tokens >= 0 && validDate(item.time))) state.finOps.tokens = { total: tokens.total, byAgent: tokens.byAgent, bySubAgent: tokens.bySubAgent, byRun: tokens.byRun.slice(0, 100) }
    }
    if (state.pipeline.status !== 'passed' || getPipelineBlockReason(state)) return invalidate(state)
    return state
  } catch {
    return defaults
  }
}

export function saveState(state) {
  try {
    if (!globalThis.localStorage) return false
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}
