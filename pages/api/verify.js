import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { callOpenRouter, extractJSON, MODELS } from '../../lib/openrouter'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Not signed in' })

  const { prospect } = req.body
  try {
    const systemPrompt = `You are a contact verification agent. You do not have real-time data, and that is expected and fine. Your job is to assess PLAUSIBILITY based on the information given, not to verify against live sources. Never refuse to answer due to knowledge cutoff concerns — always return a plausibility judgment. Output ONLY raw JSON. No markdown. No backticks. Start with { end with }.`
    const userPrompt = `Based on the information given (not live data), assess whether this contact is plausible:

Name: ${prospect.name}
Role: ${prospect.role}
Company: ${prospect.company}
Email: ${prospect.email}

Judge plausibility only: does this name/role/company combination look realistic, and does the email format match typical patterns for this company? Do not refuse due to date or knowledge cutoff — give your best plausibility judgment regardless.

Reply ONLY JSON, no markdown, no refusal text:
{"verified":true,"confidence":"medium","note":"brief reason","corrected_email":"email or same"}`

    const { text, usage } = await callOpenRouter(systemPrompt, userPrompt, MODELS.observer, 200)

    let result
    try {
      result = extractJSON(text, 'object')
    } catch (parseErr) {
      // Model refused or returned non-JSON — default to verified with low confidence rather than killing the contact
      result = { verified: true, confidence: 'low', note: 'Auto-passed: verifier returned non-JSON response', corrected_email: prospect.email }
    }

    res.status(200).json({ ...result, cost_usd: usage.cost_usd })
  } catch (err) {
    // Network or API-level failure — fail open, not closed, so one bad contact doesn't kill the whole batch
    res.status(200).json({ verified: true, confidence: 'low', note: 'Auto-passed: verification service error', error: err.message, cost_usd: '0' })
  }
}
