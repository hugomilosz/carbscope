import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { FoodItem } from '@/lib/types'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, userContext, mealSize } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    // JSON Prompt
    const prompt = `
    You are an expert nutritionist. Analyse the food in this image for carbohydrate content.
    
    CRITICAL STEP - VOLUMETRIC ANALYSIS:
    1. Identify the food items.
    2. Look for visual cues to estimate SIZE (e.g., compare to the plate size, silverware, or visible table texture).
    3. Is this a "Small", "Standard", or "Large" portion? (User says: ${mealSize})
    4. Estimate the weight in grams based on this volume.
    
    OUTPUT FORMAT:
    Return a raw JSON object only.
    
    {
      "items": [
        { 
          "name": "string (e.g., 'Carrot Cake')", 
          "portion_desc": "string (e.g., '1 thick slice (approx 200g)')",
          "weight_g": number, 
          "carbs": number, 
          "confidence": 0-1
        }
      ],
      "total_carbs": number,
      "summary_text": "string (brief reasoning)"
    }
    
    User Context: ${userContext || 'None'}
    `

    const modelA_ID = 'meta-llama/llama-4-scout-17b-16e-instruct'
    const modelB_ID = 'meta-llama/llama-4-maverick-17b-128e-instruct'

    // Run models in parallel
    const [resA, resB] = await Promise.all([
      runModel(prompt, imageUrl, modelA_ID),
      runModel(prompt, imageUrl, modelB_ID)
    ])

    // Merge results
    const mergedItems = merge(resA.items || [], resB.items || [])
    const totalCarbs = mergedItems.reduce((acc, item) => acc + item.carbs, 0)

    return NextResponse.json({
      totalCarbs: Math.round(totalCarbs),
      items: mergedItems,
      details: {
        model_a_summary: resA.summary_text,
        model_b_summary: resB.summary_text
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

async function runModel(prompt: string, imageUrl: string, modelId: string): Promise<{ items: FoodItem[], summary_text: string }> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      model: modelId,
      temperature: 0.2,
      response_format: { type: 'json_object' }, 
    })

    const content = completion.choices[0].message.content
    if (!content) throw new Error("Empty response")
    
    return JSON.parse(content)
  } catch (e) {
    console.error(`Model ${modelId} failed:`, e)
    return { items: [], summary_text: `Error from ${modelId}` }
  }
}

function merge(listA: FoodItem[], listB: FoodItem[]): FoodItem[] {
  const finalItems: FoodItem[] = [...listA]

  listB.forEach((itemB) => {
    // Check for semantic overlap
    const matchIndex = finalItems.findIndex((itemA) => 
      areNamesSimilar(itemA.name, itemB.name)
    )

    // Found duplicate item: average the numbers
    if (matchIndex > -1) {
      const existingItem = finalItems[matchIndex]
      
      existingItem.carbs = Math.round((existingItem.carbs + itemB.carbs) / 2)
      existingItem.weight_g = Math.round((existingItem.weight_g + itemB.weight_g) / 2)
      
      const reasonA = existingItem.reasoning || ''
      const reasonB = itemB.reasoning || ''
      
      if (!reasonA.includes('[Model A]')) {
         existingItem.reasoning = `[Model A]: ${reasonA} | [Model B]: ${reasonB}`
      }
      
      // Keep the longer name
      if (itemB.name.length > existingItem.name.length) {
        existingItem.name = itemB.name
      }
      
      // Grab the portion description if missing
      if (!existingItem.portion_desc && itemB.portion_desc) {
        existingItem.portion_desc = itemB.portion_desc
      }

    } else {
      // Add new item to the list
      finalItems.push(itemB)
    }
  })

  return finalItems
}

function areNamesSimilar(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false
  
  // Normalise text
  const clean1 = name1.toLowerCase().replace(/[^\w\s]/g, '')
  const clean2 = name2.toLowerCase().replace(/[^\w\s]/g, '')
  const words1 = new Set(clean1.split(/\s+/))
  const words2 = new Set(clean2.split(/\s+/))
  
  // Calculate overlap
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  
  return intersection.size / union.size > 0.3 
}