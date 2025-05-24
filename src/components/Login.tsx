'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'

export default function Login() {
  const { signIn, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await signIn(email, password)
      alert('Logged in!')
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleGoogleSignIn() {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-6">
        <h2 className="text-3xl font-bold text-center text-gray-800">Welcome Back</h2>
        <p className="text-center text-gray-500">Login to continue</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
          >
            Login
          </button>
        </form>

        <div className="relative text-center">
          <span className="text-gray-400">or</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48">
            <path fill="#fff" d="M44.5 20H24v8.5h11.9C34.5 33.3 29.8 37 24 37c-7 0-12.8-5.8-12.8-13S17 11 24 11c3.2 0 6 .9 8.3 2.7l6.3-6.3C34.7 4.5 29.6 3 24 3 11.9 3 2.5 12.4 2.5 24S11.9 45 24 45c11.6 0 21.5-8.5 21.5-21.5 0-1.5-.1-2.9-.3-4.5z"/>
          </svg>
          Sign in with Google
        </button>

        {error && <p className="text-red-600 text-center">{error}</p>}
      </div>
    </div>
  )
}
