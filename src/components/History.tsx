'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react'
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

  async function fetchHistory() {
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

        // Generate signed URLs for each entry
        const urls: Record<string, string> = {}
        // for (const entry of data) {
        // // Assuming entry.image_url is the file path inside the bucket
        //     const { data: urlData, error: urlError } = await supabase.storage
        //         .from('images')
        //         .createSignedUrl(entry.image_url, 60 * 60) // 1 hour expiration

        //     if (urlError) {
        //         console.error('Failed to create signed URL for', entry.id, urlError)
        //     } else if (urlData?.signedUrl) {
        //         urls[entry.id] = urlData.signedUrl
        //     }
        // }
        setSignedUrls(urls)
    }

    setLoading(false)
    }


  useEffect(() => {
    if (userId) fetchHistory()
  }, [userId, filterDate])

  async function deleteEntry(id: string) {
    const confirmed = confirm('Are you sure you want to delete this entry?')
    if (!confirmed) return

    setDeletingId(id)

    const { error } = await supabase.from('analyses').delete().eq('id', id)

    if (error) {
      console.log("FAILED")
      setError('Failed to delete entry.')
    } else {
      setHistory((prev) => prev.filter((item) => item.id !== id))
    }

    setDeletingId(null)
  }

  return (
    <div className="mt-10">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">📚 Your History</h2>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-gray-500">
          <Loader2 className="animate-spin w-6 h-6" />
        </div>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : history.length === 0 ? (
        <p className="text-gray-500">No entries found.</p>
      ) : (
        <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2">
          {history.map((entry) => {
            const isExpanded = expanded === entry.id
            return (
              <div
                key={entry.id}
                className="bg-white border rounded-lg shadow-sm p-4 transition hover:shadow-md"
              >
                <div className="flex justify-between items-center">
                  <div className="flex gap-4 items-center">
                    <img
                      src={entry.image_url ?? '/placeholder-image.png'}
                      alt="Food"
                      className="w-16 h-16 object-cover rounded border"
                    />
                    <div>
                      <p className="font-medium text-green-600 text-lg">
                        {entry.result_summary}g carbs
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : entry.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    <button
                      onClick={() => deleteEntry(entry.id)}
                      disabled={deletingId === entry.id}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 bg-gray-50 border rounded p-3 text-sm text-gray-700 prose max-w-none">
                    <ReactMarkdown>{entry.result_details}</ReactMarkdown>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
