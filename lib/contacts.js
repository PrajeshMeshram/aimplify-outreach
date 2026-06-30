import { supabase } from './supabase'

export async function getContacts(userId) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function isDuplicateContact(userId, email) {
  const { data } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', userId)
    .eq('email', email.toLowerCase())
    .maybeSingle()
  return !!data
}

export async function getExistingCompanyNames(userId) {
  const { data } = await supabase
    .from('contacts')
    .select('company')
    .eq('user_id', userId)
  return [...new Set((data || []).map(c => c.company.toLowerCase()))]
}

export async function saveContact(userId, contact, gmailDraftId) {
  const { error } = await supabase
    .from('contacts')
    .insert({
      user_id: userId,
      company: contact.company,
      name: contact.name,
      email: contact.email.toLowerCase(),
      role: contact.role,
      stage: contact.stage,
      country: contact.country,
      industry: contact.industry,
      gmail_draft_id: gmailDraftId || null,
      sent1_at: new Date().toISOString(),
      status: 'Sent'
    })

  if (error) throw error
}

export async function recordFollowup(userId, email, followupNum, gmailDraftId) {
  const field = followupNum === 2 ? 'sent2_at' : 'sent3_at'
  const status = followupNum === 2 ? 'Follow-up 2 Sent' : 'Follow-up 3 Sent'

  const { error } = await supabase
    .from('contacts')
    .update({ [field]: new Date().toISOString(), status, gmail_draft_id: gmailDraftId || undefined })
    .eq('user_id', userId)
    .eq('email', email.toLowerCase())

  if (error) throw error
}

export async function updateContactStatus(userId, email, status) {
  const { error } = await supabase
    .from('contacts')
    .update({ status })
    .eq('user_id', userId)
    .eq('email', email.toLowerCase())

  if (error) throw error
}
