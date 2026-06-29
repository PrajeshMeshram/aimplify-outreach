import { useState, useEffect } from 'react'
import Head from 'next/head'

const STAGES = ['Series A', 'Series B', 'Series C']
const GEOS = ['India', 'USA', 'EU', 'UK', 'UAE']
const INDUSTRIES = ['B2B SaaS', 'HR Tech', 'Fintech', 'EdTech', 'Dev Tools']
const ROLES = ['Head of Marketing', 'VP Marketing', 'Director Marketing', 'CEO']
const STATUS_COLORS = {
  Sent: '#3b82f6',
  'Follow-up 2 Sent': '#f59e0b',
  'Follow-up 3 Sent': '#ef4444',
  Replied: '#10b981',
  Closed: '#6b7280'
}

export default function Home() {
  const [stages, setStages] = useState(['Series A', 'Series B'])
  const [geos, setGeos] = useState(['India', 'USA'])
  const [industries, setIndustries] = useState(['B2B SaaS'])
  const [roles, setRoles] = useState(['Head of Marketing', 'VP Marketing'])
  const [count, setCount] = useState(5)
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState([])
  const [prospects, setProspects] = useState([])
  const [contacts, setContacts] = useState([])
  const [tab, setTab] = useState('agent')
  const [totalCost, setTotalCost] = useState(0)
  const [agentStatus, setAgentStatus] = useState({ research: 'idle', observer: 'idle', email: 'idle' })

  useEffect(() => { loadContacts() }, [])

  const addLog = (agent, msg) => {
    const time = new Date().toTimeString().slice(0, 8)
    setLog(prev => [...prev, { time, agent, msg }])
  }

  const loadContacts = async () => {
    const res = await fetch('/api/contacts')
    const data = await res.json()
    if (data.contacts) setContacts(data.contacts)
  }

  const toggle = (arr, setArr, val) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const runAgents = async () => {
    if (!stages.length || !geos.length) return alert('Select at least one stage and geography')
    setRunning(true)
    setLog([])
    setProspects([])
    setTotalCost(0)
    let cost = 0

    setAgentStatus({ research: 'running', observer: 'idle', email: 'idle' })
    addLog('research', `Starting — ${stages.join(', ')} | ${geos.join(', ')} | ${industries.join(', ')}`)
    addLog('research', 'Reading Google Sheet — checking existing contacts to skip...')

    const resRes = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stages, geos, industries, roles, count })
    })
    const resData = await resRes.json()

    if (resData.error) {
      addLog('research', `Error: ${resData.error}`)
      setAgentStatus(s => ({ ...s, research: 'error' }))
      setRunning(false)
      return
    }

    cost += parseFloat(resData.usage?.cost_usd || 0)
    addLog('research', `Skipped ${resData.existingSkipped} already-contacted companies`)
    addLog('research', `Found ${resData.prospects.length} new prospects`)
    setAgentStatus(s => ({ ...s, research: 'done', observer: 'running' }))

    const verified = []
    for (const p of resData.prospects) {
      addLog('observer', `Verifying ${p.name} at ${p.company}...`)
      const vRes = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect: p })
      })
      const vData = await vRes.json()
      cost += parseFloat(vData.cost_usd || 0)

      if (vData.verified) {
        const finalP = { ...p, email: vData.corrected_email || p.email }
        verified.push(finalP)
        addLog('observer', `✓ ${p.name} verified (${vData.confidence}) — ${vData.note}`)
      } else {
        addLog('observer', `✗ ${p.name} FAILED — ${vData.note} — skipping`)
      }
    }

    setAgentStatus(s => ({ ...s, observer: 'done', email: 'running' }))
    addLog('email', `Writing emails for ${verified.length} verified contacts...`)

    for (const p of verified) {
      addLog('email', `Saving ${p.name} to Google Sheet...`)
      await fetch('/api/save-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: p })
      })
    }

    setAgentStatus(s => ({ ...s, email: 'done' }))
    setProspects(verified)
    setTotalCost(cost.toFixed(4))
    addLog('email', `Done. ${verified.length} prospects ready. Total cost: $${cost.toFixed(4)}`)
    await loadContacts()
    setRunning(false)
  }

  const statusDot = (s) => {
    const c = s === 'running' ? '#f59e0b' : s === 'done' ? '#10b981' : s === 'error' ? '#ef4444' : '#d1d5db'
    return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c, marginRight: 6 }} />
  }

  const followup1Body = (c) =>
    `Hi ${c.name.split(' ')[0]},\n\nJust floating this back up in case it got buried. Still happy to swap notes on what's working in B2B SaaS demand gen right now.\n\nNo pressure either way.\n\nPrajesh\nhttps://calendar.app.google/fZg4PsBXmLPeLcjY8`

  const followup2Body = (c) =>
    `Hi ${c.name.split(' ')[0]},\n\nI'll keep this short. If the timing isn't right, totally understand. If it ever makes sense to talk about GTM efficiency or CAC at ${c.company}, I'm here.\n\nPrajesh\nhttps://calendar.app.google/fZg4PsBXmLPeLcjY8`

  const daysAgo = (dateStr) => {
    if (!dateStr) return 0
    const [d, m, y] = dateStr.split('-')
    const date = new Date(`${y}-${m}-${d}`)
    return Math.floor((Date.now() - date) / 86400000)
  }

  const needsFollowup = (c) => {
    const d = daysAgo(c.sent1)
    if (c.status === 'Replied' || c.status === 'Closed') return null
    if (!c.sent2 && d >= 3) return 2
    if (c.sent2 && !c.sent3 && daysAgo(c.sent2) >= 4) return 3
    return null
  }

  const handleFollowup = async (c, num) => {
    await fetch('/api/contacts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: c.email, action: 'followup', followupNum: num })
    })
    await loadContacts()
  }

  const handleStatus = async (c, action) => {
    await fetch('/api/contacts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: c.email, action })
    })
    await loadContacts()
  }

  const dueCount = contacts.filter(c => needsFollowup(c)).length
  const repliedCount = contacts.filter(c => c.status === 'Replied').length

  return (
    <>
      <Head>
        <title>B2B Outreach</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#f8f8f7', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ borderBottom: '1px solid #e5e5e3', background: '#fff', padding: '0 2rem' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 600, fontSize: 16, color: '#1a1a1a' }}>AImplify</span>
              <span style={{ fontSize: 12, color: '#888', background: '#f0f0ef', padding: '2px 8px', borderRadius: 20 }}>Outreach Agent</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['agent', 'crm'].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: tab === t ? '#f0f0ef' : 'transparent', color: tab === t ? '#1a1a1a' : '#888', fontWeight: tab === t ? 500 : 400 }}>
                  {t === 'agent' ? 'Agent' : `CRM ${dueCount > 0 ? `(${dueCount} due)` : ''}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem' }}>

          {tab === 'agent' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem' }}>
                <div>
                  <div style={{ background: '#fff', border: '1px solid #e5e5e3', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 12 }}>Configuration</p>

                    {[
                      { label: 'Funding stage', items: STAGES, selected: stages, set: setStages },
                      { label: 'Geography', items: GEOS, selected: geos, set: setGeos },
                      { label: 'Industry', items: INDUSTRIES, selected: industries, set: setIndustries },
                    ].map(({ label, items, selected, set }) => (
                      <div key={label} style={{ marginBottom: 14 }}>
                        <p style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {items.map(i => (
                            <button key={i} onClick={() => toggle(selected, set, i)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, border: '1px solid', borderColor: selected.includes(i) ? '#3b82f6' : '#e5e5e3', background: selected.includes(i) ? '#eff6ff' : '#fff', color: selected.includes(i) ? '#2563eb' : '#666', cursor: 'pointer' }}>
                              {i}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div style={{ marginBottom: 14 }}>
                      <p style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prospects per run</p>
                      <select value={count} onChange={e => setCount(parseInt(e.target.value))} style={{ fontSize: 13, padding: '6px 10px', border: '1px solid #e5e5e3', borderRadius: 6, width: '100%' }}>
                        {[3, 5, 10].map(n => <option key={n} value={n}>{n} prospects</option>)}
                      </select>
                    </div>

                    <button onClick={runAgents} disabled={running} style={{ width: '100%', padding: '9px', fontSize: 13, fontWeight: 500, background: running ? '#e5e5e3' : '#1a1a1a', color: running ? '#888' : '#fff', border: 'none', borderRadius: 8, cursor: running ? 'not-allowed' : 'pointer' }}>
                      {running ? 'Running agents...' : 'Run agents'}
                    </button>

                    {totalCost > 0 && (
                      <p style={{ fontSize: 11, color: '#888', textAlign: 'center', marginTop: 8 }}>API cost this run: <strong>${totalCost}</strong></p>
                    )}
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #e5e5e3', borderRadius: 12, padding: '1.25rem' }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 12 }}>Agents</p>
                    {[
                      { key: 'research', label: 'Research agent', desc: 'Finds prospects, skips known companies' },
                      { key: 'observer', label: 'Observer agent', desc: 'Verifies current employment' },
                      { key: 'email', label: 'Email agent', desc: 'Writes and saves to sheet' }
                    ].map(a => (
                      <div key={a.key} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0ef' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {statusDot(agentStatus[a.key])}
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{a.label}</span>
                        </div>
                        <p style={{ fontSize: 11, color: '#888', marginTop: 2, marginLeft: 14 }}>{a.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  {log.length > 0 && (
                    <div style={{ background: '#fff', border: '1px solid #e5e5e3', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', maxHeight: 200, overflowY: 'auto' }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 8 }}>Activity log</p>
                      {log.map((l, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid #f8f8f7', fontSize: 12 }}>
                          <span style={{ color: '#bbb', minWidth: 50 }}>{l.time}</span>
                          <span style={{ minWidth: 64, fontWeight: 500, color: l.agent === 'research' ? '#3b82f6' : l.agent === 'observer' ? '#f59e0b' : '#10b981' }}>{l.agent}</span>
                          <span style={{ color: '#555' }}>{l.msg}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {prospects.map((p, i) => (
                      <div key={i} style={{ background: '#fff', border: '1px solid #e5e5e3', borderRadius: 12, padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div>
                            <p style={{ fontWeight: 500, fontSize: 14, color: '#1a1a1a' }}>{p.name}</p>
                            <p style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{p.role} · {p.company} · {p.country}</p>
                            <p style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{p.email}</p>
                          </div>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: '#eff6ff', color: '#2563eb' }}>{p.stage}</span>
                            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a' }}>Verified</span>
                          </div>
                        </div>
                        <div style={{ background: '#f8f8f7', borderRadius: 8, padding: 10, borderLeft: '3px solid #3b82f6' }}>
                          <p style={{ fontSize: 11, fontWeight: 500, color: '#2563eb', marginBottom: 4 }}>Subject: {p.subject_line}</p>
                          <p style={{ fontSize: 12, color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.email_body}</p>
                        </div>
                      </div>
                    ))}

                    {prospects.length === 0 && log.length === 0 && (
                      <div style={{ background: '#fff', border: '1px solid #e5e5e3', borderRadius: 12, padding: '3rem', textAlign: 'center', color: '#888', fontSize: 13 }}>
                        Configure your run and click "Run agents" to start
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'crm' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.5rem' }}>
                {[
                  { label: 'Total contacted', val: contacts.length, color: '#1a1a1a' },
                  { label: 'Follow-up due', val: dueCount, color: '#f59e0b' },
                  { label: 'Replied', val: repliedCount, color: '#10b981' },
                  { label: 'Reply rate', val: contacts.length > 0 ? Math.round((repliedCount / contacts.length) * 100) + '%' : '0%', color: '#3b82f6' }
                ].map(s => (
                  <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e5e3', borderRadius: 10, padding: '14px 16px' }}>
                    <p style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{s.label}</p>
                    <p style={{ fontSize: 24, fontWeight: 500, color: s.color }}>{s.val}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {contacts.length === 0 && (
                  <div style={{ background: '#fff', border: '1px solid #e5e5e3', borderRadius: 12, padding: '3rem', textAlign: 'center', color: '#888', fontSize: 13 }}>
                    No contacts yet. Run the agent to add prospects.
                  </div>
                )}
                {contacts.map((c, i) => {
                  const fu = needsFollowup(c)
                  return (
                    <div key={i} style={{ background: '#fff', border: `1px solid ${fu ? '#fbbf24' : '#e5e5e3'}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: '#2563eb', flexShrink: 0 }}>
                            {c.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontWeight: 500, fontSize: 14, color: '#1a1a1a' }}>{c.name}</p>
                            <p style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{c.role} · {c.company} · {c.country}</p>
                            <p style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{c.email}</p>
                            {fu && <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>⏰ Follow-up {fu === 2 ? '1' : '2'} due ({daysAgo(c.sent1)} days since first email)</p>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: '#eff6ff', color: '#2563eb' }}>{c.stage}</span>
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: '#f0f0ef', color: STATUS_COLORS[c.status] || '#888' }}>{c.status}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                        {fu && (
                          <button onClick={() => handleFollowup(c, fu)} style={{ fontSize: 11, padding: '5px 10px', border: '1px solid #fbbf24', background: '#fffbeb', color: '#b45309', borderRadius: 6, cursor: 'pointer' }}>
                            Send follow-up {fu === 2 ? '1' : '2'}
                          </button>
                        )}
                        {c.status !== 'Replied' && (
                          <button onClick={() => handleStatus(c, 'replied')} style={{ fontSize: 11, padding: '5px 10px', border: '1px solid #e5e5e3', background: '#fff', color: '#555', borderRadius: 6, cursor: 'pointer' }}>
                            Mark replied
                          </button>
                        )}
                        {c.status !== 'Closed' && (
                          <button onClick={() => handleStatus(c, 'closed')} style={{ fontSize: 11, padding: '5px 10px', border: '1px solid #e5e5e3', background: '#fff', color: '#555', borderRadius: 6, cursor: 'pointer' }}>
                            Close
                          </button>
                        )}
                        <a href={`https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_SHEET_ID || '1tYV_nuKZvPY6sNk3xzgm_lhmpGsPyueSMPWpfVo1LuA'}/edit`} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: '5px 10px', border: '1px solid #e5e5e3', background: '#fff', color: '#555', borderRadius: 6, cursor: 'pointer', textDecoration: 'none' }}>
                          View in sheet ↗
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
