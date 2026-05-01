export type AnalysisStrategy = 'single_scout'

// API Types
export interface FoodItem {
  name: string
  weight_g: number
  carbs: number
  carbs_per_100g?: number
  confidence?: number
  portion_desc?: string
  reasoning?: string
}

export interface AnalysisResult {
  totalCarbs: number
  items: FoodItem[]
  details: {
    strategy: AnalysisStrategy
    primary_label: string
    primary_model: string
    prompt_version: string
    primary_summary: string
    primary_total: number
    final_total: number
  }
}

// Database Entities
export interface AnalysisRecord {
  id: string
  user_id: string
  image_url: string
  result_summary: string
  result_details: string
  created_at: string
}

export interface DailyTotal {
  date: string
  totalCarbs: number
}

export interface AuthenticatedComponentProps {
  userId: string
}
