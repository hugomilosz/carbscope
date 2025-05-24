'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { Mail, Lock, Sparkles, LogIn, Chrome, AlertCircle, Loader2 } from 'lucide-react'

export default function Login() {
  const { signIn, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    try {
      await signIn(email, password)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
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
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 relative overflow-hidden flex items-center justify-center px-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-blue-400 to-cyan-400 rounded-full opacity-15 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full opacity-10 animate-pulse delay-2000"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/10 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl transform hover:scale-[1.02] transition-all duration-300">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 mb-6">
              <Sparkles className="w-5 h-5 text-yellow-400 animate-spin" />
              <span className="text-white/90 font-medium">Welcome to CarbScope</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            
            <h1 className="text-4xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              CarbScope
            </h1>
            {/* <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2> */}
            <p className="text-white/70">Sign in to start counting your carbs</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all duration-300"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all duration-300"
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <div className="relative flex items-center justify-center gap-3">
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing you in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Sign In</span>
                  </>
                )}
              </div>
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gradient-to-r from-purple-900 to-indigo-900 px-4 text-white/70 font-medium">
                or continue with
              </span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-medium py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <div className="relative flex items-center justify-center gap-3">
              {googleLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                    <Chrome className="w-3 h-3 text-gray-700" />
                  </div>
                  <span>Continue with Google</span>
                </>
              )}
            </div>
          </button>

          {/* Error Message */}
          {error && (
            <div className="mt-6 bg-red-500/20 border border-red-400/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-red-200 font-medium">Authentication Error</p>
                  <p className="text-red-300/80 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-white/60 text-sm">
              New to CarbScope?{' '}
              <span className="text-purple-400 font-medium cursor-pointer hover:text-purple-300 transition-colors">
                Create an account
              </span>
            </p>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="text-center mt-8 space-y-4 text-white/60">
          <div className="flex justify-center items-center gap-4 text-sm">
            <span>👨‍💻 Developed by Hugo Miloszewski</span>
            <div className="w-1 h-1 bg-white/40 rounded-full"></div>
            <span>🚀 Powered by Groq API & Llama 4 Scout</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-2 text-blue-300">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Instant nutritional analysis at your fingertips</span>
          </div>
        </div>
      </div>
    </div>
  )
}