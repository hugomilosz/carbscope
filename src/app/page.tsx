'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '../components/AuthProvider'
import Login from '../components/Login'
import ImageUpload from '../components/ImageUpload'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import History from '../components/History'
import Stats from '../components/Stats'
import { Zap, Shield, ArrowRight, Loader2, ArrowLeft } from 'lucide-react'
import { Analytics } from '@vercel/analytics/react'
import AnalysisResultCard from '@/components/AnalysisResultsCard'
import { AnalysisResult } from '@/lib/types'

const supabase = createClientComponentClient()

export default function Home() {
  const { user, signOut } = useAuth()
  const [isGuest, setIsGuest] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null) 
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [userContext, setUserContext] = useState('')
  const [mealSize, setMealSize] = useState('standard')

  const handleUploadComplete = useCallback((url: string) => {
    setUploadedImageUrl(url)
    setAnalysis(null)
  }, [])

  if (!user && !isGuest) {
    return <Login onGuestLogin={() => setIsGuest(true)} />
  }

  function handleGoBack() {
    setIsGuest(false)
    setUploadedImageUrl(null)
    setAnalysis(null)
    setUserContext('')
  }

  async function analyseImage() {
    if (!uploadedImageUrl) return
    setLoading(true)
    setError(null)
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + Math.random() * 10, 90))
    }, 500)

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
        // Save to DB
        await supabase.from('analyses').insert({
          user_id: user.id,
          image_url: uploadedImageUrl,
          result_summary: data.totalCarbs.toString(), 
          result_details: JSON.stringify(data.items), 
        })
      }
    } catch (err: unknown) {
      clearInterval(progressInterval)
      const message = err instanceof Error ? err.message : String(err)
      setError(message || 'Failed to analyse image')
    } finally {
      setLoading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 relative text-white overflow-x-hidden">
      {/* Background */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-tr from-emerald-400/20 to-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(0,255,255,0.05),transparent_70%)] pointer-events-none" />
      <div className="relative z-10 max-w-4xl mx-auto py-12 px-4">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
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
        </div>

        {/* Main Section */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-3">
            CarbScope
          </h1>
          <p className="text-gray-300 max-w-xl mx-auto">
            Upload your meal photo for instant AI-powered carbohydrate estimation.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-8 shadow-xl">
          <ImageUpload
            userId={user ? user.id : 'guest'}
            isGuest={isGuest}
            onUploadComplete={handleUploadComplete}
          />

          {/* Portion Size Selector */}
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
                  <p className="capitalize text-sm text-gray-300">{size}</p>
                </label>
              )
            })}
          </div>

          {/* User Context */}
          <div className="mt-6">
            <textarea
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              placeholder="E.g. 'Grilled chicken with rice and beans - I didn't eat the bread.'"
              rows={3}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-xl p-4 resize-none focus:outline-none focus:border-emerald-400/50 transition-colors"
            />
          </div>

          {/* Action Button */}
          {uploadedImageUrl && (
            <div className="mt-6">
              <button
                onClick={analyseImage}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-4 px-8 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Analysing Food...
                  </>
                ) : (
                  <>
                    <Zap className="w-6 h-6" />
                    Estimate Carbohydrates
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Progress Bar */}
              {loading && (
                <div className="mt-4 bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-4 flex items-center gap-3">
              <Shield className="w-5 h-5 text-red-400" />
              {error}
            </div>
          )}

          {/* Results Section */}
          {analysis && (
            <div className="mt-12 pt-10 border-t border-white/10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <AnalysisResultCard analysis={analysis} />
            </div>
          )}

        </div>

        {/* Stats & History (Only for Logged in Users) */}
        {user && (
          <div className="animate-in fade-in delay-200 duration-500">
            <Stats userId={user.id} />
            <div className="mt-8 bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl">
              <History userId={user.id} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm space-y-3">
          <p>👨‍💻 Developed by Hugo Miloszewski • 🚀 Powered by Groq Llama 4 (Scout + Maverick)</p>
          <div className="inline-flex items-center gap-2 text-rose-300/80 bg-rose-500/10 border border-rose-500/20 rounded-full px-4 py-1.5">
            <Shield className="w-3 h-3" />
            <span>For estimation only — not for medical use</span>
          </div>
        </div>
      </div>

      <Analytics />
    </div>
  )
}