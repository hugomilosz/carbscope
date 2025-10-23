'use client'

import { useState, useRef } from 'react'
import { useAuth } from './AuthProvider'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { Mail, Lock, Chrome, Loader2, User, LogIn, ShieldCheck } from 'lucide-react'

export default function Login({ onGuestLogin }: { onGuestLogin: () => void }) {
  const { signIn, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaRef = useRef<HCaptcha | null>(null)

  const handleVerify = (token: string) => {
    setCaptchaToken(token)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification.')
      return
    }

    setLoading(true)
    try {
      await signIn(email, password, { captchaToken })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      // Reset CAPTCHA after each attempt
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)
    }
  }

  async function handleGoogleSignIn() {
    setError(null)
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center px-4 relative text-white">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-tr from-emerald-400/20 to-cyan-400/20 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-3">
            CarbScope
          </h1>
          <p className="text-gray-300">Sign in to start your nutrition journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-400/50 outline-none"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-400/50 outline-none"
            />
          </div>

          {/* 🔒 CAPTCHA */}
          <div className="flex justify-center mt-4">
            <HCaptcha
              ref={captchaRef}
              sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
              onVerify={handleVerify}
              theme="dark"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="my-6 text-center text-gray-400 text-sm">or</div>

        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-4 rounded-xl transition flex items-center justify-center gap-3"
        >
          {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Chrome className="w-5 h-5" />}
          {googleLoading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <button
          onClick={onGuestLogin}
          className="w-full mt-4 bg-white/5 hover:bg-white/10 border border-white/20 text-white py-4 rounded-xl flex items-center justify-center gap-3 transition"
        >
          <User className="w-5 h-5" />
          Continue as Guest
        </button>

        {error && (
          <div className="mt-6 bg-red-500/20 border border-red-400/30 rounded-xl p-4 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="mt-8 text-gray-400 text-xs flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Protected by hCaptcha</span>
        </div>
      </div>
    </div>
  )
}
