// API Types
export interface FoodItem {
  name: string
  weight_g: number
  carbs: number
  portion_desc?: string
  reasoning?: string
}

export interface AnalysisResult {
  totalCarbs: number
  items: FoodItem[]
  details: {
    model_a_summary: string
    model_b_summary: string
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