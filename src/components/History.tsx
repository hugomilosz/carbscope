'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import NextImage from 'next/image'
import { ChevronDown, ChevronUp, Trash2, Loader2, Calendar, Sparkles, TrendingUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

type Analysis = {
  id: string
  image_url: string
  result_summary: string
  result_details: string
  created_at: string
}

type Props = {
  userId: string
}

export default function History({ userId }: Props) {
  const supabase = createClientComponentClient()
  const [history, setHistory] = useState<Analysis[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filterDate, setFilterDate] = useState<string>('')
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (filterDate) {
      const start = new Date(filterDate)
      const end = new Date(filterDate)
      end.setDate(end.getDate() + 1)
      query = query.gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
    }

    const { data, error } = await query

    if (error) {
      setError('Failed to fetch history.')
      setHistory([])
    } else if (data) {
      setHistory(data)

      const urls: Record<string, string> = {}
      for (const entry of data) {
        const { data: urlData } = await supabase.storage
          .from('images')
          .createSignedUrl(entry.image_url, 60 * 60)
        if (urlData?.signedUrl) urls[entry.id] = urlData.signedUrl
      }
      setSignedUrls(urls)
    }

    setLoading(false)
  }, [supabase, userId, filterDate])

  useEffect(() => {
    if (userId) fetchHistory()
  }, [userId, fetchHistory])

  async function deleteEntry(id: string) {
    const confirmed = confirm('Are you sure you want to delete this entry?')
    if (!confirmed) return

    setDeletingId(id)
    const { error } = await supabase.from('analyses').delete().eq('id', id)
    if (error) setError('Failed to delete entry.')
    else setHistory((prev) => prev.filter((item) => item.id !== id))
    setDeletingId(null)
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.3)]">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              📚 Your History
            </h2>
            <p className="text-white/70">Track your nutritional journey</p>
          </div>
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
          <input
            type="date"
            aria-label="Filter by date" // <-- ADD THIS LINE
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all duration-300"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-white/70">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Loader2 className="animate-spin w-8 h-8 text-white" />
          </div>
          <p className="text-lg font-medium">Loading your analysis history...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/20 border border-red-400/30 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
            <p className="text-red-200 font-medium">{error}</p>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/10">
            <span className="text-4xl">📭</span>
          </div>
          <p className="text-white/60 text-lg font-medium mb-2">No entries found</p>
          <p className="text-white/40">Upload and analyse your first food image to get started!</p>
        </div>
      ) : (
        <div className="max-h-[600px] overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {history.map((entry, index) => {
            const isExpanded = expanded === entry.id
            return (
              <div
                key={entry.id}
                className="bg-white/10 border border-white/20 rounded-2xl p-6 shadow-lg transition-all duration-300 hover:bg-white/15 hover:shadow-2xl hover:scale-[1.02] group"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards'
                }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex gap-6 items-center">
                    <div className="relative">
                      <NextImage
                        src={signedUrls[entry.id] ?? '/placeholder-image.png'}
                        alt="Analyzed food image"
                        width={80}
                        height={80}
                        unoptimized
                        className="w-20 h-20 object-cover rounded-xl border-2 border-white/20 shadow-lg group-hover:border-emerald-400/50 transition-all duration-300"
                      />
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center shadow-md">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                          {entry.result_summary}g
                        </p>
                        <span className="bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-sm px-3 py-1 rounded-full font-medium">
                          carbs
                        </span>
                      </div>
                      <p className="text-white/60 text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : entry.id)}
                      aria-label={isExpanded ? 'Collapse entry' : 'Expand entry'}
                      className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-300 p-3 rounded-xl transition-all duration-300 hover:scale-110 group/btn"
                    >
                      {isExpanded ? (
                        <ChevronUp size={20} className="group-hover/btn:scale-110 transition-transform" />
                      ) : (
                        <ChevronDown size={20} className="group-hover/btn:scale-110 transition-transform" />
                      )}
                    </button>

                    <button
                      onClick={() => deleteEntry(entry.id)}
                      disabled={deletingId === entry.id}
                      aria-label="Delete entry"
                      className="bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 p-3 rounded-xl transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                    >
                      {deletingId === entry.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} className="group-hover/btn:scale-110 transition-transform" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="bg-black/20 border border-white/10 rounded-xl p-5">
                      <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center">
                          <span className="text-xs">📊</span>
                        </div>
                        Detailed Analysis
                      </h4>
                      <div className="prose prose-invert max-w-none text-white/90 leading-relaxed">
                        <ReactMarkdown>{entry.result_details}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
