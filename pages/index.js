import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'

// ---- Design tokens (Apple OS inspired: neutral surfaces, single accent, subtle depth) ----
const ACCENT = '#A1003d'
const ACCENT_DARK = '#5e0023'
const ACCENT_DARKEST = '#180008'
const BRAND = `linear-gradient(135deg, ${ACCENT_DARKEST} 0%, ${ACCENT_DARK} 60%, ${ACCENT} 100%)`
const SURFACE = '#ffffff'
const CANVAS = '#f5f5f7'          // Apple's signature near-white canvas
const BORDER = '#e5e5e7'
const TEXT_PRIMARY = '#1d1d1f'    // Apple's near-black
const TEXT_SECONDARY = '#6e6e73'  // Apple's secondary gray
const TEXT_TERTIARY = '#86868b'
const SHADOW_SM = '0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.02)'
const SHADOW_MD = '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'
const RADIUS = 12

const STAGES = ['Series A', 'Series B', 'Series C']
const GEOS = ['India', 'USA', 'EU', 'UK', 'UAE']
const INDUSTRIES = ['B2B SaaS', 'HR Tech', 'Fintech', 'EdTech', 'Dev Tools']

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stages, setStages] = useState(['Series A', 'Series B'])
  const [geos, setGeos] = useState(['India', 'USA'])
  const [industries, setIndustries] = useState(['B2B SaaS'])
  const [count, setCount] = useState(10)
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState([])
  const [prospects, setProspects] = useState([])
  const [contacts, setContacts] = useState([])
  const [tab, setTab] = useState('agent')
  const [totalCost, setTotalCost] = useState(0)
  const [exportStatus, setExportStatus] = useState(null)
  const [agentStatus, setAgentStatus] = useState({ research: 'idle', observer: 'idle', email: 'idle' })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated') loadContacts()
  }, [status])

  const addLog = (agent, msg) => {
    const time = new Date().toTimeString().slice(0, 8)
    setLog(prev => [...prev, { time, agent, msg }])
  }

  const loadContacts = async () => {
    const res = await fetch('/api/contacts')
    if (res.status === 401) { router.push('/login'); return }
    if (!res.ok) return
    const data = await res.json()
    if (data.contacts) setContacts(data.contacts)
  }

  const toggle = (arr, setArr, val) => setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])

  const runAgents = async () => {
    if (!stages.length || !geos.length) {
      addLog('system', 'Select at least one funding stage and one geography before running.')
      return
    }
    setRunning(true); setLog([]); setProspects([]); setTotalCost(0)
    let cost = 0

    setAgentStatus({ research: 'running', observer: 'idle', email: 'idle' })
    addLog('research', `Starting — ${stages.join(', ')} | ${geos.join(', ')}`)
    addLog('research', 'Checking your CRM for already-contacted companies...')

    const resRes = await fetch('/api/research', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stages, geos, industries, count })
    })
    const resData = await resRes.json()
    if (resData.error) { addLog('research', `Error: ${resData.error}`); setAgentStatus(s => ({ ...s, research: 'error' })); setRunning(false); return }
    cost += parseFloat(resData.usage?.cost_usd || 0)
    addLog('research', `Skipped ${resData.existingSkipped} already-contacted companies`)
    addLog('research', `Found ${resData.prospects.length} new prospects`)
    setAgentStatus(s => ({ ...s, research: 'done', observer: 'running' }))

    const verified = []
    for (const p of resData.prospects) {
      addLog('observer', `Verifying ${p.name} at ${p.company}...`)
      const vRes = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prospect: p }) })
      const vData = await vRes.json()
      cost += parseFloat(vData.cost_usd || 0)
      if (vData.verified) {
        verified.push({ ...p, email: vData.corrected_email || p.email })
        addLog('observer', `Verified — ${p.name} (${vData.confidence} confidence)`)
      } else {
        addLog('observer', `Skipped — ${p.name}: ${vData.note}`)
      }
    }

    setAgentStatus(s => ({ ...s, observer: 'done', email: 'running' }))

    if (verified.length === 0) {
      addLog('email', `No verified prospects to save — all ${resData.prospects.length} contacts failed verification`)
      setAgentStatus(s => ({ ...s, email: 'done' }))
      setTotalCost(cost.toFixed(4))
      await loadContacts()
      setRunning(false)
      return
    }

    addLog('email', `Writing emails and creating Gmail drafts for ${verified.length} prospects...`)
    const finalProspects = []

    for (const p of verified) {
      addLog('email', `Writing email for ${p.name}...`)
      const writeRes = await fetch('/api/write-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect: p })
      })
      const writeData = await writeRes.json()

      if (!writeRes.ok) {
        addLog('email', `Failed to write email for ${p.name}: ${writeData.error || 'unknown error'}`)
        continue
      }
      cost += parseFloat(writeData.cost_usd || 0)

      if (writeData.gmailDraftId) addLog('email', `Gmail draft created — ${p.name}`)
      else if (writeData.draftError) addLog('email', `${p.name}: ${writeData.draftError}`)

      const saveRes = await fetch('/api/save-contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: p, gmailDraftId: writeData.gmailDraftId })
      })

      if (saveRes.ok) {
        addLog('email', `Saved — ${p.name}`)
        finalProspects.push({ ...p, subject_line: writeData.subject, email_body: writeData.body, gmailDraftId: writeData.gmailDraftId })
      } else {
        const saveData = await saveRes.json()
        addLog('email', `Failed to save ${p.name}: ${saveData.error || 'unknown error'}`)
      }
    }

    setAgentStatus(s => ({ ...s, email: 'done' }))
    setProspects(finalProspects)
    setTotalCost(cost.toFixed(4))
    addLog('email', `Done — ${finalProspects.length} prospects ready in Gmail Drafts ($${cost.toFixed(4)})`)
    await loadContacts()
    setRunning(false)
  }

  const daysAgo = (isoString) => {
    if (!isoString) return 0
    return Math.floor((Date.now() - new Date(isoString)) / 86400000)
  }

  const needsFollowup = (c) => {
    if (c.status === 'Replied' || c.status === 'Closed') return null
    if (!c.sent2_at && daysAgo(c.sent1_at) >= 3) return 2
    if (c.sent2_at && !c.sent3_at && daysAgo(c.sent2_at) >= 4) return 3
    return null
  }

  const handleFollowup = async (c, num) => {
    await fetch('/api/contacts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: c.email, action: 'followup', followupNum: num }) })
    await loadContacts()
  }

  const handleStatus = async (c, action) => {
    await fetch('/api/contacts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: c.email, action }) })
    await loadContacts()
  }

  const exportToSheets = async () => {
    setExportStatus('exporting')
    try {
      const res = await fetch('/api/export-sheet', { method: 'POST' })
      const data = await res.json()
      setExportStatus(res.ok ? { success: true, ...data } : { success: false, error: data.error })
    } catch (e) {
      setExportStatus({ success: false, error: e.message })
    }
  }

  const dueCount = contacts.filter(c => needsFollowup(c)).length
  const repliedCount = contacts.filter(c => c.status === 'Replied').length
  const canRun = stages.length > 0 && geos.length > 0 && industries.length > 0 && !running

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div style={{ minHeight: '100vh', background: CANVAS, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: TEXT_TERTIARY, fontSize: 13 }}>Loading</div>
      </div>
    )
  }

  // ---- Reusable atoms, styled Apple-OS: pill chips, single accent, subtle borders ----
  const chip = (label, active, onClick) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        fontSize: 13, padding: '6px 13px', borderRadius: 8, border: 'none',
        background: active ? ACCENT : '#f0f0f2',
        color: active ? '#fff' : TEXT_PRIMARY,
        cursor: 'pointer', fontWeight: 500,
        transition: 'background 0.12s ease'
      }}
    >
      {label}
    </button>
  )

  const statusDot = (s) => {
    const map = { running: '#ff9f0a', done: '#34c759', error: '#ff3b30', idle: '#d2d2d7' }
    return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: map[s] || map.idle, marginRight: 8, flexShrink: 0 }} />
  }

  const navItem = (key, label, badge) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '9px 12px', marginBottom: 2,
        border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
        background: tab === key ? '#f0f0f2' : 'transparent',
        color: tab === key ? TEXT_PRIMARY : TEXT_SECONDARY,
        fontSize: 14, fontWeight: tab === key ? 600 : 400,
        transition: 'background 0.12s ease'
      }}
    >
      <span>{label}</span>
      {badge > 0 && (
        <span style={{ fontSize: 11, fontWeight: 600, background: ACCENT, color: '#fff', borderRadius: 10, padding: '1px 7px', minWidth: 18, textAlign: 'center' }}>
          {badge}
        </span>
      )}
    </button>
  )

  return (
    <>
      <Head>
        <title>Leads Genie</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ minHeight: '100vh', background: CANVAS, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, system-ui, sans-serif', display: 'flex' }}>

        {/* ---------- Sidebar (Apple Mail / Finder style) ---------- */}
        <div style={{ width: 220, minWidth: 220, background: SURFACE, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', padding: '1.25rem 0.75rem', position: 'sticky', top: 0, height: '100vh' }}>
          <div style={{ padding: '0 0.5rem', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>L</span>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, lineHeight: 1.1 }}>Leads Genie</p>
                <p style={{ fontSize: 10, color: TEXT_TERTIARY, lineHeight: 1.1, marginTop: 1 }}>Lite</p>
              </div>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            {navItem('agent', 'Agent')}
            {navItem('crm', 'CRM', dueCount)}
            <Link href="/pricing" style={{ textDecoration: 'none' }}>
              <div style={{ padding: '9px 12px', fontSize: 14, color: TEXT_SECONDARY, borderRadius: 8, cursor: 'pointer' }}>Pricing</div>
            </Link>
          </div>

          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '0.75rem' }}>
            {session?.user?.email && (
              <p style={{ fontSize: 11, color: TEXT_TERTIARY, padding: '0 12px', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.user.email}
              </p>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              style={{ width: '100%', textAlign: 'left', padding: '9px 12px', fontSize: 14, color: TEXT_SECONDARY, border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer' }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* ---------- Main content ---------- */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Status strip — single line, muted, not competing for attention */}
          <div style={{ borderBottom: `1px solid ${BORDER}`, background: SURFACE, padding: '10px 2rem' }}>
            <p style={{ fontSize: 12, color: TEXT_TERTIARY }}>
              <span style={{ color: '#34c759' }}>●</span>&nbsp; Connected — contacts saved to your CRM, drafts created in your Gmail
            </p>
          </div>

          <div style={{ maxWidth: 1040, padding: '2rem' }}>

            {tab === 'agent' && (
              <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem' }}>

                {/* Left column: configuration + agents */}
                <div>
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS, padding: '1.5rem', marginBottom: '1rem', boxShadow: SHADOW_SM }}>
                    <p style={{ fontSize: 17, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 18, letterSpacing: '-0.01em' }}>New search</p>

                    {[
                      { label: 'Funding stage', items: STAGES, selected: stages, set: setStages },
                      { label: 'Geography', items: GEOS, selected: geos, set: setGeos },
                      { label: 'Industry', items: INDUSTRIES, selected: industries, set: setIndustries },
                    ].map(({ label, items, selected, set }) => (
                      <div key={label} style={{ marginBottom: 18 }}>
                        <p style={{ fontSize: 12, color: TEXT_TERTIARY, marginBottom: 8, fontWeight: 500 }}>{label}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {items.map(i => chip(i, selected.includes(i), () => toggle(selected, set, i)))}
                        </div>
                      </div>
                    ))}

                    <div style={{ marginBottom: 20 }}>
                      <p style={{ fontSize: 12, color: TEXT_TERTIARY, marginBottom: 8, fontWeight: 500 }}>Prospects per run</p>
                      <select
                        value={count}
                        onChange={e => setCount(parseInt(e.target.value))}
                        style={{ fontSize: 14, padding: '9px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, width: '100%', background: '#f9f9fa', color: TEXT_PRIMARY }}
                      >
                        {[5, 10, 15].map(n => <option key={n} value={n}>{n} prospects</option>)}
                      </select>
                    </div>

                    {/* Fitts's Law: this is the largest, most prominent target on the page */}
                    <button
                      onClick={runAgents}
                      disabled={!canRun}
                      style={{
                        width: '100%', padding: '13px', fontSize: 15, fontWeight: 600,
                        background: !canRun ? '#e8e8ea' : BRAND,
                        color: !canRun ? TEXT_TERTIARY : '#fff',
                        border: 'none', borderRadius: 10, cursor: !canRun ? 'not-allowed' : 'pointer',
                        boxShadow: !canRun ? 'none' : SHADOW_MD,
                        transition: 'transform 0.1s ease'
                      }}
                    >
                      {running ? 'Running…' : 'Run agents'}
                    </button>
                    {totalCost > 0 && (
                      <p style={{ fontSize: 11, color: TEXT_TERTIARY, textAlign: 'center', marginTop: 10 }}>
                        ${totalCost} this run
                      </p>
                    )}
                  </div>

                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS, padding: '1.5rem', boxShadow: SHADOW_SM }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: TEXT_TERTIARY, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pipeline</p>
                    {[
                      { key: 'research', label: 'Research', desc: 'Finding prospects' },
                      { key: 'observer', label: 'Verify', desc: 'Checking employment' },
                      { key: 'email', label: 'Email', desc: 'Writing & drafting' }
                    ].map((a, i) => (
                      <div key={a.key} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? `1px solid ${BORDER}` : 'none' }}>
                        {statusDot(agentStatus[a.key])}
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRIMARY }}>{a.label}</p>
                          <p style={{ fontSize: 11, color: TEXT_TERTIARY }}>{a.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right column: activity + results */}
                <div>
                  {log.length > 0 && (
                    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS, padding: '1.25rem 1.5rem', marginBottom: '1rem', maxHeight: 200, overflowY: 'auto', boxShadow: SHADOW_SM }}>
                      {log.map((l, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '4px 0', fontSize: 12.5 }}>
                          <span style={{ color: '#c7c7cc', minWidth: 54, fontVariantNumeric: 'tabular-nums' }}>{l.time}</span>
                          <span style={{ color: TEXT_SECONDARY }}>{l.msg}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {prospects.map((p, i) => (
                      <div key={i} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS, padding: '1.25rem 1.5rem', boxShadow: SHADOW_SM }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: 15, color: TEXT_PRIMARY }}>{p.name}</p>
                            <p style={{ fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 }}>{p.role} · {p.company}</p>
                            <p style={{ fontSize: 12, color: TEXT_TERTIARY, marginTop: 2 }}>{p.email}</p>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 20, background: '#f0f0f2', color: TEXT_SECONDARY, height: 'fit-content' }}>
                            {p.stage}
                          </span>
                        </div>
                        <div style={{ background: '#f9f9fa', borderRadius: 8, padding: 12 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: ACCENT_DARK, marginBottom: 6 }}>{p.subject_line}</p>
                          <p style={{ fontSize: 12.5, color: TEXT_SECONDARY, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.email_body}</p>
                        </div>
                      </div>
                    ))}

                    {prospects.length === 0 && log.length === 0 && (
                      // Empty state designed as an invitation, not a dead end
                      <div style={{ background: SURFACE, border: `1px dashed ${BORDER}`, borderRadius: RADIUS, padding: '3.5rem 2rem', textAlign: 'center' }}>
                        <p style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 6 }}>No search yet</p>
                        <p style={{ fontSize: 13, color: TEXT_TERTIARY, maxWidth: 320, margin: '0 auto' }}>
                          Pick a stage and geography on the left, then run agents to find your first verified prospects.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {tab === 'crm' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '-0.02em' }}>CRM</p>
                  <button
                    onClick={exportToSheets}
                    disabled={exportStatus === 'exporting' || contacts.length === 0}
                    style={{ fontSize: 13, fontWeight: 500, padding: '8px 16px', border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT_PRIMARY, borderRadius: 8, cursor: contacts.length === 0 ? 'not-allowed' : 'pointer', opacity: contacts.length === 0 ? 0.4 : 1 }}
                  >
                    {exportStatus === 'exporting' ? 'Exporting…' : 'Export to Sheets'}
                  </button>
                </div>

                {exportStatus && exportStatus !== 'exporting' && (
                  <div style={{ background: exportStatus.success ? '#f0fbf3' : '#fef2f2', border: `1px solid ${exportStatus.success ? '#bbf0c8' : '#fecaca'}`, borderRadius: 8, padding: '10px 14px', marginBottom: '1.25rem', fontSize: 12.5, color: exportStatus.success ? '#1a7d3a' : '#dc2626' }}>
                    {exportStatus.success
                      ? <>Exported {exportStatus.exported} new contact{exportStatus.exported !== 1 ? 's' : ''} ({exportStatus.total} total). <a href={exportStatus.sheetUrl} target="_blank" rel="noreferrer" style={{ color: '#1a7d3a', fontWeight: 600 }}>Open sheet →</a></>
                      : `Export failed: ${exportStatus.error}`}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.5rem' }}>
                  {[
                    { label: 'Total', val: contacts.length },
                    { label: 'Follow-up due', val: dueCount, accent: dueCount > 0 },
                    { label: 'Replied', val: repliedCount },
                    { label: 'Reply rate', val: contacts.length > 0 ? Math.round((repliedCount / contacts.length) * 100) + '%' : '0%' }
                  ].map(s => (
                    <div key={s.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS, padding: '1.1rem 1.25rem', boxShadow: SHADOW_SM }}>
                      <p style={{ fontSize: 12, color: TEXT_TERTIARY, marginBottom: 4 }}>{s.label}</p>
                      <p style={{ fontSize: 26, fontWeight: 700, color: s.accent ? ACCENT : TEXT_PRIMARY, letterSpacing: '-0.02em' }}>{s.val}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {contacts.length === 0 && (
                    <div style={{ background: SURFACE, border: `1px dashed ${BORDER}`, borderRadius: RADIUS, padding: '3.5rem 2rem', textAlign: 'center' }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 6 }}>No contacts yet</p>
                      <p style={{ fontSize: 13, color: TEXT_TERTIARY, marginBottom: 16 }}>Run the agent to find and save your first prospects here.</p>
                      <button onClick={() => setTab('agent')} style={{ fontSize: 13, fontWeight: 600, padding: '9px 18px', background: BRAND, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                        Go to Agent
                      </button>
                    </div>
                  )}
                  {contacts.map((c, i) => {
                    const fu = needsFollowup(c)
                    return (
                      <div key={i} style={{ background: SURFACE, border: `1px solid ${fu ? '#ffd9a0' : BORDER}`, borderRadius: RADIUS, padding: '1rem 1.25rem', boxShadow: SHADOW_SM }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#f0f0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: ACCENT_DARK, flexShrink: 0 }}>
                              {c.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: 14.5, color: TEXT_PRIMARY }}>{c.name}</p>
                              <p style={{ fontSize: 13, color: TEXT_SECONDARY, marginTop: 1 }}>{c.role} · {c.company} · {c.country}</p>
                              <p style={{ fontSize: 12, color: TEXT_TERTIARY, marginTop: 1 }}>{c.email}</p>
                              {fu && <p style={{ fontSize: 12, color: '#bf6c00', marginTop: 5, fontWeight: 500 }}>Follow-up {fu === 2 ? '1' : '2'} due · {daysAgo(c.sent1_at)}d since first email</p>}
                              {c.gmail_draft_id && <p style={{ fontSize: 12, color: '#1a7d3a', marginTop: 1 }}>Gmail draft ready</p>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 5, flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, background: '#f0f0f2', color: TEXT_SECONDARY }}>{c.stage}</span>
                            <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, background: c.status === 'Replied' ? '#e8f8ec' : '#f0f0f2', color: c.status === 'Replied' ? '#1a7d3a' : TEXT_SECONDARY }}>{c.status}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                          {fu && (
                            <button onClick={() => handleFollowup(c, fu)} style={{ fontSize: 12, fontWeight: 500, padding: '6px 12px', border: 'none', background: '#fff4e0', color: '#bf6c00', borderRadius: 7, cursor: 'pointer' }}>
                              Send follow-up {fu === 2 ? '1' : '2'}
                            </button>
                          )}
                          {c.status !== 'Replied' && (
                            <button onClick={() => handleStatus(c, 'replied')} style={{ fontSize: 12, padding: '6px 12px', border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT_SECONDARY, borderRadius: 7, cursor: 'pointer' }}>
                              Mark replied
                            </button>
                          )}
                          {c.status !== 'Closed' && (
                            <button onClick={() => handleStatus(c, 'closed')} style={{ fontSize: 12, padding: '6px 12px', border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT_SECONDARY, borderRadius: 7, cursor: 'pointer' }}>
                              Close
                            </button>
                          )}
                          {c.gmail_draft_id && (
                            <a href="https://mail.google.com/mail/u/0/#drafts" target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '6px 12px', border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT_SECONDARY, borderRadius: 7, textDecoration: 'none' }}>
                              Open in Gmail
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
