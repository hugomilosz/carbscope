import { useState } from 'react'
import { TrendingUp, Info, ChevronDown, ChevronUp, Zap, Brain } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { AnalysisResult } from '@/lib/types'

export default function AnalysisResultCard({ analysis }: { analysis: AnalysisResult }) {
  const [showDetails, setShowDetails] = useState(false)
  const [activeTab, setActiveTab] = useState<'scout' | 'maverick'>('scout')

  const activeSummary = activeTab === 'scout' 
    ? analysis.details?.model_a_summary 
    : analysis.details?.model_b_summary

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-400/30 rounded-2xl p-8 relative overflow-hidden text-center shadow-lg shadow-emerald-900/10">
         <div className="flex items-center justify-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-semibold text-white">Analysis Complete</h2>
          </div>
          
          <div className="relative z-10">
            <div className="text-7xl font-extrabold text-emerald-300 mb-2 tracking-tight drop-shadow-lg">
              {analysis.totalCarbs}
              <span className="text-3xl text-emerald-500/70 ml-1">g</span>
            </div>
            <p className="text-gray-300 font-medium tracking-wide uppercase text-sm opacity-80">
              Total Net Carbohydrates
            </p>
          </div>
      </div>

      {/* Itemised Breakdown */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-semibold mb-5 text-gray-200 pl-1">Breakdown</h3>
        
        <div className="space-y-6">
          {analysis.items.map((item, i) => (
            <div key={i} className="flex justify-between items-start group hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors">
              <div>
                <div className="text-lg font-medium text-white capitalize">
                  {item.name}
                </div>
                <div className="text-sm text-gray-400 mt-1 font-light">
                  {item.portion_desc || `Est. weight: ${item.weight_g}g`}
                </div>
              </div>

              <div className="text-right pl-4">
                <span className="block text-2xl font-bold text-emerald-400 tabular-nums">
                  {item.carbs}g
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Reasoning */}
      <div className="pt-4">
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 text-sm font-medium text-gray-300 hover:text-white transition-all duration-200 group"
        >
          <Info className="w-4 h-4 text-emerald-500/70 group-hover:text-emerald-400" />
          <span>View AI Reasoning & Methodology</span>
          {showDetails ? (
            <ChevronUp className="w-4 h-4 text-gray-500 group-hover:text-white" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-white" />
          )}
        </button>

        {showDetails && (
          <div className="mt-4 bg-black/20 rounded-xl p-6 border border-white/5 animate-in fade-in slide-in-from-top-2">
             <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('scout')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'scout' 
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30' 
                    : 'text-gray-500 hover:text-gray-300 bg-white/5'
                }`}
              >
                <Zap className="w-3 h-3" />
                Llama 4 Scout
              </button>
              <button
                onClick={() => setActiveTab('maverick')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'maverick' 
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' 
                    : 'text-gray-500 hover:text-gray-300 bg-white/5'
                }`}
              >
                <Brain className="w-3 h-3" />
                Llama 4 Maverick
              </button>
            </div>

            <div className="prose prose-sm prose-invert max-w-none text-gray-400">
              <ReactMarkdown>{activeSummary || "No reasoning details available."}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}