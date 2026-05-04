import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  AnalyseFoodImageInput,
  EvalDatasetEntry,
  analyseFoodImage,
  createGroqClient,
} from '../lib/analysis'
import { AnalysisStrategy } from '../lib/types'

const DEFAULT_DATASET_PATH = path.resolve(process.cwd(), 'src/evals/sample-meals.json')
const STRATEGIES: AnalysisStrategy[] = ['single_scout']

interface EvalRow {
  caseId: string
  strategy: AnalysisStrategy
  expectedTotalCarbs: number
  predictedTotalCarbs: number
  signedError: number
  absoluteError: number
  percentError: number
  within5g: boolean
  within10g: boolean
  latencyMs: number
  itemCount: number
  averageConfidence: number | null
  promptVersion: string
}

async function main() {
  const { datasetPath, outputPath } = parseArgs(process.argv.slice(2))
  const dataset = await loadDataset(datasetPath)
  const groq = createGroqClient()
  const rows: EvalRow[] = []

  for (const entry of dataset) {
    const imageUrl = await resolveImageUrl(entry, datasetPath)

    for (const strategy of STRATEGIES) {
      const input: AnalyseFoodImageInput = {
        imageUrl,
        userContext: entry.userContext,
        mealSize: entry.mealSize,
      }

      const startedAt = Date.now()
      const result = await analyseFoodImage(input, { groq, strategy })
      const latencyMs = Date.now() - startedAt
      const signedError = result.totalCarbs - entry.expectedTotalCarbs
      const absoluteError = Math.abs(result.totalCarbs - entry.expectedTotalCarbs)
      const percentError = Math.round(
        (absoluteError / Math.max(entry.expectedTotalCarbs, 1)) * 100
      )
      const confidences = result.items
        .map((item) => item.confidence)
        .filter((value): value is number => typeof value === 'number')
      const averageConfidence =
        confidences.length > 0
          ? round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length)
          : null

      rows.push({
        caseId: entry.id,
        strategy,
        expectedTotalCarbs: entry.expectedTotalCarbs,
        predictedTotalCarbs: result.totalCarbs,
        signedError,
        absoluteError,
        percentError,
        within5g: absoluteError <= 5,
        within10g: absoluteError <= 10,
        latencyMs,
        itemCount: result.items.length,
        averageConfidence,
        promptVersion: result.details.prompt_version,
      })
    }
  }

  const summary = buildSummary(rows)
  printSummary(summary, rows)

  if (outputPath) {
    await fs.writeFile(
      outputPath,
      JSON.stringify({ generatedAt: new Date().toISOString(), summary, rows }, null, 2)
    )
    console.log(`\nSaved eval report to ${outputPath}`)
  }
}

function parseArgs(args: string[]) {
  let datasetPath = DEFAULT_DATASET_PATH
  let outputPath: string | undefined

  for (const arg of args) {
    if (arg === '--help') {
      printHelp()
      process.exit(0)
    }

    if (arg.startsWith('--out=')) {
      outputPath = path.resolve(process.cwd(), arg.slice('--out='.length))
      continue
    }

    datasetPath = path.resolve(process.cwd(), arg)
  }

  return { datasetPath, outputPath }
}

async function loadDataset(datasetPath: string): Promise<EvalDatasetEntry[]> {
  const raw = await fs.readFile(datasetPath, 'utf8')
  const parsed = JSON.parse(raw) as EvalDatasetEntry[]

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`Dataset at ${datasetPath} must be a non-empty JSON array`)
  }

  return parsed
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

function buildSummary(rows: EvalRow[]) {
  return STRATEGIES.map((strategy) => {
    const strategyRows = rows.filter((row) => row.strategy === strategy)
    const totalAbsoluteError = strategyRows.reduce((sum, row) => sum + row.absoluteError, 0)
    const totalSignedError = strategyRows.reduce((sum, row) => sum + row.signedError, 0)
    const totalPercentError = strategyRows.reduce((sum, row) => sum + row.percentError, 0)
    const totalLatency = strategyRows.reduce((sum, row) => sum + row.latencyMs, 0)
    const within5gCount = strategyRows.filter((row) => row.within5g).length
    const within10gCount = strategyRows.filter((row) => row.within10g).length
    const confidenceRows = strategyRows.filter((row) => row.averageConfidence !== null)

    return {
      strategy,
      cases: strategyRows.length,
      promptVersion: strategyRows[0]?.promptVersion ?? 'unknown',
      meanAbsoluteError: round(totalAbsoluteError / strategyRows.length),
      meanSignedError: round(totalSignedError / strategyRows.length),
      meanPercentError: round(totalPercentError / strategyRows.length),
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
    }
  })
}

function printSummary(summary: ReturnType<typeof buildSummary>, rows: EvalRow[]) {
  console.log('\nCarbScope analysis eval summary\n')
  console.table(summary)
  console.log('\nCase-level results\n')
  console.table(rows)
}

function printHelp() {
  console.log(`Usage: npm run eval:analysis -- [dataset.json] [--out=report.json]

Dataset format:
- id: string
- expectedTotalCarbs: number
- imageUrl?: string
- imagePath?: string (relative to the dataset file)
- mealSize?: "small" | "standard" | "large"
- userContext?: string
`)
}

function round(value: number) {
  return Number(value.toFixed(2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
