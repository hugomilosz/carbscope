import { useState } from 'react'
import { TrendingUp, Info, ChevronDown, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

function AnalysisResultCard({ analysis }: { analysis: any }) {
  const [showDetails, setShowDetails] = useState(false)
  const [activeTab, setActiveTab] = useState<'scout' | 'maverick'>('scout')

  const activeSummary = activeTab === 'scout' 
    ? analysis.details?.model_a_summary 
    : analysis.details?.model_b_summary

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-400/30 rounded-2xl p-8 relative overflow-hidden text-center">
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
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-5 text-gray-200">Breakdown</h3>
        
        <div className="space-y-6">
          {analysis.items.map((item: any, i: number) => (
            <div key={i} className="flex justify-between items-start group">
              <div>
                {/* Item Name */}
                <div className="text-lg font-medium text-white capitalize">
                  {item.name}
                </div>
                
                <div className="text-sm text-gray-400 mt-1 font-light">
                  {item.portion_desc || `Est. weight: ${item.weight_g}g`}
                </div>
              </div>

              {/* Carb Value */}
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
      <div className="border-t border-white/10 pt-4">
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-400 transition-colors mx-auto"
        >
          <Info className="w-4 h-4" />
          <span>View AI Reasoning & Methodology</span>
          {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showDetails && (
          <div className="mt-6 bg-black/20 rounded-xl p-6 border border-white/5">
             {/* Model Tabs */}
             <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('scout')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'scout' ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Llama 4 Scout
              </button>
              <button
                onClick={() => setActiveTab('maverick')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'maverick' ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
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

export default AnalysisResultCard