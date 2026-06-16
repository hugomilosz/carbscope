'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Loader2, TrendingUp, BarChart3, CalendarCheck, Tags, Activity } from 'lucide-react'
import { AnalysisRecord, DailyTotal, AuthenticatedComponentProps } from '@/lib/types'

type TagInsight = {
  tag: string
  count: number
  averageCarbs: number
}

export default function Stats({ userId }: AuthenticatedComponentProps) {
  const supabase = createClientComponentClient()
  
  const [dailyData, setDailyData] = useState<DailyTotal[]>([])
  const [averageDaily, setAverageDaily] = useState(0)
  const [totalEntries, setTotalEntries] = useState(0)
  const [highestDay, setHighestDay] = useState<{ date: string; total: number } | null>(null)
  const [mostUsedTag, setMostUsedTag] = useState<TagInsight | null>(null)
  const [highestAverageTag, setHighestAverageTag] = useState<TagInsight | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    type StatsQueryData = Pick<AnalysisRecord, 'created_at' | 'result_summary' | 'result_details'>

    const { data, error } = await supabase
      .from('analyses')
      .select('created_at, result_summary, result_details')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error || !data) {
      console.error('Failed to fetch stats data:', error)
      setLoading(false)
      return
    }

    const records = data as unknown as StatsQueryData[]
    const totalsByDay: { [key: string]: number } = {}
    const tagTotals: Record<string, { count: number; totalCarbs: number }> = {}
    
    records.forEach((entry) => {
      // Use (YYYY-MM-DD) for storing keys
      const dateKey = new Date(entry.created_at).toLocaleDateString('en-CA')
      const carbs = parseFloat(entry.result_summary)

      if (!isNaN(carbs)) {
        totalsByDay[dateKey] = (totalsByDay[dateKey] || 0) + carbs
        extractMealTags(entry.result_details).forEach((tag) => {
          const current = tagTotals[tag] ?? { count: 0, totalCarbs: 0 }
          tagTotals[tag] = {
            count: current.count + 1,
            totalCarbs: current.totalCarbs + carbs,
          }
        })
      }
    })

    const processedData: DailyTotal[] = Object.entries(totalsByDay).map(([date, totalCarbs]) => ({
      // Format: "Nov 30"
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalCarbs: Math.round(totalCarbs),
    }))

    // Get the last 7 days for the chart
    const last7DaysData = processedData.slice(-7)

    // Calculate overall stats
    const totalDays = Object.keys(totalsByDay).length
    const totalCarbsSum = Object.values(totalsByDay).reduce((sum, total) => sum + total, 0)
    const avg = totalDays > 0 ? Math.round(totalCarbsSum / totalDays) : 0

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
    setTotalEntries(records.length)
    setHighestDay(highest)
    setMostUsedTag(getMostUsedTag(tagTotals))
    setHighestAverageTag(getHighestAverageTag(tagTotals))
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

      {(mostUsedTag || highestAverageTag) && (
        <div className="grid md:grid-cols-2 gap-6 mb-8 text-white">
          {mostUsedTag && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <Tags className="w-6 h-6 text-emerald-300" />
                <p className="text-sm text-white/60">Most logged tag</p>
              </div>
              <p className="text-2xl font-bold capitalize">{mostUsedTag.tag}</p>
              <p className="text-white/50 text-sm">
                {mostUsedTag.count} {mostUsedTag.count === 1 ? 'entry' : 'entries'}
              </p>
            </div>
          )}

          {highestAverageTag && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <Activity className="w-6 h-6 text-cyan-300" />
                <p className="text-sm text-white/60">Highest average tag</p>
              </div>
              <p className="text-2xl font-bold capitalize">{highestAverageTag.tag}</p>
              <p className="text-white/50 text-sm">
                {highestAverageTag.averageCarbs}g average carbs
              </p>
            </div>
          )}
        </div>
      )}

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
              <Bar dataKey="totalCarbs" fill="url(#colorUv)" radius={[4, 4, 0, 0]} activeBar={{ fill: '#22d3ee', opacity: 1 }}/>
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

function extractMealTags(resultDetails: string) {
  try {
    const parsed = JSON.parse(resultDetails) as { mealTags?: unknown }
    if (!Array.isArray(parsed.mealTags)) {
      return []
    }

    return parsed.mealTags
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
  } catch {
    return []
  }
}

function getMostUsedTag(tagTotals: Record<string, { count: number; totalCarbs: number }>) {
  return buildTagInsights(tagTotals).sort((left, right) => right.count - left.count)[0] ?? null
}

function getHighestAverageTag(tagTotals: Record<string, { count: number; totalCarbs: number }>) {
  return buildTagInsights(tagTotals)
    .filter((tag) => tag.count > 0)
    .sort((left, right) => right.averageCarbs - left.averageCarbs)[0] ?? null
}

function buildTagInsights(tagTotals: Record<string, { count: number; totalCarbs: number }>) {
  return Object.entries(tagTotals).map(([tag, values]) => ({
    tag,
    count: values.count,
    averageCarbs: Math.round(values.totalCarbs / values.count),
  }))
}
