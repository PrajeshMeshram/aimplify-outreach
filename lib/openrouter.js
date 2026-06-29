const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-6'

export async function callOpenRouter(systemPrompt, userPrompt, maxTokens = 4000) {
  const res = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://b2b-outreach.vercel.app',
      'X-Title': 'B2B Outreach Agent'
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''

  const usage = {
    input_tokens: data.usage?.prompt_tokens || 0,
    output_tokens: data.usage?.completion_tokens || 0,
    model: data.model || DEFAULT_MODEL,
    cost_usd: (
      (data.usage?.prompt_tokens || 0) * 0.000003 +
      (data.usage?.completion_tokens || 0) * 0.000015
    ).toFixed(6)
  }

  return { text, usage }
}

export function extractJSON(text, type = 'array') {
  try { return JSON.parse(text.trim()) } catch (e) {}
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
  try { return JSON.parse(clean) } catch (e) {}
  if (type === 'array') {
    const start = clean.indexOf('[')
    const end = clean.lastIndexOf(']')
    if (start !== -1 && end > start) {
      try { return JSON.parse(clean.slice(start, end + 1)) } catch (e) {}
    }
  }
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start !== -1 && end > start) {
    const obj = JSON.parse(clean.slice(start, end + 1))
    return type === 'array' ? [obj] : obj
  }
  throw new Error('No valid JSON found in response')
}
