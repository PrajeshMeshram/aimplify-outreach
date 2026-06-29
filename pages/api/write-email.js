import { callOpenRouter, MODELS } from '../../lib/openrouter'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { prospect } = req.body

  try {
    const systemPrompt = `You are an expert cold email writer. Write natural, human, peer-to-peer emails. Never use em dashes. Never sound like AI. Be concise and genuine.`

    const userPrompt = `Write a cold outreach email for this prospect:

Name: ${prospect.name}
First name: ${prospect.name.split(' ')[0]}
Role: ${prospect.role}
Company: ${prospect.company}
Company achievement: ${prospect.company_win}
Their marketing challenge: ${prospect.company_problem}

Email structure (4 short paragraphs, under 120 words total):
1. Specific genuine observation about their company achievement
2. The marketing or scaling challenge you noticed
3. "I'm [sender], Co-Founder of a GTM consultancy. We helped a B2B SaaS company cut CAC by 86% by rebuilding their demand gen motion."
4. "Would love to swap notes for 20 minutes. No pitch, just two marketers talking shop."

Rules:
- Subject line: use their first name, max 8 words, creates curiosity, no em dashes
- No em dashes anywhere
- No bullet points
- Natural human tone
- No AI-sounding phrases

Return ONLY JSON, no markdown:
{"subject": "subject line here", "body": "full email body here with paragraph breaks using newlines"}`

    const { text, usage } = await callOpenRouter(systemPrompt, userPrompt, MODELS.email, 600)

    const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    const result = JSON.parse(clean.slice(start, end + 1))

    res.status(200).json({ ...result, cost_usd: usage.cost_usd, model: usage.model })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
