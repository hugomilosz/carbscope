import { NextRequest, NextResponse } from 'next/server'

function parseGroqResponse(message: string): {
  summary: string
  details: string
  items: { name: string; carbs: number }[]
} {
  // Extract summary
  const summaryMatch = message.match(/\[SUMMARY\]\s*(\d+)/i)
  const summaryTotal = summaryMatch?.[1] || '0'

  // Extract [CARB BREAKDOWN]
  const breakdownMatch = message.match(/\[CARB BREAKDOWN\]([\s\S]*?)(?:\n\d|\[|\Z)/i)
  const breakdownSection = breakdownMatch?.[1]?.trim() || ''

  const itemRegex = /-\s*([^:]+):\s*(\d+(?:\.\d+)?)\s*g?/gi
  const items: { name: string; carbs: number }[] = []
  let match
  while ((match = itemRegex.exec(breakdownSection)) !== null) {
    items.push({ name: match[1].trim(), carbs: parseFloat(match[2]) })
  }

  // Extract detailed explanation
  const detailMatch = message.match(/\[DETAILED ANALYSIS\]([\s\S]*)/i)
  const details = detailMatch?.[1]?.trim() || 'No detailed analysis found.'

  return { summary: summaryTotal, details, items }
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, userContext, mealSize } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 })
    }

    // Fetch image from URL
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 })
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    const sizeNote = mealSize ? `The portion size is: ${mealSize}.` : ''

    // Groq prompt
    const prompt = `
    You are a nutritional analyst AI. Analyse the food image. Respond in **two sections** using the exact tags [SUMMARY] and [DETAILED ANALYSIS].

    [SUMMARY]
    - Compute the total carbohydrates by summing the numbers in [CARB BREAKDOWN] exactly.
    - Output **only a plain integer number** on this line, with no other text, units, or characters.
    - This number MUST be the exact sum of the items in [CARB BREAKDOWN].

    [DETAILED ANALYSIS]
    1. **Identified Food Items**: List and describe each visible food item.
    2. **Carbohydrate Estimate per Item**: Explain how you estimated each food’s carbohydrate content.
    3. **Serving Sizes**: Indicate assumed portion sizes.
    4. **Estimation Basis**: Explain how you derived each estimate.
    5. **Second Opinion / Factual Check**: Compare to typical nutritional data and note any uncertainties.
    6. **Carbohydrate Breakdown**: Provide a structured list of items and their estimated carbs using the exact format below.

    [CARB BREAKDOWN]
    - Item name: number g
    - Item name: number g
    (continue for all items)

    7. **Total Carbohydrates**: Restate the total (which must match the [SUMMARY] number) with units and a short human-readable summary.

    ${sizeNote}
    ${userContext ? `\nAdditional user-provided context: "${userContext}"` : ''}

    **Formatting Rules:**
    - Always include the [CARB BREAKDOWN] section.
    - Ensure the sum of all carb values in [CARB BREAKDOWN] equals the [SUMMARY] total.
    - Do not include any other text or Markdown formatting in [SUMMARY].
    `


    const imagePayload = {
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${base64Image}` },
    }

    // Define and query two models
    const modelA = 'meta-llama/llama-4-scout-17b-16e-instruct'
    const modelB = 'meta-llama/llama-4-maverick-17b-128e-instruct'

    const makeGroqRequest = (model: string) =>
      fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, imagePayload] }],
          temperature: 0.2,
          max_completion_tokens: 1024,
        }),
      })

    const [responseA, responseB] = await Promise.all([
      makeGroqRequest(modelA),
      makeGroqRequest(modelB),
    ])

    // Process and combine responses
    let resultA = { summary: '0', details: 'Model A failed to respond.', items: [] as { name: string; carbs: number }[]}
    let resultB = { summary: '0', details: 'Model B failed to respond.', items: [] as { name: string; carbs: number }[] }

    if (responseA.ok) {
      const dataA = await responseA.json()
      const messageA = dataA.choices?.[0]?.message?.content || ''
      resultA = parseGroqResponse(messageA)
    } else {
      console.error('Groq API error (Model A):', responseA.status, await responseA.text())
    }

    if (responseB.ok) {
      const dataB = await responseB.json()
      const messageB = dataB.choices?.[0]?.message?.content || ''
      resultB = parseGroqResponse(messageB)
    } else {
      console.error('Groq API error (Model B):', responseB.status, await responseB.text())
    }

    // Combine the results
    const numA = parseInt(resultA.summary, 10)
    const numB = parseInt(resultB.summary, 10)

    const validSummaries: number[] = []
    if (!isNaN(numA) && numA > 0) validSummaries.push(numA)
    if (!isNaN(numB) && numB > 0) validSummaries.push(numB)

    let finalSummary = '0'
    if (validSummaries.length > 0) {
      const avg = validSummaries.reduce((a, b) => a + b, 0) / validSummaries.length
      finalSummary = Math.round(avg).toString() // Average the valid results
    }

    const combinedItems = [...(resultA.items || []), ...(resultB.items || [])]

    // Average duplicates (same food name)
    const averagedItems: { name: string; carbs: number }[] = []
    const grouped: Record<string, number[]> = {}
    for (const item of combinedItems) {
      const key = item.name.toLowerCase()
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(item.carbs)
    }
    for (const [name, carbs] of Object.entries(grouped)) {
      const avg = carbs.reduce((a, b) => a + b, 0) / carbs.length
      averagedItems.push({ name, carbs: Math.round(avg) })
    }

    // Ensure final items sum to final summary
    const totalItemCarbs = averagedItems.reduce((sum, item) => sum + item.carbs, 0)
    const targetTotal = parseInt(finalSummary, 10)

    if (totalItemCarbs > 0 && targetTotal > 0 && Math.abs(totalItemCarbs - targetTotal) > 1) {
      const scale = targetTotal / totalItemCarbs

      for (const item of averagedItems) {
        item.carbs = Math.round(item.carbs * scale)
      }

      const adjustedTotal = averagedItems.reduce((s, i) => s + i.carbs, 0)
      const diff = targetTotal - adjustedTotal
      if (Math.abs(diff) > 0) {
        averagedItems[averagedItems.length - 1].carbs += diff
      }
    }

    const finalDetails = `
    --- OPINION 1 (Llama 4 Scout) ---
    ${resultA.details}

    --- OPINION 2 (Llama 4 Maverick) ---
    ${resultB.details}
    `
  
    // Handle total failure
    if (validSummaries.length === 0) {
      return NextResponse.json({ error: 'Both AI models failed to provide an analysis.' }, { status: 500 })
    }
    
    // Return the averaged result
    return NextResponse.json({
      summary: finalSummary,
      details: finalDetails.trim(),
      items: averagedItems,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}