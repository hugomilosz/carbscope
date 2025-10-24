import '@testing-library/jest-dom'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import History from '@/components/History'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

jest.mock('@supabase/auth-helpers-nextjs')

const waitForDataLoad = async () => {
  await waitFor(() =>
    expect(
      screen.queryByText(/Loading your analysis history/i)
    ).not.toBeInTheDocument()
  )
}

type MockAnalysisEntry = {
  id: string;
  image_url: string;
  result_summary: string;
  result_details: string;
  created_at: string;
};

type MockQueryResult = {
  data: MockAnalysisEntry[] | null;
  error: { message: string } | null;
};

describe('History component', () => {
  const mockSupabaseFrom = jest.fn()
  const mockCreateSignedUrl = jest.fn()
  const mockDelete = jest.fn()
  const mockSelect = jest.fn()
  const mockEq = jest.fn()
  const mockOrder = jest.fn()
  const mockGte = jest.fn()
  const mockLt = jest.fn()
  const userId = 'user123'

  beforeEach(() => {
    jest.clearAllMocks()

    const mockQueryPromise = Promise.resolve({ data: [], error: null })
    mockLt.mockResolvedValue(mockQueryPromise)
    mockGte.mockReturnValue({ lt: mockLt })
    mockOrder.mockReturnValue({
        gte: mockGte,
        then: (
            onFulfilled: (result: MockQueryResult) => void,
            onRejected?: (reason?: unknown) => void
        ) =>  mockQueryPromise.then(onFulfilled, onRejected),
        })
    mockEq.mockReturnValue({ order: mockOrder })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockDelete.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
    mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'signed-url' } })

    mockSupabaseFrom.mockImplementation((table) => {
      if (table === 'analyses') return { select: mockSelect, delete: mockDelete }
      return {}
    })

    ;(createClientComponentClient as jest.Mock).mockReturnValue({
      from: mockSupabaseFrom,
      storage: { from: () => ({ createSignedUrl: mockCreateSignedUrl }) },
    })
  })

  it('renders empty state when no history', async () => {
    render(<History userId={userId} />)
    await waitForDataLoad()
    expect(screen.getByText(/No entries found/i)).toBeInTheDocument()
  })

  it('renders fetched history and signed URLs', async () => {
    const data = [{
      id: '1',
      image_url: 'img1.png',
      result_summary: '50',
      result_details: 'Details',
      created_at: new Date().toISOString(),
    }]
    const promise: Promise<MockQueryResult> = Promise.resolve({ data, error: null })
    mockOrder.mockReturnValue({
        gte: mockGte,
        then: (
            onFulfilled: (result: MockQueryResult) => void,
            onRejected?: (reason?: unknown) => void
        ) => promise.then(onFulfilled, onRejected),
        })

    render(<History userId={userId} />)
    await waitForDataLoad()

    expect(screen.getByText(/50g/i)).toBeInTheDocument()
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('img1.png', 60 * 60)
  })

  it('expands and collapses an entry', async () => {
    const data = [{
      id: '1',
      image_url: 'img1.png',
      result_summary: '50',
      result_details: 'Details',
      created_at: new Date().toISOString(),
    }]
    const promise = Promise.resolve({ data, error: null })
    mockOrder.mockReturnValue({
        gte: mockGte,
        then: (
            onFulfilled: (result: MockQueryResult) => void,
            onRejected?: (reason?: unknown) => void
        ) => promise.then(onFulfilled, onRejected),
        })

    render(<History userId={userId} />)
    await waitForDataLoad()

    const expandBtn = screen.getByRole('button', { name: 'Expand entry' })
    fireEvent.click(expandBtn)
    expect(screen.getByText(/Detailed Analysis/i)).toBeInTheDocument()

    fireEvent.click(expandBtn)
    expect(screen.queryByText(/Detailed Analysis/i)).not.toBeInTheDocument()
  })

  it('deletes an entry after confirmation', async () => {
    const data = [{
      id: '1',
      image_url: 'img1.png',
      result_summary: '50',
      result_details: 'Details',
      created_at: new Date().toISOString(),
    }]
    const promise = Promise.resolve({ data, error: null })
    mockOrder.mockReturnValue({
        gte: mockGte,
        then: (
            onFulfilled: (result: MockQueryResult) => void,
            onRejected?: (reason?: unknown) => void
        ) => promise.then(onFulfilled, onRejected),
    })
    mockDelete.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
    window.confirm = jest.fn(() => true)

    render(<History userId={userId} />)
    await waitForDataLoad()

    const refetchPromise = Promise.resolve({ data: [], error: null })
    mockOrder.mockReturnValue({
        gte: mockGte,
        then: (
            onFulfilled: (result: MockQueryResult) => void,
            onRejected?: (reason?: unknown) => void
        ) => refetchPromise.then(onFulfilled, onRejected),
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete entry' }))
    await waitFor(() => expect(screen.getByText(/No entries found/i)).toBeInTheDocument())
  })

  it('shows error if fetch fails', async () => {
    const error = { message: 'Fail' }
    const promise = Promise.resolve({ data: null, error })
    mockOrder.mockReturnValue({
        gte: mockGte,
        then: (
            onFulfilled: (result: MockQueryResult) => void,
            onRejected?: (reason?: unknown) => void
        ) => promise.then(onFulfilled, onRejected),
        })

    render(<History userId={userId} />)
    await waitForDataLoad()
    expect(screen.getByText(/Failed to fetch history/i)).toBeInTheDocument()
  })

  it('filters history by date', async () => {
    const data = [{
      id: '1',
      image_url: 'img1.png',
      result_summary: '50',
      result_details: 'Details',
      created_at: '2025-10-24T12:00:00.000Z',
    }]
    const promise = Promise.resolve({ data, error: null })
    mockLt.mockReturnValue(promise)

    render(<History userId={userId} />)
    await waitForDataLoad()

    const dateInput = screen.getByLabelText('Filter by date')
    fireEvent.change(dateInput, { target: { value: '2025-10-24' } })
    await waitFor(() => expect(screen.getByText(/50g/i)).toBeInTheDocument())

    expect(mockGte).toHaveBeenCalledWith('created_at', '2025-10-24T00:00:00.000Z')
    expect(mockLt).toHaveBeenCalledWith('created_at', '2025-10-25T00:00:00.000Z')
  })

  it('does not delete when confirmation is cancelled', async () => {
    const data = [{
        id: '1',
        image_url: 'img1.png',
        result_summary: '50',
        result_details: 'Details',
        created_at: new Date().toISOString(),
    }]
    const promise = Promise.resolve({ data, error: null })
    mockOrder.mockReturnValue({
        gte: mockGte,
        then: (
            onFulfilled: (result: MockQueryResult) => void,
            onRejected?: (reason?: unknown) => void
        ) => promise.then(onFulfilled, onRejected),
    })
    window.confirm = jest.fn(() => false)

    render(<History userId={userId} />)
    await waitForDataLoad()

    fireEvent.click(screen.getByRole('button', { name: 'Delete entry' }))
    expect(mockDelete).not.toHaveBeenCalled()
    })
})
