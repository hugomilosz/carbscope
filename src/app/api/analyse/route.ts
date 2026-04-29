import { NextRequest, NextResponse } from 'next/server'
import { analyseFoodImage } from '@/lib/analysis'

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, userContext, mealSize } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    const result = await analyseFoodImage({
      imageUrl,
      userContext,
      mealSize,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
