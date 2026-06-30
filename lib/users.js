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

  if (error) throw error
  return data
}

export async function saveSheetId(googleId, sheetId) {
  await supabase
    .from('users')
    .update({ sheet_id: sheetId })
    .eq('google_id', googleId)
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
  const { data } = await supabase
    .from('plan_limits')
    .select('*')
    .eq('plan', plan)
    .single()
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

  await supabase
    .from('usage')
    .upsert({ user_id: user.id, date: today, runs_today: runsToday + 1 }, { onConflict: 'user_id,date' })

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
  const user = await getUser(googleId)
  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('usage')
    .upsert({ user_id: user.id, date: today, api_cost_usd: costUsd }, { onConflict: 'user_id,date' })
}

export async function getAllUsersForMarketing() {
  const { data } = await supabase
    .from('users')
    .select('email, name, plan, country, created_at, last_active_at')
    .order('created_at', { ascending: false })
  return data || []
}
