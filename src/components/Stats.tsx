'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Loader2, TrendingUp, BarChart3, CalendarCheck } from 'lucide-react'

type Analysis = {
  created_at: string
  result_summary: string
}

type DailyTotal = {
  date: string
  totalCarbs: number
}

type Props = {
  userId: string
}

export default function Stats({ userId }: Props) {
  const supabase = createClientComponentClient()
  const [dailyData, setDailyData] = useState<DailyTotal[]>([])
  const [averageDaily, setAverageDaily] = useState(0)
  const [totalEntries, setTotalEntries] = useState(0)
  const [highestDay, setHighestDay] = useState<{ date: string; total: number } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    // Fetch all analyses for the user
    const { data, error } = await supabase
      .from('analyses')
      .select('created_at, result_summary')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error || !data) {
      console.error('Failed to fetch stats data:', error)
      setLoading(false)
      return
    }

    // Process the data
    const totalsByDay: { [key: string]: number } = {}
    data.forEach((entry: Analysis) => {
      const date = new Date(entry.created_at).toLocaleDateString('en-CA')
      const carbs = parseFloat(entry.result_summary)
      if (!isNaN(carbs)) {
        totalsByDay[date] = (totalsByDay[date] || 0) + carbs
      }
    })

    const processedData: DailyTotal[] = Object.entries(totalsByDay).map(([date, totalCarbs]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalCarbs: Math.round(totalCarbs),
    }))

    // Get the last 7 days for the chart
    const last7DaysData = processedData.slice(-7)

    // Calculate overall stats
    const totalDays = Object.keys(totalsByDay).length
    const totalCarbs = Object.values(totalsByDay).reduce((sum, total) => sum + total, 0)
    const avg = totalDays > 0 ? Math.round(totalCarbs / totalDays) : 0

    let highest: { date: string; total: number } | null = null
    if (processedData.length > 0) {
      const highestEntry = Object.entries(totalsByDay).reduce((max, entry) => (entry[1] > max[1] ? entry : max))
      highest = {
        date: new Date(highestEntry[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: Math.round(highestEntry[1]),
      }
    }

    setDailyData(last7DaysData)
    setAverageDaily(avg)
    setTotalEntries(data.length)
    setHighestDay(highest)
    setLoading(false)
  }, [userId, supabase])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-white/70">
        <Loader2 className="w-6 h-6 animate-spin mr-3" />
        <span>Calculating your stats...</span>
      </div>
    )
  }

  if (totalEntries === 0) {
    return null
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.3)]">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Your Stats
          </h2>
          <p className="text-gray-400">A look at your recent activity</p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8 text-white text-center">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-emerald-500/10 transition">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
          <p className="text-3xl font-bold text-white">{averageDaily}g</p>
          <p className="text-gray-400 text-sm">Avg. Daily Carbs</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-blue-300" />
          <p className="text-3xl font-bold">{totalEntries}</p>
          <p className="text-white/60 text-sm">Total Entries</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <CalendarCheck className="w-8 h-8 mx-auto mb-2 text-purple-300" />
          <p className="text-3xl font-bold">{highestDay ? `${highestDay.total}g` : 'N/A'}</p>
          <p className="text-white/60 text-sm">Busiest Day ({highestDay?.date})</p>
        </div>
      </div>

      {/* Chart */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Last 7 Days Trend</h3>
        <div className="h-64 bg-emerald-400/5 p-4 rounded-xl border border-white/10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={false} 
                contentStyle={{
                  backgroundColor: 'rgba(30, 30, 40, 0.8)',
                  borderColor: '#4f46e5',
                  color: '#ffffff',
                  borderRadius: '0.75rem',
                }}
                labelStyle={{ fontWeight: 'bold' }}
                formatter={(value) => [`${value}g`, 'Carbs']}
              />
              <Bar dataKey="totalCarbs" fill="url(#colorUv)" radius={[4, 4, 0, 0] } activeBar={{ fill: '#22d3ee', opacity: 1 }}/>
              <defs>
                <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.5}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}