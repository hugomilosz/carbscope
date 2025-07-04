import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, userContext, mealSize } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 })
    }

    // Fetch image from Supabase or any URL
    console.log(imageUrl);
    const imageResponse = await fetch(imageUrl)
    console.log('Image response status:', imageResponse.status);

    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 })
    }

    // Read image as buffer and convert to base64 string
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    const sizeNote = mealSize ? `The portion size is: ${mealSize}.` : ''

    // Prepare Groq API payload
    const prompt = `
      You are analyzing a food image. Please respond using **two clear sections**:

      ---

      [SUMMARY]
      <just the total carbohydrate estimate in grams, number only, no units, no text — e.g., 13 OR 100>

      ---

      [DETAILED ANALYSIS]

      1. **Identified Food Items**: List and describe each food item visible in the image.
      2. **Carbohydrate Estimate per Item**: Provide estimates (in grams) for each food item.
      3. **Serving Sizes**: Indicate the assumed serving size for each item.
      4. **Estimation Basis**: Explain how these estimates were derived.
      5. **Total Carbohydrates**: Restate the total with units and a short human-readable summary.

      ${sizeNote}
      ${userContext ? `\nAdditional user-provided context: "${userContext}"` : ''}
    `


    const imagePayload = {
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${base64Image}`,
      },
    }

    // Call Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, imagePayload] }],
        temperature: 0.2,
        max_completion_tokens: 1024,
      }),
    })

    if (!groqResponse.ok) {
      const err = await groqResponse.json()
      console.error('Groq API error!', groqResponse.status, err)
      return NextResponse.json({ error: 'Groq API error', details: err }, { status: groqResponse.status })
    }

    const data = await groqResponse.json()
    const message = data.choices?.[0]?.message?.content || ''

    const summaryMatch = message.match(/\[SUMMARY\]\s*([\d]+)/)
    const detailMatch = message.match(/\[DETAILED ANALYSIS\]([\s\S]*)/)

    const summary = summaryMatch?.[1]?.trim() || ''
    const details = detailMatch?.[1]?.trim() || ''

    return NextResponse.json({ summary, details })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
