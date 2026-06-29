import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { upsertUser } from '../../../lib/users'

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: [
            'openid', 'email', 'profile',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/gmail.compose'
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        await upsertUser({
          email: user.email,
          name: user.name,
          avatar: user.image,
          googleId: profile.sub,
          country: null
        })
      } catch (e) {
        console.error('Supabase upsert error:', e.message)
      }
      return true
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        token.googleId = profile?.sub
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      session.googleId = token.googleId
      return session
    }
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET
}

export default NextAuth(authOptions)
