import 'groq-sdk/shims/node'
import Groq from 'groq-sdk'
import { analyseFoodImage, PRIMARY_VISION_MODEL_ID } from '@/lib/analysis'

function createGroqMock(
  responses: Array<{
    choices: Array<{
      message: {
        content: string
      }
    }>
  }>
) {
  const create = jest.fn()

  responses.forEach((response) => {
    create.mockResolvedValueOnce(response)
  })

  const groq = {
    chat: {
      completions: {
        create,
      },
    },
  } as unknown as Groq

  return { groq, create }
}

describe('analyseFoodImage', () => {
  it('recomputes carbs from density, ignores inconsistent model totals, and drops unusable items', async () => {
    const { groq, create } = createGroqMock([
      {
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: [
                  {
                    name: 'Rice',
                    portion_desc: '1 bowl',
                    weight_g: 182,
                    carbs: 999,
                    carbs_per_100g: 29,
                    confidence: 0.8,
                  },
                  {
                    name: 'Sauce',
                    portion_desc: 'small drizzle',
                    weight_g: 40,
                    carbs: 3,
                  },
                  {
                    name: 'Parsley garnish',
                    weight_g: 5,
                  },
                ],
                total_carbs: 500,
                summary_text: 'Rice is the main carb source.',
              }),
            },
          },
        ],
      },
    ])

    const result = await analyseFoodImage(
      {
        imageUrl: 'https://example.com/meal.jpg',
        userContext: 'Lunch',
        mealSize: 'standard',
      },
      { groq }
    )

    expect(result.totalCarbs).toBe(55)
    expect(result.items).toEqual([
      {
        name: 'Rice',
        portion_desc: '1 bowl',
        weight_g: 180,
        carbs: 52,
        carbs_per_100g: 29,
        confidence: 0.8,
        reasoning: undefined,
      },
      {
        name: 'Sauce',
        portion_desc: 'small drizzle',
        weight_g: 40,
        carbs: 3,
        carbs_per_100g: undefined,
        confidence: undefined,
        reasoning: undefined,
      },
    ])
    expect(result.details.primary_total).toBe(55)
    expect(result.details.final_total).toBe(55)
    expect(result.details.primary_summary).toBe('Rice is the main carb source.')
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('returns a stable empty analysis after two invalid model responses', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const badResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                {
                  name: 'Rice',
                  weight_g: 'oops',
                },
              ],
              total_carbs: 45,
              summary_text: 'Bad response',
            }),
          },
        },
      ],
    }

    const { groq, create } = createGroqMock([badResponse, badResponse])

    const result = await analyseFoodImage(
      {
        imageUrl: 'https://example.com/meal.jpg',
      },
      { groq }
    )

    expect(result.totalCarbs).toBe(0)
    expect(result.items).toEqual([])
    expect(result.details).toMatchObject({
      strategy: 'single_qwen',
      primary_model: PRIMARY_VISION_MODEL_ID,
      primary_total: 0,
      final_total: 0,
      primary_summary: `Error from ${PRIMARY_VISION_MODEL_ID}`,
    })
    expect(create).toHaveBeenCalledTimes(2)
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)

    consoleErrorSpy.mockRestore()
  })
})
