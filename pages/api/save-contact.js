import { getAuthedRequest } from '../../lib/auth-helper'
import { getUser } from '../../lib/users'
import { saveContact, isDuplicateContact } from '../../lib/contacts'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await getAuthedRequest(req, res)
  if (!auth) return res.status(401).json({ error: 'Not signed in or session expired' })
  const { googleId } = auth

  const { contact, gmailDraftId } = req.body || {}
  if (!contact || typeof contact !== 'object' || !contact.email || !contact.name || !contact.company) {
    return res.status(400).json({ error: 'Invalid contact data — name, email, and company are required' })
  }

  try {
    const user = await getUser(googleId)
    const dup = await isDuplicateContact(user.id, contact.email)
    if (dup) return res.status(409).json({ error: 'Duplicate: ' + contact.email })

    await saveContact(user.id, contact, gmailDraftId)
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Save contact error:', err)
    res.status(500).json({ error: 'Failed to save contact' })
  }
}
