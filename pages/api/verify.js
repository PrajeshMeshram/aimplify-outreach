import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { prospect } = req.body
  let totalCost = 0

  try {
    const prompt = `Verify this B2B contact is currently employed in this role in 2025-2026:

Name: ${prospect.name}
Role: ${prospect.role}
Company: ${prospect.company}
Country: ${prospect.country}
Email: ${prospect.email}

Check:
1. Is this person likely still at ${prospect.company} in this role RIGHT NOW?
2. Is email format ${prospect.email} plausible for ${prospect.company}?
3. What is your confidence level?

Reply ONLY with JSON, no markdown:
{"verified": true, "confidence": "high", "note": "reason in one line", "corrected_email": "corrected email or same as input"}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = response.content[0].text
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    const result = JSON.parse(raw.slice(start, end + 1))

    totalCost = ((response.usage.input_tokens * 0.000003) + (response.usage.output_tokens * 0.000015)).toFixed(4)

    res.status(200).json({ ...result, cost_usd: totalCost })
  } catch (err) {
    res.status(500).json({ error: err.message, verified: false })
  }
}
