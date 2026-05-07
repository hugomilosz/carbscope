import Groq from 'groq-sdk'
import { z } from 'zod'
import {
  AnalysisResult,
  AnalysisStrategy,
} from './types'

export const PRIMARY_VISION_MODEL_ID = 'meta-llama/llama-4-scout-17b-16e-instruct'
export const PRIMARY_VISION_LABEL = 'Llama 4 Scout'
export const PROMPT_VERSION = 'scout_v2_density_first'

const DEFAULT_STRATEGY: AnalysisStrategy = 'single_scout'

const foodItemSchema = z.object({
  name: z.string().min(1),
  portion_desc: z.string().optional(),
  weight_g: z.number().finite().nonnegative(),
  carbs: z.number().finite().nonnegative().optional(),
  carbs_per_100g: z.number().finite().nonnegative().max(100).optional(),
  confidence: z.number().min(0).max(1).optional(),
  reasoning: z.string().optional(),
})

const modelResponseSchema = z.object({
  items: z.array(foodItemSchema).default([]),
  total_carbs: z.number().finite().nonnegative().optional(),
  summary_text: z.string().default('No reasoning details available.'),
})

type NormalisedFoodItem = z.infer<typeof foodItemSchema> & {
  carbs: number
}
type NormalisedModelResponse = {
  items: NormalisedFoodItem[]
  total_carbs?: number
  summary_text: string
}

export interface AnalyseFoodImageInput {
  imageUrl: string
  userContext?: string
  mealSize?: string
}

export interface AnalyseFoodImageOptions {
  groq?: Groq
  strategy?: AnalysisStrategy
}

export interface EvalExpectedItem {
  name: string
  aliases?: string[]
  expectedCarbs?: number
}

export interface EvalDatasetEntry {
  id: string
  imagePath?: string
  imageUrl?: string
  userContext?: string
  mealSize?: string
  expectedTotalCarbs: number
  toleranceGrams?: number
  expectedItems?: EvalExpectedItem[]
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
      prompt_version: PROMPT_VERSION,
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
5. Estimate a reasonable carbohydrate density for each item in grams of carbs per 100g.
6. Estimate carbohydrates conservatively and avoid inventing unseen ingredients.
7. Exclude non-carbohydrate garnish unless it materially changes carbs.
8. If the user says they did not eat something, exclude it.

OUTPUT FORMAT:
Return a raw JSON object only.

{
  "items": [
    {
      "name": "string",
      "portion_desc": "string",
      "weight_g": number,
      "carbs_per_100g": number,
      "carbs": number,
      "confidence": 0-1
    }
  ],
  "total_carbs": number,
  "summary_text": "string (brief reasoning, especially uncertainty or omitted items)"
}

Make sure total_carbs is consistent with the sum of the item carbs.
User Context: ${input.userContext?.trim() || 'None'}
`
}

async function runImageModel(
  prompt: string,
  imageUrl: string,
  modelId: string,
  groq: Groq
): Promise<NormalisedModelResponse> {
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
                      carbs_per_100g: { type: 'number' },
                      carbs: { type: 'number' },
                      confidence: { type: 'number' },
                      reasoning: { type: 'string' },
                    },
                    required: ['name', 'weight_g'],
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

function parseModelResponse(content: string): NormalisedModelResponse {
  const parsed = JSON.parse(content)
  const validated = modelResponseSchema.parse({
    ...parsed,
    items: Array.isArray(parsed.items)
      ? parsed.items
      : [],
    total_carbs:
      parsed.total_carbs === undefined
        ? undefined
        : coerceNumber(parsed.total_carbs),
  })

  return {
    summary_text: validated.summary_text,
    total_carbs: validated.total_carbs,
    items: validated.items
      .map((item) => normaliseFoodItem(item as Record<string, unknown>))
      .filter((item): item is NormalisedFoodItem => item !== null),
  }
}

function normaliseFoodItem(item: Record<string, unknown>): NormalisedFoodItem | null {
  const name = typeof item.name === 'string' ? item.name.trim() : ''
  const weight = roundToNearest(coerceNumber(item.weight_g), 5)
  const density =
    item.carbs_per_100g === undefined
      ? undefined
      : clampNumber(coerceNumber(item.carbs_per_100g), 0, 100)
  const directCarbs =
    item.carbs === undefined ? undefined : Math.max(0, Math.round(coerceNumber(item.carbs)))

  if (!name || (!density && directCarbs === undefined)) {
    return null
  }

  const carbs =
    density !== undefined
      ? Math.max(0, Math.round((weight * density) / 100))
      : directCarbs

  if (carbs === undefined) {
    return null
  }

  return {
    name,
    weight_g: weight,
    carbs,
    carbs_per_100g: density,
    portion_desc:
      typeof item.portion_desc === 'string' ? item.portion_desc : undefined,
    confidence:
      item.confidence === undefined
        ? undefined
        : clampNumber(coerceNumber(item.confidence), 0, 1),
    reasoning:
      typeof item.reasoning === 'string' ? item.reasoning : undefined,
  }
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

function getTotalCarbs(result: NormalisedModelResponse): number {
  return Math.round(result.items.reduce((sum, item) => sum + item.carbs, 0))
}

function normaliseMealSize(mealSize?: string) {
  if (mealSize === 'small' || mealSize === 'large') {
    return mealSize
  }

  return 'standard'
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function roundToNearest(value: number, increment: number) {
  return Math.max(increment, Math.round(value / increment) * increment)
}
