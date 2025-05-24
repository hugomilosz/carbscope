'use client'

import { useState } from 'react'
import { useAuth } from '../components/AuthProvider'
import Login from '../components/Login'
import ImageUpload from '../components/ImageUpload'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import History from '../components/History'
import ReactMarkdown from 'react-markdown'

const supabase = createClientComponentClient()


export default function Home() {
  const { user, signOut } = useAuth()
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<{ summary: string; details: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return <Login />

  async function analyzeImage() {
    if (!uploadedImageUrl) return
    setLoading(true)
    setError(null)

    try {
      const { data: signedUrlData, error: urlError } = await supabase
        .storage
        .from('images')
        .createSignedUrl(uploadedImageUrl, 60 * 5)

      if (urlError || !signedUrlData?.signedUrl) {
        throw new Error('Failed to generate image access URL')
      }

      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: signedUrlData.signedUrl }),
      })

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()
      setAnalysis(data)

      const { error: insertError } = await supabase.from('analyses').insert({
        user_id: user!.id,
        image_url: uploadedImageUrl,
        result_summary: data.summary,
        result_details: data.details,
      })

      if (insertError) {
        console.error('Failed to save analysis:', insertError.message)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyse image')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-xl p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-blue-700">🍔🔬 CarbScope - Carbohydrate Estimator</h1>
          <button
            onClick={() => signOut()}
            className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>

        <ImageUpload
          userId={user.id}
          onUploadComplete={(filePath) => {
            setUploadedImageUrl(filePath)
            setAnalysis(null)
          }}
        />

        {uploadedImageUrl && (
          <button
            onClick={analyzeImage}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition"
          >
            {loading ? 'Analysing...' : 'Analyse Image'}
          </button>
        )}

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md border border-red-300">
            {error}
          </div>
        )}

        {analysis && (
          <div className="mt-4 bg-gray-50 border border-gray-200 p-5 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">🔍 Analysis Summary</h2>
            <p className="text-2xl font-bold text-green-600 mb-4">{analysis.summary}g total carbs</p>

            <h3 className="font-semibold text-gray-700 mb-1">📊 Detailed Analysis</h3>
            <div className="prose max-w-none text-gray-800 bg-white p-3 rounded-md border whitespace-pre-wrap">
              {/* <ReactMarkdown>{analysis.details}</ReactMarkdown> */}
              {analysis.details}
            </div>
          </div>
        )}
        <History userId={user.id} />

        {/* About Section */}
        <div className="mt-10 pt-6 border-t border-gray-300 max-w-xl mx-auto space-y-2 text-gray-700 text-sm">
          <h4 className="text-lg font-semibold">About This App</h4>
          <p>👨‍💻 Developed by Hugo Miloszewski</p>
          <p>🔍 Powered by Groq API and Meta's Llama 4 Scout model</p>
          <p className="mt-4 text-red-600 font-semibold">
            ⚠️ Disclaimer: This analysis is an estimate only and should not be used for medical or dietary decisions.
          </p>
        </div>
      </div>
    </div>
  )
}
