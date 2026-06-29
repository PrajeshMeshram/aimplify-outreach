import Head from 'next/head'
import Link from 'next/link'

const BRAND = 'linear-gradient(135deg, #180008 0%, #5e0023 60%, #A1003d 100%)'
const LAST_UPDATED = 'June 29, 2026'

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy — Leads Genie by Genie Labs</title>
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
              <Link href="/terms" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Terms</Link>
              <Link href="/pricing" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Pricing</Link>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 2rem' }}>
          <p style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>Last updated: {LAST_UPDATED}</p>
          <h1 style={{ fontSize: 28, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>Privacy Policy</h1>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 40, lineHeight: 1.6 }}>
            This Privacy Policy explains how Genie Labs ("we", "our", "us") collects, uses, and protects your information when you use Leads Genie and other products under the Genie Labs brand.
          </p>

          {[
            {
              title: '1. Who we are',
              body: `Leads Genie is a product of Genie Labs, a technology company building AI-powered tools for sales, recruitment, and business growth. Our products include Leads Genie (B2B outreach), Job Genie (AI hiring OS), and others under development. Genie Labs is headquartered in India and serves users globally.`
            },
            {
              title: '2. Information we collect',
              body: `When you sign in with Google, we receive your name, email address, and profile picture. We store this to identify your account and personalise your experience.

We also collect usage data including how many agent runs you perform each day, how many follow-up emails are sent, prospects found, and API costs incurred. This helps us enforce plan limits and improve the product.

When you use Leads Genie, the AI agents research and generate prospect data. This data is written directly to your own Google Sheet — we do not store your contact data or prospect lists on our servers.

We may collect metadata about how you found us, including UTM parameters (source, medium, campaign) to understand which marketing channels are working.`
            },
            {
              title: '3. How we use your information',
              body: `We use your information to:
— Operate and personalise your Leads Genie account
— Enforce your plan limits (runs per day, follow-ups per day)
— Track API usage and cost attribution
— Send you product updates, new feature announcements, and upgrade offers via email
— Segment users for marketing campaigns (e.g. users on the free plan, users in India, users who haven't run the agent in 7 days)
— Analyse aggregate usage to improve the product

We will always give you an easy way to unsubscribe from marketing emails.`
            },
            {
              title: '4. Google data and permissions',
              body: `When you sign in with Google, we request the following permissions:

— Gmail (compose only): We use this to create draft emails in your Gmail on your behalf. We never read, scan, or store your existing emails.
— Google Sheets and Drive: We use this to create and write to a single spreadsheet ("Leads Genie — Contacts") in your Google Drive. We never access any other files in your Drive.
— Profile and email: To identify your account.

You can revoke these permissions at any time from your Google Account settings at myaccount.google.com/permissions. Revoking access will prevent Leads Genie from functioning but will not delete any data already in your Google Sheet.

Our use of Google APIs complies with the Google API Services User Data Policy, including the Limited Use requirements.`
            },
            {
              title: '5. Data storage and security',
              body: `Your account information and usage data are stored in Supabase, a secure cloud database with encryption at rest and in transit. Your prospect and contact data lives exclusively in your own Google Sheet — we cannot access it once it is written there.

We use industry-standard security practices including HTTPS everywhere, environment-variable-based secret management, and row-level security on all database tables.

We do not sell your personal data to third parties.`
            },
            {
              title: '6. Third-party services',
              body: `Leads Genie uses the following third-party services to operate:

— OpenRouter: Routes AI requests to models including Google Gemini, OpenAI GPT-4o mini, and Anthropic Claude. Prompts contain only the configuration you select (industry, geography, stage) — no personal data is sent to these models.
— Supabase: Stores your account and usage data.
— Vercel: Hosts the application.
— Stripe: Processes payments (when applicable).
— Google Cloud: OAuth authentication, Gmail, and Google Sheets APIs.

Each of these providers has their own privacy policy and we recommend reviewing them.`
            },
            {
              title: '7. Data retention',
              body: `We retain your account and usage data for as long as your account is active. If you delete your account, we will delete your personal data from our systems within 30 days. Your Google Sheet and its contents belong to you and are not affected by account deletion.`
            },
            {
              title: '8. Your rights',
              body: `You have the right to:
— Access the personal data we hold about you
— Request correction of inaccurate data
— Request deletion of your account and associated data
— Opt out of marketing emails at any time
— Withdraw Google permissions at any time

To exercise any of these rights, contact us at privacy@genielabs.ai.`
            },
            {
              title: '9. Cookies',
              body: `We use only essential cookies required for authentication (NextAuth session cookies). We do not use advertising cookies or third-party tracking pixels.`
            },
            {
              title: '10. Changes to this policy',
              body: `We may update this Privacy Policy from time to time. We will notify you of significant changes by email. Continued use of Leads Genie after changes take effect constitutes acceptance of the revised policy.`
            },
            {
              title: '11. Contact',
              body: `For any privacy-related questions or requests, contact us at:\n\nGenie Labs\nprivacy@genielabs.ai\nIndia`
            }
          ].map(section => (
            <div key={section.title} style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', marginBottom: 10 }}>{section.title}</h2>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{section.body}</p>
            </div>
          ))}

          <div style={{ borderTop: '1px solid #e5e5e3', paddingTop: 24, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <Link href="/terms" style={{ fontSize: 13, color: '#A1003d', textDecoration: 'none' }}>Terms of Service →</Link>
            <Link href="/pricing" style={{ fontSize: 13, color: '#A1003d', textDecoration: 'none' }}>Pricing →</Link>
            <a href="mailto:privacy@genielabs.ai" style={{ fontSize: 13, color: '#A1003d', textDecoration: 'none' }}>privacy@genielabs.ai →</a>
          </div>
        </div>
      </div>
    </>
  )
}
