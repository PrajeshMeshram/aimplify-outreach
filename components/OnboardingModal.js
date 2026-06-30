import { useState } from 'react'

const ACCENT = '#A1003d'
const ACCENT_DARK = '#5e0023'
const ACCENT_DARKEST = '#180008'
const BRAND = `linear-gradient(135deg, ${ACCENT_DARKEST} 0%, ${ACCENT_DARK} 60%, ${ACCENT} 100%)`
const BORDER = '#e5e5e7'
const TEXT_PRIMARY = '#1d1d1f'
const TEXT_TERTIARY = '#86868b'

export default function OnboardingModal({ onComplete, existing }) {
  const [companyName, setCompanyName] = useState(existing?.company_name || '')
  const [senderName, setSenderName] = useState(existing?.sender_name || existing?.name || '')
  const [valueProp, setValueProp] = useState(existing?.value_prop || '')
  const [proofPoint, setProofPoint] = useState(existing?.proof_point || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canSave = companyName.trim() && senderName.trim() && valueProp.trim()

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, senderName, valueProp, proofPoint })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setSaving(false)
        return
      }
      onComplete()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const field = (label, value, setValue, placeholder, optional) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: TEXT_TERTIARY, marginBottom: 6, display: 'block' }}>
        {label}{optional && <span style={{ fontWeight: 400 }}> (optional)</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', fontSize: 14, padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#f9f9fa', color: TEXT_PRIMARY }}
      />
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: BRAND, marginBottom: 16 }} />
        <p style={{ fontSize: 19, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 6, letterSpacing: '-0.01em' }}>Set up your sender profile</p>
        <p style={{ fontSize: 13, color: TEXT_TERTIARY, marginBottom: 22, lineHeight: 1.5 }}>
          This is used to write your outreach emails. We'll never use anyone else's company details — just yours.
        </p>

        {field('Your name', senderName, setSenderName, 'e.g. Priya Sharma')}
        {field('Your company', companyName, setCompanyName, 'e.g. Acme Consulting')}
        {field('What you offer', valueProp, setValueProp, 'e.g. GTM consulting for B2B SaaS companies')}
        {field('Your proof point', proofPoint, setProofPoint, 'e.g. Helped a client cut CAC by 40%', true)}

        {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 12 }}>{error}</p>}

        <button
          onClick={save}
          disabled={!canSave || saving}
          style={{
            width: '100%', padding: '12px', fontSize: 14, fontWeight: 600,
            background: !canSave || saving ? '#e8e8ea' : BRAND,
            color: !canSave || saving ? TEXT_TERTIARY : '#fff',
            border: 'none', borderRadius: 10, cursor: !canSave || saving ? 'not-allowed' : 'pointer',
            marginTop: 6
          }}
        >
          {saving ? 'Saving…' : 'Save and continue'}
        </button>
      </div>
    </div>
  )
}
