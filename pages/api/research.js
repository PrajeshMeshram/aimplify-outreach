import Anthropic from '@anthropic-ai/sdk'
import { getExistingCompanies, isDuplicate, appendContact } from '../../lib/sheets'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { stages, geos, industries, roles, count } = req.body

  try {
    // Step 1: Read existing companies from sheet to avoid duplicates
    const existingCompanies = await getExistingCompanies()

    // Step 2: Build research prompt with exclusion list
    const exclusionNote = existingCompanies.length > 0
      ? `IMPORTANT: Do NOT include these companies — already contacted: ${existingCompanies.join(', ')}.`
      : ''

    const prompt = `You are a B2B sales research assistant for AImplify, a GTM consultancy.

${exclusionNote}

Find ${count} real ${stages.join(' or ')} B2B SaaS companies from ${geos.join(', ')} in: ${industries.join(', ')}.

Role hierarchy — find the FIRST available verified current contact in this order:
1. Head of Marketing
2. VP Marketing  
3. Director of Marketing
4. CMO
5. CEO (only if they visibly own marketing)

For each company return ONLY a JSON array. No markdown. Start with [ end with ]:
[{
  "name": "Full Name",
  "role": "exact current role",
  "company": "Company Name",
  "stage": "Series A",
  "industry": "industry",
  "country": "country",
  "email": "firstname@companydomain.com",
  "roleLevel": 1,
  "company_win": "one real specific achievement",
  "company_problem": "one specific marketing or scaling challenge they face now",
  "subject_line": "subject using first name, max 8 words, no em dashes, creates curiosity",
  "email_body": "4 paragraphs: 1) genuine company observation, 2) their specific marketing challenge, 3) I am Prajesh Co-Founder of AImplify a GTM consultancy we helped a B2B SaaS company cut CAC by 86 percent by rebuilding their demand gen motion, 4) Would love to swap notes for 20 minutes. No pitch, just two marketers talking shop. No em dashes. Human tone. Under 120 words."
}]`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = response.content[0].text
    const start = raw.indexOf('[')
    const end = raw.lastIndexOf(']')
    if (start === -1 || end === -1) throw new Error('No JSON array in response')
    const prospects = JSON.parse(raw.slice(start, end + 1))

    // Step 3: Filter out any duplicates the model still returned
    const filtered = []
    for (const p of prospects) {
      const dup = await isDuplicate(p.email)
      if (!dup) filtered.push(p)
    }

    // Usage tracking
    const usage = {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cost_usd: ((response.usage.input_tokens * 0.000003) + (response.usage.output_tokens * 0.000015)).toFixed(4)
    }

    res.status(200).json({ prospects: filtered, usage, existingSkipped: existingCompanies.length })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
