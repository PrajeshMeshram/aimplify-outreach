import { getAuthedRequest } from '../../lib/auth-helper'
import { getUser } from '../../lib/users'
import { getContacts } from '../../lib/contacts'
import { getOrCreateSheet, appendContact, getSheetContacts } from '../../lib/sheets'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await getAuthedRequest(req, res)
  if (!auth) return res.status(401).json({ error: 'Not signed in or session expired' })
  const { accessToken: token, googleId } = auth

  try {
    const user = await getUser(googleId)
    const contacts = await getContacts(user.id)

    if (!contacts.length) {
      return res.status(200).json({ exported: 0, message: 'No contacts to export yet' })
    }

    const sheetId = await getOrCreateSheet(token)
    const existingInSheet = await getSheetContacts(token, sheetId)
    const existingEmails = new Set(existingInSheet.map(c => c.email.toLowerCase()))

    let exported = 0
    for (const c of contacts) {
      if (existingEmails.has(c.email.toLowerCase())) continue
      await appendContact(token, sheetId, c)
      exported++
    }

    res.status(200).json({
      exported,
      total: contacts.length,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}`
    })
  } catch (err) {
    console.error('Export to sheet error:', err)
    res.status(500).json({ error: 'Failed to export to Google Sheets' })
  }
}
