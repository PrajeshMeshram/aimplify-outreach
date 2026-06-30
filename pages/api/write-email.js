import { getAuthedRequest } from '../../lib/auth-helper'
import { callOpenRouter, MODELS } from '../../lib/openrouter'
import { createGmailDraft } from '../../lib/gmail'
import { getSenderProfile } from '../../lib/users'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await getAuthedRequest(req, res)
  if (!auth) return res.status(401).json({ error: 'Not signed in or session expired' })
  const { accessToken: token, googleId } = auth

  const { prospect } = req.body || {}
  if (!prospect || !prospect.name || !prospect.company || !prospect.email) {
    return res.status(400).json({ error: 'Invalid prospect data' })
  }

  const profile = await getSenderProfile(googleId)
  if (!profile || !profile.onboarded) {
    return res.status(400).json({
      error: 'Set up your sender profile before generating emails.',
      needsOnboarding: true
    })
  }

  try {
    const systemPrompt = `You are an expert cold email writer. Write natural, human, peer-to-peer emails. Never use em dashes. Never sound like AI. Be concise and genuine. Output ONLY raw JSON, no markdown, no backticks.`

    const proofLine = profile.proof_point
      ? `A one-line intro: "${profile.sender_name} here, ${profile.value_prop} at ${profile.company_name}. ${profile.proof_point}"`
      : `A one-line intro: "${profile.sender_name} here, ${profile.value_prop} at ${profile.company_name}."`

    const userPrompt = `Write a cold outreach email for this prospect:

Name: ${prospect.name}
First name: ${prospect.name.split(' ')[0]}
Role: ${prospect.role}
Company: ${prospect.company}
Company achievement: ${prospect.company_win || 'their recent growth'}
Their challenge: ${prospect.company_problem || 'scaling efficiently'}

Sender details (use these, not generic placeholders):
Sender name: ${profile.sender_name}
Sender company: ${profile.company_name}
What sender offers: ${profile.value_prop}
${profile.proof_point ? `Sender's proof point: ${profile.proof_point}` : ''}

Email structure (4 short paragraphs, under 120 words total):
1. Specific genuine observation about their company achievement
2. The challenge you noticed that relates to what the sender offers
3. ${proofLine}
4. "Would love to swap notes for 20 minutes. No pitch, just a quick conversation."

Rules: subject line uses their first name, max 8 words, no em dashes, creates curiosity. No bullet points. Natural human tone. No AI-sounding phrases. Sign the email as ${profile.sender_name}.

Return ONLY JSON: {"subject": "subject line", "body": "full email body with paragraph breaks as newlines"}`

    const { text, usage } = await callOpenRouter(systemPrompt, userPrompt, MODELS.email, 600)

    const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('Email agent returned an unexpected format')
    const emailContent = JSON.parse(clean.slice(start, end + 1))

    if (!emailContent.subject || !emailContent.body) throw new Error('Email agent response missing subject or body')

    let gmailDraftId = null
    let draftError = null
    try {
      gmailDraftId = await createGmailDraft(token, {
        to: prospect.email,
        subject: emailContent.subject,
        body: emailContent.body
      })
    } catch (gErr) {
      console.error('Gmail draft creation failed:', gErr.message)
      draftError = 'Email written but could not be saved as a Gmail draft. You can copy it manually.'
    }

    res.status(200).json({
      subject: emailContent.subject,
      body: emailContent.body,
      gmailDraftId,
      draftError,
      cost_usd: usage.cost_usd
    })
  } catch (err) {
    console.error('Write email error:', err)
    res.status(500).json({ error: 'Failed to write the email. Please try again.' })
  }
}
