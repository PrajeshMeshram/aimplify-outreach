import { appendContact, isDuplicate } from '../../lib/sheets'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { contact } = req.body
  try {
    const dup = await isDuplicate(contact.email)
    if (dup) return res.status(409).json({ error: 'Duplicate: ' + contact.email })
    await appendContact(contact)
    res.status(200).json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
