import { getSheetContacts, updateFollowup, updateStatus } from '../../lib/sheets'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const contacts = await getSheetContacts()
      res.status(200).json({ contacts })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'PATCH') {
    const { email, action, followupNum } = req.body
    try {
      if (action === 'followup') await updateFollowup(email, followupNum)
      if (action === 'replied') await updateStatus(email, 'Replied')
      if (action === 'closed') await updateStatus(email, 'Closed')
      res.status(200).json({ success: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }
}
