'use client'

import { useState } from 'react'
import { useAuth } from '../components/AuthProvider'
import Login from '../components/Login'
import ImageUpload from '../components/ImageUpload'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import History from '../components/History'
import Stats from '../components/Stats'
import { Camera, Zap, TrendingUp, Shield, Sparkles, ArrowRight, Upload, Loader2, Check, ArrowLeft } from 'lucide-react'
import { Analytics } from '@vercel/analytics/react'


const supabase = createClientComponentClient()

export default function Home() {
  const { user, signOut } = useAuth()
  const [isGuest, setIsGuest] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<{ summary: string; details: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [userContext, setUserContext] = useState('')
  const [mealSize, setMealSize] = useState('standard') 

  // If not a logged-in user AND not a guest, show the Login component.
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
      let imageUrlForApi: string;
      // For guests, the uploadedImageUrl is a Base64 data URL.
      // For logged-in users, it's a file path that needs a signed URL.
      if (isGuest && uploadedImageUrl.startsWith('data:image/')) {
        imageUrlForApi = uploadedImageUrl;
      } else if (user) {
        const { data: signedUrlData, error: urlError } = await supabase
          .storage
          .from('images')
          .createSignedUrl(uploadedImageUrl, 60 * 5)

        if (urlError || !signedUrlData?.signedUrl) {
          throw new Error('Failed to generate image access URL')
        }
        imageUrlForApi = signedUrlData.signedUrl;
      } else {
        throw new Error("Invalid image state for analysis.");
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

      // Only save analysis if a user is logged in
      if (user) {
        const { error: insertError } = await supabase.from('analyses').insert({
          user_id: user.id,
          image_url: uploadedImageUrl,
          result_summary: data.summary,
          result_details: data.details,
        })
  
        if (insertError) {
          console.error('Failed to save analysis:', insertError.message)
        }
      }
    } catch (err: any) {
      clearInterval(progressInterval)
      setError(err.message || 'Failed to analyse image')
    } finally {
      setLoading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-blue-400 to-cyan-400 rounded-full opacity-15 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full opacity-10 animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-between items-center mb-6">
              <div className="flex-1"></div>
              <div className="inline-flex items-center gap-3 bg-white/10 border border-white/20 rounded-full px-6 py-3">
                <Sparkles className="w-5 h-5 text-yellow-400 animate-spin" />
                <span className="text-white/90 font-medium">AI-Powered Nutrition Analysis</span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div className="flex-1 flex justify-end">
                {user ? (
                  <button
                    onClick={() => signOut()}
                    className="bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 px-4 py-2 rounded-full transition-all duration-300"
                  >
                    Logout
                  </button>
                ) : (
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 px-4 py-2 rounded-full transition-all duration-300"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                  </button>
                )}
              </div>
            </div>
            
            <h1 className="text-6xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              CarbScope
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              Snap a photo of your food to get a quick carbohydrate count estimate.
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl mb-8 transform hover:scale-[1.02] transition-all duration-300">
            {/* Image Upload Component */}
            <div className="mb-8">
              {/* Pass a generic ID for guests */}
              <ImageUpload
                userId={user ? user.id : 'guest-sessions'}
                isGuest={isGuest} 
                onUploadComplete={(filePathOrDataUrl) => {
                  setUploadedImageUrl(filePathOrDataUrl)
                  setAnalysis(null)
                }}
              />
            </div>

            {/* Meal Size Selector */}
            <div className="pt-4">
              <div className="grid md:grid-cols-3 gap-4">
                {['small', 'standard', 'large'].map((size) => {
                  const isSelected = mealSize === size
                  return (
                    <label
                      key={size}
                      className={`cursor-pointer rounded-xl p-4 text-center transition-all duration-300 group
                        ${isSelected
                          ? 'bg-purple-500/20 border-purple-400/50 ring-2 ring-purple-300'
                          : 'bg-white/5 border-white/10'}
                        border hover:bg-white/10`}
                    >
                      <input
                        type="radio"
                        name="mealSize"
                        value={size}
                        className="sr-only"
                        onChange={() => setMealSize(size)}
                        checked={isSelected}
                      />
                      <div className="text-xl mb-2 group-hover:scale-110 transition-transform">
                        {size === 'small' ? '🥄' : size === 'standard' ? '🍽️' : '🍱'}
                      </div>
                      <h4 className="text-white font-medium text-sm capitalize mb-1">{size}</h4>
                      <p className="text-white/60 text-xs">
                        {size === 'small'
                          ? 'Light snack or side'
                          : size === 'standard'
                          ? 'Average single meal'
                          : 'Big portion or combo'}
                      </p>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-white/80 block mb-2">Optional Context</label>
              <textarea
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 resize-none"
                rows={3}
                placeholder="E.g. 'This is a veggie burrito with beans and rice inside.'"
              />
            </div>

            {/* Analyse Button */}
            {uploadedImageUrl && (
              <div className="mb-8">
                <button
                  onClick={analyzeImage}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <div className="relative flex items-center justify-center gap-3">
                    {loading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-lg">Estimating...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-6 h-6" />
                        <span className="text-lg">Estimate Carbohydrates</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </div>
                </button>

                {/* Progress Bar */}
                {loading && uploadProgress > 0 && (
                  <div className="mt-4 bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 transition-all duration-300 ease-out rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 rounded-xl text-red-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  {error}
                </div>
              </div>
            )}

            {/* Analysis Results */}
            {analysis && (
              <div className="space-y-6">
                {/* Summary Card */}
                <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Analysis Complete</h2>
                      <p className="text-emerald-300">AI-powered nutritional breakdown</p>
                    </div>
                  </div>
                  
                  <div className="text-center py-6">
                    <div className="text-6xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-2">
                      {analysis.summary}g
                    </div>
                    <p className="text-xl text-white/80">Total Carbohydrates</p>
                  </div>
                </div>

                {/* Detailed Analysis */}
                <div className="bg-white/10 border border-white/20 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                      <span className="text-sm">📊</span>
                    </div>
                    Detailed Analysis
                  </h3>
                  <div className="prose prose-invert max-w-none text-white/90 leading-relaxed whitespace-pre-wrap bg-black/20 p-4 rounded-xl border border-white/10">
                    {analysis.details}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Show Stats if a user exists */}
          {user && (
            <Stats userId={user!.id} />
          )}

          {/* Show History if a user exists */}
          {user && (
            <div className="bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl mb-8">
              <History userId={user!.id} />
            </div>
          )}

          {/* Footer */}
          <div className="text-center space-y-4 text-white/60">
            <div className="flex justify-center items-center gap-4 text-sm">
              <span>👨‍💻 Developed by Hugo Miloszewski</span>
              <div className="w-1 h-1 bg-white/40 rounded-full"></div>
              <span>🚀 Powered by Groq API & Llama 4 Scout</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-400/30 rounded-full px-4 py-2 text-red-300">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">For estimation purposes only - consult professionals for medical decisions</span>
            </div>
          </div>
        </div>
      </div>
      {/* Vercel Analytics */}
      <Analytics />
    </div>
  )
}