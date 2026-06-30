import { getAuthedRequest } from '../../lib/auth-helper'
import { callOpenRouter, extractJSON, MODELS } from '../../lib/openrouter'
import { getExistingCompanyNames, isDuplicateContact } from '../../lib/contacts'
import { checkAndIncrementRuns, trackApiCost, getUser } from '../../lib/users'

const VALID_STAGES = ['Series A', 'Series B', 'Series C']
const VALID_GEOS = ['India', 'USA', 'EU', 'UK', 'UAE']
const VALID_INDUSTRIES = ['B2B SaaS', 'HR Tech', 'Fintech', 'EdTech', 'Dev Tools']
const MAX_COUNT = 15
const MIN_COUNT = 1

function validateInput(body) {
  if (!body || typeof body !== 'object') return 'Invalid request body'
  const { stages, geos, industries, count } = body
  if (!Array.isArray(stages) || !stages.length || !stages.every(s => VALID_STAGES.includes(s))) return 'Invalid funding stage selection'
  if (!Array.isArray(geos) || !geos.length || !geos.every(g => VALID_GEOS.includes(g))) return 'Invalid geography selection'
  if (!Array.isArray(industries) || !industries.length || !industries.every(i => VALID_INDUSTRIES.includes(i))) return 'Invalid industry selection'
  if (!Number.isInteger(count) || count < MIN_COUNT || count > MAX_COUNT) return `Prospect count must be between ${MIN_COUNT} and ${MAX_COUNT}`
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await getAuthedRequest(req, res)
  if (!auth) return res.status(401).json({ error: 'Not signed in or session expired. Please sign in again.' })
  const { googleId } = auth

  const validationError = validateInput(req.body)
  if (validationError) return res.status(400).json({ error: validationError })

  const { stages, geos, industries, count } = req.body

  const runCheck = await checkAndIncrementRuns(googleId)
  if (!runCheck.allowed) {
    return res.status(429).json({
      error: `Daily run limit reached (${runCheck.used}/${runCheck.limit} runs on ${runCheck.plan} plan). Upgrade to run more.`,
      limitReached: true,
      plan: runCheck.plan
    })
  }

  try {
    const user = await getUser(googleId)
    const existingCompanies = await getExistingCompanyNames(user.id)
    const exclusionNote = existingCompanies.length > 0
      ? `IMPORTANT: Do NOT include these companies — already contacted: ${existingCompanies.join(', ')}.` : ''

    const systemPrompt = `You are a B2B sales research assistant. Output ONLY raw JSON arrays with no markdown, no code fences, no explanation. Start with [ and end with ].`
    const userPrompt = `${exclusionNote}
Find ${count} real ${stages.join(' or ')} B2B SaaS companies from ${geos.join(', ')} in: ${industries.join(', ')}.
Role hierarchy: 1. Head of Marketing 2. VP Marketing 3. Director Marketing 4. CMO 5. CEO (only if owns marketing)
Return JSON array only. Start with [ end with ]:
[{"name":"Full Name","role":"exact current role","company":"Company Name","stage":"Series A","industry":"industry","country":"country","email":"firstname@companydomain.com","company_win":"one real specific achievement","company_problem":"one specific marketing or scaling challenge they face now"}]`

    const { text, usage } = await callOpenRouter(systemPrompt, userPrompt, MODELS.research, 3000)
    const prospects = extractJSON(text, 'array')

    if (!Array.isArray(prospects)) throw new Error('Research agent returned an unexpected format')

    const filtered = []
    for (const p of prospects) {
      if (!p || !p.email || !p.name || !p.company) continue
      const dup = await isDuplicateContact(user.id, p.email)
      if (!dup) filtered.push(p)
    }

    await trackApiCost(googleId, parseFloat(usage.cost_usd))

    res.status(200).json({
      prospects: filtered,
      usage,
      existingSkipped: existingCompanies.length,
      runsToday: runCheck.used,
      runLimit: runCheck.limit
    })
  } catch (err) {
    console.error('Research API error:', err)
    res.status(500).json({ error: 'Something went wrong while researching prospects. Please try again.' })
  }
}
