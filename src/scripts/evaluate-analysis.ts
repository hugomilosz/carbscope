import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  AnalyseFoodImageInput,
  EvalDatasetEntry,
  EvalExpectedItem,
  analyseFoodImage,
  createGroqClient,
} from '../lib/analysis'
import { AnalysisResult, AnalysisStrategy, FoodItem } from '../lib/types'

const DEFAULT_DATASET_PATH = path.resolve(process.cwd(), 'src/evals/sample-meals.json')
const DEFAULT_TOLERANCE_GRAMS = 10
const STRATEGIES: AnalysisStrategy[] = ['single_qwen']

interface EvalCliOptions {
  datasetPath: string
  outputPath?: string
  caseId?: string
  tag?: string
  showItems: boolean
  failOnOutsideTolerance: boolean
}

interface EvalRow {
  caseId: string
  strategy: AnalysisStrategy
  tags: string[]
  expectedTotalCarbs: number
  predictedTotalCarbs: number
  signedError: number
  absoluteError: number
  percentError: number
  toleranceGrams: number
  withinTolerance: boolean
  within5g: boolean
  within10g: boolean
  latencyMs: number
  itemCount: number
  averageConfidence: number | null
  promptVersion: string
  model: string
  summaryText: string
  predictedItems: Array<{
    name: string
    carbs: number
    weight_g: number
    confidence: number | null
  }>
  matchedExpectedItems: number | null
  expectedItemCount: number | null
  expectedItemRecall: number | null
  unexpectedPredictedItems: string[]
}

interface StrategySummary {
  strategy: AnalysisStrategy
  cases: number
  promptVersion: string
  model: string
  meanAbsoluteError: number
  medianAbsoluteError: number
  meanSignedError: number
  meanPercentError: number
  withinToleranceRate: number
  within5gRate: number
  within10gRate: number
  averageLatencyMs: number
  averageConfidence: number | null
  meanExpectedItemRecall: number | null
}

interface TagSummary {
  tag: string
  cases: number
  meanAbsoluteError: number
  withinToleranceRate: number
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const dataset = await loadDataset(options.datasetPath)
  const filteredDataset = filterDataset(dataset, options)
  const groq = createGroqClient()
  const rows: EvalRow[] = []

  if (filteredDataset.length === 0) {
    throw new Error('No eval cases matched the supplied filters')
  }

  for (const entry of filteredDataset) {
    const imageUrl = await resolveImageUrl(entry, options.datasetPath)

    for (const strategy of STRATEGIES) {
      const input: AnalyseFoodImageInput = {
        imageUrl,
        userContext: entry.userContext,
        mealSize: entry.mealSize,
      }

      const startedAt = Date.now()
      const result = await analyseFoodImage(input, { groq, strategy })
      const latencyMs = Date.now() - startedAt

      rows.push(buildEvalRow(entry, result, strategy, latencyMs))
    }
  }

  const summary = buildSummary(rows)
  const tagSummary = buildTagSummary(rows)
  printSummary(summary, rows, tagSummary, options.showItems)

  if (options.outputPath) {
    await fs.writeFile(
      options.outputPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          datasetPath: options.datasetPath,
          filters: {
            caseId: options.caseId ?? null,
            tag: options.tag ?? null,
          },
          summary,
          tagSummary,
          rows,
        },
        null,
        2
      )
    )
    console.log(`\nSaved eval report to ${options.outputPath}`)
  }

  if (options.failOnOutsideTolerance && rows.some((row) => !row.withinTolerance)) {
    process.exitCode = 1
    console.error('\nOne or more eval cases fell outside the allowed tolerance.')
  }
}

function parseArgs(args: string[]): EvalCliOptions {
  const options: EvalCliOptions = {
    datasetPath: DEFAULT_DATASET_PATH,
    showItems: false,
    failOnOutsideTolerance: false,
  }

  for (const arg of args) {
    if (arg === '--help') {
      printHelp()
      process.exit(0)
    }

    if (arg === '--show-items') {
      options.showItems = true
      continue
    }

    if (arg === '--fail-on-outside-tolerance') {
      options.failOnOutsideTolerance = true
      continue
    }

    if (arg.startsWith('--out=')) {
      options.outputPath = path.resolve(process.cwd(), arg.slice('--out='.length))
      continue
    }

    if (arg.startsWith('--id=')) {
      options.caseId = arg.slice('--id='.length)
      continue
    }

    if (arg.startsWith('--tag=')) {
      options.tag = arg.slice('--tag='.length)
      continue
    }

    options.datasetPath = path.resolve(process.cwd(), arg)
  }

  return options
}

async function loadDataset(datasetPath: string): Promise<EvalDatasetEntry[]> {
  const raw = await fs.readFile(datasetPath, 'utf8')
  const parsed = JSON.parse(raw) as EvalDatasetEntry[]

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`Dataset at ${datasetPath} must be a non-empty JSON array`)
  }

  return parsed
}

function filterDataset(dataset: EvalDatasetEntry[], options: EvalCliOptions) {
  return dataset.filter((entry) => {
    if (options.caseId && entry.id !== options.caseId) {
      return false
    }

    if (options.tag && !entry.tags?.includes(options.tag)) {
      return false
    }

    return true
  })
}

async function resolveImageUrl(entry: EvalDatasetEntry, datasetPath: string) {
  if (entry.imageUrl) {
    return entry.imageUrl
  }

  if (!entry.imagePath) {
    throw new Error(`Dataset entry ${entry.id} is missing imageUrl or imagePath`)
  }

  const absoluteImagePath = path.resolve(path.dirname(datasetPath), entry.imagePath)
  const bytes = await fs.readFile(absoluteImagePath)
  const ext = path.extname(absoluteImagePath).toLowerCase()
  const mimeType =
    ext === '.png' ? 'image/png' :
    ext === '.webp' ? 'image/webp' :
    'image/jpeg'

  return `data:${mimeType};base64,${bytes.toString('base64')}`
}

function buildEvalRow(
  entry: EvalDatasetEntry,
  result: AnalysisResult,
  strategy: AnalysisStrategy,
  latencyMs: number
): EvalRow {
  const signedError = result.totalCarbs - entry.expectedTotalCarbs
  const absoluteError = Math.abs(signedError)
  const percentError = Math.round(
    (absoluteError / Math.max(entry.expectedTotalCarbs, 1)) * 100
  )
  const toleranceGrams = entry.toleranceGrams ?? DEFAULT_TOLERANCE_GRAMS
  const confidences = result.items
    .map((item) => item.confidence)
    .filter((value): value is number => typeof value === 'number')
  const averageConfidence =
    confidences.length > 0
      ? round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length)
      : null
  const predictedItems = result.items.map((item) => ({
    name: item.name,
    carbs: item.carbs,
    weight_g: item.weight_g,
    confidence: typeof item.confidence === 'number' ? round(item.confidence) : null,
  }))
  const itemMatch = matchExpectedItems(entry.expectedItems, result.items)

  return {
    caseId: entry.id,
    strategy,
    tags: entry.tags ?? [],
    expectedTotalCarbs: entry.expectedTotalCarbs,
    predictedTotalCarbs: result.totalCarbs,
    signedError,
    absoluteError,
    percentError,
    toleranceGrams,
    withinTolerance: absoluteError <= toleranceGrams,
    within5g: absoluteError <= 5,
    within10g: absoluteError <= 10,
    latencyMs,
    itemCount: result.items.length,
    averageConfidence,
    promptVersion: result.details.prompt_version,
    model: result.details.primary_model,
    summaryText: result.details.primary_summary,
    predictedItems,
    matchedExpectedItems: itemMatch?.matchedExpectedItems ?? null,
    expectedItemCount: itemMatch?.expectedItemCount ?? null,
    expectedItemRecall: itemMatch?.expectedItemRecall ?? null,
    unexpectedPredictedItems: itemMatch?.unexpectedPredictedItems ?? [],
  }
}

function matchExpectedItems(
  expectedItems: EvalExpectedItem[] | undefined,
  predictedItems: FoodItem[]
) {
  if (!expectedItems || expectedItems.length === 0) {
    return null
  }

  const unmatchedPredicted = new Set(predictedItems.map((item, index) => index))
  let matchedExpectedItems = 0

  expectedItems.forEach((expected) => {
    const candidates = [expected.name, ...(expected.aliases ?? [])].map(normaliseItemName)
    const matchIndex = predictedItems.findIndex((predicted, index) => {
      if (!unmatchedPredicted.has(index)) {
        return false
      }

      const predictedName = normaliseItemName(predicted.name)
      return candidates.some((candidate) => isSimilarItemName(candidate, predictedName))
    })

    if (matchIndex >= 0) {
      matchedExpectedItems += 1
      unmatchedPredicted.delete(matchIndex)
    }
  })

  return {
    matchedExpectedItems,
    expectedItemCount: expectedItems.length,
    expectedItemRecall: round((matchedExpectedItems / expectedItems.length) * 100),
    unexpectedPredictedItems: Array.from(unmatchedPredicted).map(
      (index) => predictedItems[index].name
    ),
  }
}

function normaliseItemName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isSimilarItemName(expected: string, predicted: string) {
  if (!expected || !predicted) {
    return false
  }

  if (expected === predicted) {
    return true
  }

  if (expected.includes(predicted) || predicted.includes(expected)) {
    return true
  }

  const expectedWords = new Set(expected.split(' '))
  const predictedWords = new Set(predicted.split(' '))
  const overlap = [...expectedWords].filter((word) => predictedWords.has(word)).length
  const largestSet = Math.max(expectedWords.size, predictedWords.size)

  return overlap / largestSet >= 0.5
}

function buildSummary(rows: EvalRow[]): StrategySummary[] {
  return STRATEGIES.map((strategy) => {
    const strategyRows = rows.filter((row) => row.strategy === strategy)
    const totalAbsoluteError = strategyRows.reduce((sum, row) => sum + row.absoluteError, 0)
    const totalSignedError = strategyRows.reduce((sum, row) => sum + row.signedError, 0)
    const totalPercentError = strategyRows.reduce((sum, row) => sum + row.percentError, 0)
    const totalLatency = strategyRows.reduce((sum, row) => sum + row.latencyMs, 0)
    const withinToleranceCount = strategyRows.filter((row) => row.withinTolerance).length
    const within5gCount = strategyRows.filter((row) => row.within5g).length
    const within10gCount = strategyRows.filter((row) => row.within10g).length
    const confidenceRows = strategyRows.filter((row) => row.averageConfidence !== null)
    const recallRows = strategyRows.filter((row) => row.expectedItemRecall !== null)

    return {
      strategy,
      cases: strategyRows.length,
      promptVersion: strategyRows[0]?.promptVersion ?? 'unknown',
      model: strategyRows[0]?.model ?? 'unknown',
      meanAbsoluteError: round(totalAbsoluteError / strategyRows.length),
      medianAbsoluteError: median(strategyRows.map((row) => row.absoluteError)),
      meanSignedError: round(totalSignedError / strategyRows.length),
      meanPercentError: round(totalPercentError / strategyRows.length),
      withinToleranceRate: round((withinToleranceCount / strategyRows.length) * 100),
      within5gRate: round((within5gCount / strategyRows.length) * 100),
      within10gRate: round((within10gCount / strategyRows.length) * 100),
      averageLatencyMs: round(totalLatency / strategyRows.length),
      averageConfidence:
        confidenceRows.length > 0
          ? round(
              confidenceRows.reduce(
                (sum, row) => sum + (row.averageConfidence ?? 0),
                0
              ) / confidenceRows.length
            )
          : null,
      meanExpectedItemRecall:
        recallRows.length > 0
          ? round(
              recallRows.reduce(
                (sum, row) => sum + (row.expectedItemRecall ?? 0),
                0
              ) / recallRows.length
            )
          : null,
    }
  })
}

function buildTagSummary(rows: EvalRow[]): TagSummary[] {
  const tagMap = new Map<string, EvalRow[]>()

  rows.forEach((row) => {
    row.tags.forEach((tag) => {
      const existing = tagMap.get(tag) ?? []
      existing.push(row)
      tagMap.set(tag, existing)
    })
  })

  return Array.from(tagMap.entries())
    .map(([tag, tagRows]) => ({
      tag,
      cases: tagRows.length,
      meanAbsoluteError: round(
        tagRows.reduce((sum, row) => sum + row.absoluteError, 0) / tagRows.length
      ),
      withinToleranceRate: round(
        (tagRows.filter((row) => row.withinTolerance).length / tagRows.length) * 100
      ),
    }))
    .sort((left, right) => left.tag.localeCompare(right.tag))
}

function printSummary(
  summary: StrategySummary[],
  rows: EvalRow[],
  tagSummary: TagSummary[],
  showItems: boolean
) {
  console.log('\nCarbScope analysis eval summary\n')
  console.table(summary)

  console.log('\nCase-level results\n')
  console.table(
    rows.map((row) => ({
      caseId: row.caseId,
      expectedTotalCarbs: row.expectedTotalCarbs,
      predictedTotalCarbs: row.predictedTotalCarbs,
      signedError: row.signedError,
      absoluteError: row.absoluteError,
      toleranceGrams: row.toleranceGrams,
      withinTolerance: row.withinTolerance,
      expectedItemRecall: row.expectedItemRecall,
      itemCount: row.itemCount,
      latencyMs: row.latencyMs,
      tags: row.tags.join(','),
    }))
  )

  if (tagSummary.length > 0) {
    console.log('\nTag summary\n')
    console.table(tagSummary)
  }

  if (showItems) {
    rows.forEach((row) => {
      console.log(`\nCase ${row.caseId}`)
      console.log(`Summary: ${row.summaryText}`)
      console.table(row.predictedItems)

      if (row.expectedItemCount !== null) {
        console.log(
          `Expected item recall: ${row.matchedExpectedItems}/${row.expectedItemCount}`
        )
      }

      if (row.unexpectedPredictedItems.length > 0) {
        console.log(`Unexpected predicted items: ${row.unexpectedPredictedItems.join(', ')}`)
      }
    })
  }
}

function printHelp() {
  console.log(`Usage: npm run eval:analysis -- [dataset.json] [options]

Options:
- --out=report.json
- --id=case-id
- --tag=tag-name
- --show-items
- --fail-on-outside-tolerance

Dataset format:
- id: string
- expectedTotalCarbs: number
- toleranceGrams?: number
- imageUrl?: string
- imagePath?: string (relative to the dataset file)
- mealSize?: "small" | "standard" | "large"
- userContext?: string
- tags?: string[]
- notes?: string
- expectedItems?: [{ name: string, aliases?: string[], expectedCarbs?: number }]
`)
}

function round(value: number) {
  return Number(value.toFixed(2))
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right)
  const midpoint = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return round((sorted[midpoint - 1] + sorted[midpoint]) / 2)
  }

  return round(sorted[midpoint])
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
