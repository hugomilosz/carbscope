import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import Stats from '@/components/Stats'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

jest.mock('@supabase/auth-helpers-nextjs')

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <svg data-testid="recharts-barchart">{children}</svg>
  ),
  Bar: () => <g data-testid="recharts-bar" />,
  XAxis: () => <g data-testid="recharts-xaxis" />,
  YAxis: () => <g data-testid="recharts-yaxis" />,
  Tooltip: () => <g data-testid="recharts-tooltip" />,
  CartesianGrid: () => <g data-testid="recharts-grid" />,
  defs: ({ children }: { children: React.ReactNode }) => <defs>{children}</defs>,
  linearGradient: ({ children }: { children: React.ReactNode }) => (
    <linearGradient>{children}</linearGradient>
  ),
  stop: () => <stop />,
}))

// Mocks for Supabase
const mockOrder = jest.fn()
const mockEq = jest.fn(() => ({ order: mockOrder }))
const mockSelect = jest.fn(() => ({ eq: mockEq }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

const mockCreateClient = createClientComponentClient as jest.Mock

describe('Stats component', () => {
  const userId = 'user-123'

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateClient.mockReturnValue({ from: mockFrom })
  })

  it('renders loading state initially', () => {
    mockOrder.mockReturnValue(new Promise(() => {}))
    render(<Stats userId={userId} />)
    expect(
      screen.getByText(/Calculating your stats.../i)
    ).toBeInTheDocument()
  })

  it('renders null if no entries are found', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })
    const { container } = render(<Stats userId={userId} />)

    await waitFor(() => {
      expect(
        screen.queryByText(/Calculating your stats.../i)
      ).not.toBeInTheDocument()
    })

    expect(container.firstChild).toBeNull()
  })

  it('renders stats and chart when data is fetched', async () => {
    const mockData = [
      { created_at: '2025-10-28T10:00:00Z', result_summary: '50.5' },
      { created_at: '2025-10-28T15:00:00Z', result_summary: '74.5' },
      { created_at: '2025-10-29T11:00:00Z', result_summary: '100' },
      { created_at: '2025-10-27T09:00:00Z', result_summary: '20' },
    ]
    mockOrder.mockResolvedValue({ data: mockData, error: null })

    render(<Stats userId={userId} />)

    await waitFor(() => {
      expect(screen.getByText('Your Stats')).toBeInTheDocument()
    })

    // Check Stats
    expect(screen.getByText('82g')).toBeInTheDocument() // Average Daily Carbs
    expect(screen.getByText('4')).toBeInTheDocument() // Total Entries
    expect(screen.getByText('125g')).toBeInTheDocument() // Busiest Day
    expect(screen.getByText(/Busiest Day \(Oct 28\)/i)).toBeInTheDocument()

    expect(screen.getByTestId('recharts-container')).toBeInTheDocument()
    expect(screen.getByTestId('recharts-barchart')).toBeInTheDocument()
    expect(screen.getByTestId('recharts-bar')).toBeInTheDocument()
  })

  it('renders null and logs an error on fetch failure', async () => {
    const mockError = { message: 'Failed to fetch' }
    mockOrder.mockResolvedValue({ data: null, error: mockError })

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const { container } = render(<Stats userId={userId} />)

    await waitFor(() => {
      expect(
        screen.queryByText(/Calculating your stats.../i)
      ).not.toBeInTheDocument()
    })

    expect(container.firstChild).toBeNull()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to fetch stats data:',
      mockError
    )

    consoleErrorSpy.mockRestore()
  })
})