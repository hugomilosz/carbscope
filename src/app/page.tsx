'use client'

import { useState } from 'react'
import { useAuth } from '../components/AuthProvider'
import Login from '../components/Login'
import ImageUpload from '../components/ImageUpload'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import History from '../components/History'
import Stats from '../components/Stats'
import { Zap, TrendingUp, Shield, ArrowRight, Loader2, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { Analytics } from '@vercel/analytics/react'

const supabase = createClientComponentClient()

export default function Home() {
  const { user, signOut } = useAuth()
  const [isGuest, setIsGuest] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<{ summary: string; details: string; items: { name: string; carbs: number }[]} | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [userContext, setUserContext] = useState('')
  const [mealSize, setMealSize] = useState('standard')

  if (!user && !isGuest) {
    return <Login onGuestLogin={() => setIsGuest(true)} />
  }

  function handleGoBack() {
    setIsGuest(false)
    setUploadedImageUrl(null)
    setAnalysis(null)
  }

  async function analyzeImage() {
    if (!uploadedImageUrl) return
    setLoading(true)
    setError(null)
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + Math.random() * 15, 85))
    }, 300)

    try {
      let imageUrlForApi: string
      if (isGuest && uploadedImageUrl.startsWith('data:image/')) {
        imageUrlForApi = uploadedImageUrl
      } else if (user) {
        const { data: signedUrlData, error: urlError } = await supabase
          .storage
          .from('images')
          .createSignedUrl(uploadedImageUrl, 60 * 5)

        if (urlError || !signedUrlData?.signedUrl) {
          throw new Error('Failed to generate image access URL')
        }
        imageUrlForApi = signedUrlData.signedUrl
      } else {
        throw new Error("Invalid image state for analysis.")
      }

      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: imageUrlForApi, userContext, mealSize }),
      })

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()

      clearInterval(progressInterval)
      setUploadProgress(100)
      setAnalysis(data)

      if (user) {
        await supabase.from('analyses').insert({
          user_id: user.id,
          image_url: uploadedImageUrl,
          result_summary: data.summary,
          result_details: data.details,
        })
      }
    } catch (err: any) {
      clearInterval(progressInterval)
      setError(err.message || 'Failed to analyse image')
    } finally {
      setLoading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  function CarbBreakdown({ items }: { items: { name: string; carbs: number }[] }) {
    if (!items || items.length === 0) return null

    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-3">Carbohydrate Breakdown</h3>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex justify-between">
              <span className="text-gray-200 capitalize">{item.name}</span>
              <span className="font-semibold text-emerald-300">{item.carbs}g</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  function FullAnalysis({ details }: { details: string }) {
    const [expanded, setExpanded] = useState(false)

    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left font-semibold text-emerald-300"
        >
          <span>{expanded ? 'Hide Full AI Reasoning' : 'View Full AI Reasoning'}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="mt-4 text-gray-200 whitespace-pre-wrap text-sm">
            {details}
          </div>
        )}
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 relative text-white">
      {/* Soft background accent */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-tr from-emerald-400/20 to-cyan-400/20 rounded-full blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(0,255,255,0.05),transparent_70%)]" />

      <div className="relative z-10 max-w-4xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          {user ? (
            <button
              onClick={() => signOut()}
              className="text-sm bg-white/10 border border-white/20 px-4 py-2 rounded-xl hover:bg-white/20 transition"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 text-sm bg-white/10 border border-white/20 px-4 py-2 rounded-xl hover:bg-white/20 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          )}
        </div>

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-3">
            CarbScope
          </h1>
          <p className="text-gray-300 max-w-xl mx-auto">
            Upload your meal photo for instant AI-powered carbohydrate estimation.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-8 shadow-xl">
          <ImageUpload
            userId={user ? user.id : 'guest'}
            isGuest={isGuest}
            onUploadComplete={(url) => {
              setUploadedImageUrl(url)
              setAnalysis(null)
            }}
          />

          {/* Meal size selector */}
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {['small', 'standard', 'large'].map(size => {
              const active = mealSize === size
              return (
                <label
                  key={size}
                  className={`p-4 rounded-xl border text-center cursor-pointer transition-all ${
                    active ? 'bg-emerald-500/20 border-emerald-400/50' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="mealSize"
                    value={size}
                    checked={active}
                    onChange={() => setMealSize(size)}
                    className="sr-only"
                  />
                  <div className="text-2xl mb-2">
                    {size === 'small' ? '🥄' : size === 'standard' ? '🍽️' : '🍱'}
                  </div>
                  <p className="capitalize text-sm">{size}</p>
                </label>
              )
            })}
          </div>

          {/* Context Input */}
          <div className="mt-6">
            <textarea
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              placeholder="E.g. 'Grilled chicken with rice and beans.'"
              rows={3}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-xl p-4 resize-none"
            />
          </div>

          {/* Analyse Button */}
          {uploadedImageUrl && (
            <div className="mt-6">
              <button
                onClick={analyzeImage}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-4 px-8 rounded-2xl transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Estimating...
                  </>
                ) : (
                  <>
                    <Zap className="w-6 h-6" />
                    Estimate Carbohydrates
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {loading && (
                <div className="mt-3 bg-white/10 rounded-full h-2">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-6 bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl p-4">
              {error}
            </div>
          )}

          {/* Analysis */}
          {analysis && (
            <div className="mt-8 space-y-6">
              <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-400/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                  <h2 className="text-xl font-semibold">Analysis Complete</h2>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-emerald-300 mb-2">{analysis.summary}g</div>
                  <p className="text-gray-300">Total Carbohydrates</p>
                </div>
              </div>

              <CarbBreakdown items={analysis.items} />
              <FullAnalysis details={analysis.details} />
            </div>
          )}

        </div>

        {/* Stats & History */}
        {user && (
          <>
            <Stats userId={user.id} />
            <div className="mt-8 bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl">
              <History userId={user.id} />
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-10 text-gray-400 text-sm space-y-2">
          <p>👨‍💻 Developed by Hugo Miloszewski • 🚀 Powered by Groq API & Llama 4 Scout</p>
          <div className="flex justify-center items-center gap-2 text-red-300 bg-red-500/10 border border-red-400/30 rounded-full px-4 py-2 inline-flex">
            <Shield className="w-4 h-4" />
            For estimation only — not for medical use
          </div>
        </div>
      </div>

      <Analytics />
    </div>
  )
}
