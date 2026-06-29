import { google } from 'googleapis'

const SHEET_ID = process.env.GOOGLE_SHEET_ID
const RANGE = 'Sheet1!A:K'
const HEADERS = [
  'Company Name',
  "Contact Person's Name",
  "Contact Person's Email Id",
  'Role',
  'Funding Stage',
  'Country',
  '1st Email Sent',
  '2nd Followup Email Sent',
  '3rd Followup Email Sent',
  'Status',
  'Notes'
]

function getAuth() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })
}

export async function getSheetContacts() {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: RANGE
  })
  const rows = res.data.values || []
  if (rows.length <= 1) return []
  return rows.slice(1).map(row => ({
    company: row[0] || '',
    name: row[1] || '',
    email: row[2] || '',
    role: row[3] || '',
    stage: row[4] || '',
    country: row[5] || '',
    sent1: row[6] || '',
    sent2: row[7] || '',
    sent3: row[8] || '',
    status: row[9] || 'Sent',
    notes: row[10] || ''
  }))
}

export async function appendContact(contact) {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const today = new Date().toLocaleDateString('en-GB')
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: RANGE,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        contact.company,
        contact.name,
        contact.email,
        contact.role,
        contact.stage,
        contact.country,
        today,
        '',
        '',
        'Sent',
        ''
      ]]
    }
  })
}

export async function updateFollowup(email, followupNum) {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: RANGE
  })
  const rows = res.data.values || []
  const rowIndex = rows.findIndex(r => r[2] === email)
  if (rowIndex === -1) return
  const today = new Date().toLocaleDateString('en-GB')
  const col = followupNum === 2 ? 'H' : 'I'
  const statusCol = 'J'
  const rowNum = rowIndex + 1
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `Sheet1!${col}${rowNum}`, values: [[today]] },
        { range: `Sheet1!${statusCol}${rowNum}`, values: [[`Follow-up ${followupNum} Sent`]] }
      ]
    }
  })
}

export async function updateStatus(email, status) {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: RANGE
  })
  const rows = res.data.values || []
  const rowIndex = rows.findIndex(r => r[2] === email)
  if (rowIndex === -1) return
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Sheet1!J${rowIndex + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[status]] }
  })
}

export async function isDuplicate(email) {
  const contacts = await getSheetContacts()
  return contacts.some(c => c.email.toLowerCase() === email.toLowerCase())
}

export async function getExistingCompanies() {
  const contacts = await getSheetContacts()
  return [...new Set(contacts.map(c => c.company.toLowerCase()))]
}
