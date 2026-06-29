import Head from 'next/head'
import Link from 'next/link'

const BRAND = 'linear-gradient(135deg, #180008 0%, #5e0023 60%, #A1003d 100%)'
const LAST_UPDATED = 'June 29, 2026'

export default function Terms() {
  return (
    <>
      <Head>
        <title>Terms of Service — Leads Genie by Genie Labs</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#f8f8f7', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ background: BRAND, padding: '0 2rem' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 54 }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>Leads Genie</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 20 }}>by Genie Labs</span>
            </Link>
            <div style={{ display: 'flex', gap: 16 }}>
              <Link href="/privacy" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Privacy</Link>
              <Link href="/pricing" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Pricing</Link>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 2rem' }}>
          <p style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>Last updated: {LAST_UPDATED}</p>
          <h1 style={{ fontSize: 28, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>Terms of Service</h1>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 40, lineHeight: 1.6 }}>
            These Terms of Service govern your use of Leads Genie and any other products operated by Genie Labs. By using Leads Genie, you agree to these terms. Please read them carefully.
          </p>

          {[
            {
              title: '1. The service',
              body: `Leads Genie is an AI-powered B2B outreach tool that uses three AI agents to research prospects, verify contact information, and draft personalised cold emails. It is a product of Genie Labs.

The service connects to your Google account to create a dedicated Google Sheet in your Drive and draft emails via your Gmail. You retain full ownership of all data stored in your Google Sheet.`
            },
            {
              title: '2. Eligibility',
              body: `You must be at least 18 years old and capable of forming a binding contract to use Leads Genie. By using the service, you represent that you meet these requirements.

You may not use Leads Genie if you are located in a country subject to a government embargo or if you are on any government list of prohibited parties.`
            },
            {
              title: '3. Acceptable use',
              body: `You agree to use Leads Genie only for lawful B2B outreach purposes. You must not use the service to:

— Send spam or unsolicited emails to individuals who have not consented to receive commercial communications under applicable law (including GDPR, CAN-SPAM, CASL, and India's IT Act)
— Harass, threaten, or abuse any individual
— Impersonate another person or organisation
— Scrape, reverse-engineer, or attempt to extract the underlying AI prompts or infrastructure
— Use the service to build a competing product
— Circumvent plan limits through technical means

You are solely responsible for the emails you send using Leads Genie and for compliance with all applicable anti-spam and data protection laws in your jurisdiction.`
            },
            {
              title: '4. AI-generated content',
              body: `Leads Genie uses AI models (including Google Gemini, OpenAI GPT-4o mini, and Anthropic Claude via OpenRouter) to generate prospect research and email drafts. This content is generated automatically and may contain inaccuracies, outdated information, or errors.

You are responsible for reviewing all AI-generated content before sending. Genie Labs makes no warranty that prospect contact information is accurate, current, or complete. You should independently verify contact details before sending outreach.

Using AI-generated emails does not transfer responsibility for those communications away from you.`
            },
            {
              title: '5. Google API and data',
              body: `By connecting your Google account, you grant Genie Labs permission to:
— Create one spreadsheet in your Google Drive ("Leads Genie — Contacts")
— Write contact data to that spreadsheet
— Create draft emails in your Gmail

We do not read your existing Gmail messages or access any Google Drive files other than the Leads Genie spreadsheet we create. You can revoke these permissions at any time from your Google Account settings.`
            },
            {
              title: '6. Plans, payments, and refunds',
              body: `Leads Genie is available on Free, Starter ($29/month), Pro ($99/month), and Agency ($299/month) plans. Paid plans are billed monthly or annually. Annual plans are non-refundable after the first 14 days.

Monthly plans may be cancelled at any time. Cancellation takes effect at the end of the current billing period. We do not offer prorated refunds for monthly plans.

We reserve the right to change pricing with 30 days notice to existing subscribers.

Daily run limits and follow-up limits are enforced per plan as described on our pricing page. Exceeding limits will result in a 429 error until the following day.`
            },
            {
              title: '7. Intellectual property',
              body: `Leads Genie, its brand, design, code, and AI prompt architecture are owned by Genie Labs. You may not copy, reproduce, or create derivative works from any part of the service.

Contact data and email drafts generated during your use of the service belong to you. Genie Labs claims no ownership over the contents of your Google Sheet.`
            },
            {
              title: '8. Disclaimers',
              body: `Leads Genie is provided "as is" without warranties of any kind, express or implied. We do not warrant that:
— The service will be uninterrupted or error-free
— AI-generated prospect data will be accurate or current
— Emails drafted by the service will result in replies or business outcomes
— The service will be available in all geographies

Genie Labs is not responsible for any business outcomes, lost revenue, or reputational damage arising from use of Leads Genie.`
            },
            {
              title: '9. Limitation of liability',
              body: `To the maximum extent permitted by law, Genie Labs' total liability to you for any claims arising from use of Leads Genie shall not exceed the amount you paid us in the 3 months preceding the claim.

In no event shall Genie Labs be liable for indirect, incidental, special, consequential, or punitive damages, even if advised of the possibility of such damages.`
            },
            {
              title: '10. Termination',
              body: `We may suspend or terminate your access to Leads Genie at any time if you violate these Terms or engage in conduct we determine to be harmful to other users, the service, or third parties.

You may delete your account at any time. Upon termination, your account data will be deleted from our systems within 30 days. Your Google Sheet and its contents will remain in your Google Drive unaffected.`
            },
            {
              title: '11. Governing law',
              body: `These Terms are governed by the laws of India. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Mumbai, Maharashtra, India.`
            },
            {
              title: '12. Changes to these terms',
              body: `We may update these Terms from time to time. We will notify you of significant changes by email with at least 14 days notice. Continued use of Leads Genie after the effective date of changes constitutes acceptance.`
            },
            {
              title: '13. Contact',
              body: `For any questions about these Terms, contact us at:\n\nGenie Labs\nlegal@genielabs.ai\nIndia`
            }
          ].map(section => (
            <div key={section.title} style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 10 }}>{section.title}</h2>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{section.body}</p>
            </div>
          ))}

          <div style={{ borderTop: '1px solid #e5e5e3', paddingTop: 24, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <Link href="/privacy" style={{ fontSize: 13, color: '#A1003d', textDecoration: 'none' }}>Privacy Policy →</Link>
            <Link href="/pricing" style={{ fontSize: 13, color: '#A1003d', textDecoration: 'none' }}>Pricing →</Link>
            <a href="mailto:legal@genielabs.ai" style={{ fontSize: 13, color: '#A1003d', textDecoration: 'none' }}>legal@genielabs.ai →</a>
          </div>
        </div>
      </div>
    </>
  )
}
