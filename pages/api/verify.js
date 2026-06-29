import { callOpenRouter, extractJSON } from '../../lib/openrouter'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { prospect } = req.body

  try {
    const systemPrompt = `You are a contact verification agent. Output ONLY raw JSON. No markdown. No backticks. Start with { end with }.`

    const userPrompt = `Verify this B2B contact is currently employed in this role in 2025-2026:

Name: ${prospect.name}
Role: ${prospect.role}
Company: ${prospect.company}
Country: ${prospect.country}
Email: ${prospect.email}

Check:
1. Is this person likely still at ${prospect.company} in this role RIGHT NOW?
2. Is email format ${prospect.email} plausible for ${prospect.company}?
3. What is your confidence level?

Reply ONLY with JSON, no markdown, start with {, end with }:
{"verified": true, "confidence": "high", "note": "reason in one line", "corrected_email": "corrected email or same as input"}`

    const { text, usage } = await callOpenRouter(systemPrompt, userPrompt, 200)
    const result = extractJSON(text, 'object')

    res.status(200).json({ ...result, cost_usd: usage.cost_usd, model: usage.model })
  } catch (err) {
    res.status(500).json({ error: err.message, verified: false })
  }
}
