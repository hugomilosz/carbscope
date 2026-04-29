import Groq from 'groq-sdk'
import { z } from 'zod'
import {
  AnalysisResult,
  AnalysisStrategy,
} from './types'

export const PRIMARY_VISION_MODEL_ID = 'meta-llama/llama-4-scout-17b-16e-instruct'
export const PRIMARY_VISION_LABEL = 'Llama 4 Scout'

const DEFAULT_STRATEGY: AnalysisStrategy = 'single_scout'

const foodItemSchema = z.object({
  name: z.string().min(1),
  portion_desc: z.string().optional(),
  weight_g: z.number().finite().nonnegative(),
  carbs: z.number().finite().nonnegative(),
  confidence: z.number().min(0).max(1).optional(),
  reasoning: z.string().optional(),
})

const modelResponseSchema = z.object({
  items: z.array(foodItemSchema).default([]),
  total_carbs: z.number().finite().nonnegative().optional(),
  summary_text: z.string().default('No reasoning details available.'),
})

type ModelResponse = z.infer<typeof modelResponseSchema>

export interface AnalyseFoodImageInput {
  imageUrl: string
  userContext?: string
  mealSize?: string
}

export interface AnalyseFoodImageOptions {
  groq?: Groq
  strategy?: AnalysisStrategy
}

export interface EvalDatasetEntry {
  id: string
  imagePath?: string
  imageUrl?: string
  userContext?: string
  mealSize?: string
  expectedTotalCarbs: number
  tags?: string[]
  notes?: string
}

export function createGroqClient(apiKey = process.env.GROQ_API_KEY) {
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  return new Groq({ apiKey })
}

export async function analyseFoodImage(
  input: AnalyseFoodImageInput,
  options: AnalyseFoodImageOptions = {}
): Promise<AnalysisResult> {
  const groq = options.groq ?? createGroqClient()
  const strategy = options.strategy ?? DEFAULT_STRATEGY

  if (strategy !== 'single_scout') {
    throw new Error(`Unsupported analysis strategy: ${strategy}`)
  }

  const prompt = buildVisionPrompt(input)
  const primary = await runImageModel(prompt, input.imageUrl, PRIMARY_VISION_MODEL_ID, groq)
  const primaryTotal = getTotalCarbs(primary)

  return {
    totalCarbs: primaryTotal,
    items: primary.items,
    details: {
      strategy: 'single_scout',
      primary_label: PRIMARY_VISION_LABEL,
      primary_model: PRIMARY_VISION_MODEL_ID,
      primary_summary: primary.summary_text,
      primary_total: primaryTotal,
      final_total: primaryTotal,
    },
  }
}

function buildVisionPrompt(input: AnalyseFoodImageInput) {
  const mealSize = normaliseMealSize(input.mealSize)

  return `
You are an expert nutritionist. Analyse the food in this image for carbohydrate content.

CRITICAL STEP - VOLUMETRIC ANALYSIS:
1. Identify the food items you can actually see.
2. Estimate the portion size using visual cues like the plate, utensils, or packaging.
3. Use the user's portion hint as a soft hint, not a hard rule. (User says: ${mealSize})
4. Estimate the weight in grams.
5. Estimate carbohydrates conservatively and avoid inventing unseen ingredients.

OUTPUT FORMAT:
Return a raw JSON object only.

{
  "items": [
    {
      "name": "string",
      "portion_desc": "string",
      "weight_g": number,
      "carbs": number,
      "confidence": 0-1
    }
  ],
  "total_carbs": number,
  "summary_text": "string (brief reasoning)"
}

User Context: ${input.userContext?.trim() || 'None'}
`
}

async function runImageModel(
  prompt: string,
  imageUrl: string,
  modelId: string,
  groq: Groq
): Promise<ModelResponse> {
  const maxAttempts = 2

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const completion = await groq.chat.completions.create({
        model: modelId,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'food_analysis',
            strict: false,
            schema: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      portion_desc: { type: 'string' },
                      weight_g: { type: 'number' },
                      carbs: { type: 'number' },
                      confidence: { type: 'number' },
                      reasoning: { type: 'string' },
                    },
                    required: ['name', 'weight_g', 'carbs'],
                    additionalProperties: false,
                  },
                },
                total_carbs: { type: 'number' },
                summary_text: { type: 'string' },
              },
              required: ['items', 'summary_text'],
              additionalProperties: false,
            },
          },
        },
      })

      const content = completion.choices[0].message.content
      if (!content) {
        throw new Error('Empty response')
      }

      return parseModelResponse(content)
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error(`Model ${modelId} failed:`, error)
        return {
          items: [],
          summary_text: `Error from ${modelId}`,
        }
      }
    }
  }

  return {
    items: [],
    summary_text: `Error from ${modelId}`,
  }
}

function parseModelResponse(content: string): ModelResponse {
  const parsed = JSON.parse(content)

  return modelResponseSchema.parse({
    ...parsed,
    items: Array.isArray(parsed.items)
      ? parsed.items.map((item: Record<string, unknown>) => ({
          ...item,
          weight_g: coerceNumber(item.weight_g),
          carbs: coerceNumber(item.carbs),
          confidence:
            item.confidence === undefined ? undefined : coerceNumber(item.confidence),
        }))
      : [],
    total_carbs:
      parsed.total_carbs === undefined
        ? undefined
        : coerceNumber(parsed.total_carbs),
  })
}

function coerceNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  throw new Error(`Invalid numeric value: ${String(value)}`)
}

function getTotalCarbs(result: ModelResponse): number {
  if (typeof result.total_carbs === 'number' && Number.isFinite(result.total_carbs)) {
    return Math.round(result.total_carbs)
  }

  return Math.round(result.items.reduce((sum, item) => sum + item.carbs, 0))
}

function normaliseMealSize(mealSize?: string) {
  if (mealSize === 'small' || mealSize === 'large') {
    return mealSize
  }

  return 'standard'
}
