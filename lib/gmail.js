import { google } from 'googleapis'

function getGmailClient(accessToken) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.gmail({ version: 'v1', auth })
}

function buildRawEmail({ to, subject, body, fromName }) {
  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0'
  ].join('\r\n')

  const raw = `${headers}\r\n\r\n${body}`
  return Buffer.from(raw).toString('base64url')
}

export async function createGmailDraft(accessToken, { to, subject, body }) {
  if (!to || !subject || !body) throw new Error('to, subject, and body are required to create a draft')

  const gmail = getGmailClient(accessToken)
  const raw = buildRawEmail({ to, subject, body })

  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: { raw }
    }
  })

  return res.data.id
}
