import { getAuthedRequest } from '../../lib/auth-helper'
import { getSenderProfile, saveSenderProfile } from '../../lib/users'

const MAX_LEN = { companyName: 100, senderName: 60, valueProp: 200, proofPoint: 200 }

function validateProfile(body) {
  if (!body || typeof body !== 'object') return 'Invalid request body'
  const { companyName, senderName, valueProp, proofPoint } = body
  if (!companyName || !companyName.trim()) return 'Company name is required'
  if (!senderName || !senderName.trim()) return 'Your name is required'
  if (!valueProp || !valueProp.trim()) return 'What you offer is required'
  if (companyName.length > MAX_LEN.companyName) return 'Company name is too long'
  if (senderName.length > MAX_LEN.senderName) return 'Name is too long'
  if (valueProp.length > MAX_LEN.valueProp) return 'Value proposition is too long'
  if (proofPoint && proofPoint.length > MAX_LEN.proofPoint) return 'Proof point is too long'
  return null
}

export default async function handler(req, res) {
  const auth = await getAuthedRequest(req, res)
  if (!auth) return res.status(401).json({ error: 'Not signed in or session expired' })
  const { googleId } = auth

  if (req.method === 'GET') {
    try {
      const profile = await getSenderProfile(googleId)
      return res.status(200).json({ profile })
    } catch (err) {
      console.error('Get profile error:', err)
      return res.status(500).json({ error: 'Could not load your profile' })
    }
  }

  if (req.method === 'POST') {
    const validationError = validateProfile(req.body)
    if (validationError) return res.status(400).json({ error: validationError })

    try {
      const { companyName, senderName, valueProp, proofPoint } = req.body
      await saveSenderProfile(googleId, {
        companyName: companyName.trim(),
        senderName: senderName.trim(),
        valueProp: valueProp.trim(),
        proofPoint: (proofPoint || '').trim()
      })
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('Save profile error:', err)
      return res.status(500).json({ error: 'Could not save your profile' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
