import { getAuthedRequest } from '../../lib/auth-helper'
import { getUser } from '../../lib/users'
import { getContacts, recordFollowup, updateContactStatus } from '../../lib/contacts'

export default async function handler(req, res) {
  const auth = await getAuthedRequest(req, res)
  if (!auth) return res.status(401).json({ error: 'Not signed in or session expired' })
  const { googleId } = auth

  if (req.method === 'GET') {
    try {
      const user = await getUser(googleId)
      const contacts = await getContacts(user.id)
      return res.status(200).json({ contacts })
    } catch (err) {
      console.error('Get contacts error:', err)
      return res.status(500).json({ error: 'Could not load your contacts. Try refreshing.' })
    }
  }

  if (req.method === 'PATCH') {
    const { email, action, followupNum, gmailDraftId } = req.body || {}
    const VALID_ACTIONS = ['followup', 'replied', 'closed']
    if (!email || !VALID_ACTIONS.includes(action)) {
      return res.status(400).json({ error: 'Invalid request — email and a valid action are required' })
    }
    if (action === 'followup' && ![2, 3].includes(followupNum)) {
      return res.status(400).json({ error: 'followupNum must be 2 or 3' })
    }

    try {
      const user = await getUser(googleId)
      if (action === 'followup') await recordFollowup(user.id, email, followupNum, gmailDraftId)
      if (action === 'replied') await updateContactStatus(user.id, email, 'Replied')
      if (action === 'closed') await updateContactStatus(user.id, email, 'Closed')
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('Update contact error:', err)
      return res.status(500).json({ error: 'Could not update this contact' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
