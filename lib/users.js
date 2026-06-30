import { supabase } from './supabase'

export async function upsertUser({ email, name, avatar, googleId, country }) {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      email,
      name,
      avatar,
      google_id: googleId,
      last_active_at: new Date().toISOString()
    }, { onConflict: 'google_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUser(googleId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('google_id', googleId)
    .single()

  if (error || !data) throw new Error('User not found — please sign in again')
  return data
}

export async function saveSheetId(googleId, sheetId) {
  const { error } = await supabase
    .from('users')
    .update({ sheet_id: sheetId })
    .eq('google_id', googleId)
  if (error) console.error('saveSheetId error:', error.message)
}

export async function getUserPlan(googleId) {
  const { data } = await supabase
    .from('users')
    .select('plan')
    .eq('google_id', googleId)
    .single()
  return data?.plan || 'free'
}

export async function getPlanLimits(plan) {
  const { data, error } = await supabase
    .from('plan_limits')
    .select('*')
    .eq('plan', plan)
    .single()

  // Fail safe: if plan_limits lookup fails for any reason, default to the most restrictive
  // limits rather than throwing — this prevents a DB hiccup from giving unlimited access.
  if (error || !data) {
    return { plan, max_runs_per_day: 1, max_prospects_per_run: 3, max_followups_per_day: 10, max_seats: 1, price_monthly: 0 }
  }
  return data
}

export async function checkAndIncrementRuns(googleId) {
  const user = await getUser(googleId)
  const limits = await getPlanLimits(user.plan)
  const today = new Date().toISOString().split('T')[0]

  const { data: usage } = await supabase
    .from('usage')
    .select('runs_today')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  const runsToday = usage?.runs_today || 0

  if (runsToday >= limits.max_runs_per_day) {
    return { allowed: false, limit: limits.max_runs_per_day, used: runsToday, plan: user.plan }
  }

  const { error } = await supabase
    .from('usage')
    .upsert({ user_id: user.id, date: today, runs_today: runsToday + 1 }, { onConflict: 'user_id,date' })

  if (error) {
    console.error('checkAndIncrementRuns upsert error:', error.message)
    return { allowed: false, limit: limits.max_runs_per_day, used: runsToday, plan: user.plan }
  }

  return { allowed: true, limit: limits.max_runs_per_day, used: runsToday + 1, plan: user.plan }
}

export async function incrementFollowups(googleId, count = 1) {
  const user = await getUser(googleId)
  const limits = await getPlanLimits(user.plan)
  const today = new Date().toISOString().split('T')[0]

  const { data: usage } = await supabase
    .from('usage')
    .select('followups_today')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  const followupsToday = usage?.followups_today || 0
  if (followupsToday >= limits.max_followups_per_day) {
    return { allowed: false, limit: limits.max_followups_per_day }
  }

  await supabase
    .from('usage')
    .upsert({ user_id: user.id, date: today, followups_today: followupsToday + count }, { onConflict: 'user_id,date' })

  return { allowed: true }
}

export async function trackApiCost(googleId, costUsd) {
  if (!Number.isFinite(costUsd) || costUsd < 0) return
  const user = await getUser(googleId)
  const today = new Date().toISOString().split('T')[0]

  // FIX: must ADD to today's existing cost, not overwrite it.
  // Read current value first, then upsert the accumulated total.
  const { data: existing } = await supabase
    .from('usage')
    .select('api_cost_usd')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  const currentCost = parseFloat(existing?.api_cost_usd || 0)

  await supabase
    .from('usage')
    .upsert({ user_id: user.id, date: today, api_cost_usd: currentCost + costUsd }, { onConflict: 'user_id,date' })
}

export async function getAllUsersForMarketing() {
  const { data } = await supabase
    .from('users')
    .select('email, name, plan, country, created_at, last_active_at')
    .order('created_at', { ascending: false })
  return data || []
}

export async function getSenderProfile(googleId) {
  const { data, error } = await supabase
    .from('users')
    .select('company_name, sender_name, value_prop, proof_point, email_signature, onboarded, name')
    .eq('google_id', googleId)
    .single()

  if (error || !data) return null
  return data
}

export async function saveSenderProfile(googleId, { companyName, senderName, valueProp, proofPoint, emailSignature }) {
  const { error } = await supabase
    .from('users')
    .update({
      company_name: companyName,
      sender_name: senderName,
      value_prop: valueProp,
      proof_point: proofPoint,
      email_signature: emailSignature,
      onboarded: true
    })
    .eq('google_id', googleId)

  if (error) throw error
}
