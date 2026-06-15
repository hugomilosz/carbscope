function getMockCreate() {
  return (
    globalThis as typeof globalThis & { __groqCreateMock?: jest.Mock }
  ).__groqCreateMock as jest.Mock
}

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock('groq-sdk', () => {
  ;(
    globalThis as typeof globalThis & { __groqCreateMock?: jest.Mock }
  ).__groqCreateMock = jest.fn()

  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: getMockCreate(),
      },
    },
  }))
})

import { POST } from '@/app/api/analyse/route'

describe('POST /api/analyse', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.GROQ_API_KEY = 'test-key'
  })

  it('returns 400 when imageUrl is missing', async () => {
    const req = {
      json: jest.fn().mockResolvedValue({}),
    } as never

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'Image URL is required' })
  })

  it('returns single-model analysis metadata', async () => {
    getMockCreate().mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                {
                  name: 'Rice',
                  portion_desc: '1 bowl',
                  weight_g: 182,
                  carbs: 45,
                  carbs_per_100g: 29,
                  confidence: 0.8,
                },
              ],
              total_carbs: 45,
              summary_text: 'Scout summary',
            }),
          },
        },
      ],
    })

    const req = {
      json: jest.fn().mockResolvedValue({
        imageUrl: 'https://example.com/meal.jpg',
        userContext: 'Lunch',
        mealSize: 'standard',
        mealTags: ['home', 'lunch'],
      }),
    } as never

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.totalCarbs).toBe(52)
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toMatchObject({
      name: 'Rice',
      weight_g: 180,
      carbs: 52,
      carbs_per_100g: 29,
      confidence: 0.8,
    })
    expect(body.details).toMatchObject({
      strategy: 'single_scout',
      primary_label: 'Llama 4 Scout',
      primary_model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      prompt_version: 'scout_v2_density_first',
      primary_total: 52,
      final_total: 52,
      primary_summary: 'Scout summary',
    })
    expect(getMockCreate()).toHaveBeenCalledTimes(1)
    expect(getMockCreate().mock.calls[0][0].messages[0].content[0].text).toContain(
      'Meal Tags: home, lunch'
    )
  })

  it('retries once when the model returns invalid structured data', async () => {
    let scoutCalls = 0

    getMockCreate().mockImplementation(async () => {
      scoutCalls += 1

      if (scoutCalls === 1) {
        return {
          choices: [
            {
              message: {
                content: '{"items":[{"name":"Rice","weight_g":"oops","carbs":45}],"summary_text":"bad"}',
              },
            },
          ],
        }
      }

      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: [
                  {
                    name: 'Rice',
                    weight_g: 148,
                    carbs_per_100g: 30,
                  },
                ],
                summary_text: 'Recovered',
              }),
            },
          },
        ],
      }
    })

    const req = {
      json: jest.fn().mockResolvedValue({
        imageUrl: 'https://example.com/meal.jpg',
        userContext: '',
        mealSize: 'standard',
      }),
    } as never

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.details.primary_summary).toBe('Recovered')
    expect(body.details.strategy).toBe('single_scout')
    expect(body.totalCarbs).toBe(45)
    expect(getMockCreate()).toHaveBeenCalledTimes(2)
  })
})
