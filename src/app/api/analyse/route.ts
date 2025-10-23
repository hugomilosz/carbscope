import { NextRequest, NextResponse } from 'next/server'

function parseGroqResponse(message: string): { summary: string; details: string } {
  // Extract results
  const summaryMatch = message.match(/(?:\[SUMMARY\]|##\s*SUMMARY)\s*.*?(\d+)/i)
  const summaryTotal = summaryMatch?.[1] || '0' // Default to '0'

  const detailMatch = message.match(/(?:\[DETAILED ANALYSIS\]|##\s*DETAILED ANALYSIS)([\s\S]*)/i)
  const details = detailMatch?.[1]?.trim() || 'No detailed analysis found.'

  return { summary: summaryTotal, details }
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
    - Compute the total carbohydrates by summing the numbers in Step 2 exactly.
    - Output **only a plain integer number** on this line, with no other text, units, or characters.
    - This number MUST be the exact sum of the items in Step 2.

    [DETAILED ANALYSIS]
    1. **Identified Food Items**: List and describe each visible food item.
    2. **Carbohydrate Estimate per Item**: Provide grams of carbs for each item (e.g., "- Item: X grams").
    3. **Serving Sizes**: Indicate assumed portion sizes.
    4. **Estimation Basis**: Explain how you derived each estimate.
    5. **Second Opinion / Factual Check**: Compare to typical nutritional data and note any uncertainties.
    6. **Total Carbohydrates**: Restate the total (which must match the [SUMMARY] number) with units and a short human-readable summary.

    ${sizeNote}
    ${userContext ? `\nAdditional user-provided context: "${userContext}"` : ''}

    **Important:** Start your response *immediately* with [SUMMARY] and [DETAILED ANALYSIS] exactly as written. Do not use Markdown headings (##) for them.
    `

    const imagePayload = {
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${base64Image}` },
    }

    // Define two models
    const modelA = 'meta-llama/llama-4-scout-17b-16e-instruct'
    const modelB = 'meta-llama/llama-4-maverick-17b-128e-instruct'

    // Query two models in parallel
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

    let resultA = { summary: '0', details: 'Model A failed to respond.' }
    let resultB = { summary: '0', details: 'Model B failed to respond.' }

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

    const finalDetails = `
  --- OPINION 1 (Llama 4 Scout) ---
  ${resultA.details}

  --- OPINION 2 (Llama 3 70b) ---
  ${resultB.details}
  `
    // Handle total failure
    if (validSummaries.length === 0) {
      return NextResponse.json({ error: 'Both AI models failed to provide an analysis.' }, { status: 500 })
    }
    
    // Return the combined, averaged result
    return NextResponse.json({
      summary: finalSummary,
      details: finalDetails.trim(),
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}