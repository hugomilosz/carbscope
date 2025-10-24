import '@testing-library/jest-dom'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImageUpload from '@/components/ImageUpload'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

jest.mock('@supabase/auth-helpers-nextjs')

beforeAll(() => {
  // Mock URL.createObjectURL since jsdom doesn't implement it
  global.URL.createObjectURL = jest.fn(() => 'mocked-url')
})

describe('ImageUpload component', () => {
  const mockOnUploadComplete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.URL.createObjectURL = jest.fn(() => 'mocked-url')

    // Mock Supabase client
    const mockUpload = jest.fn().mockResolvedValue({
      data: { Key: 'user123/123_meal.png' },
      error: null
    })
    const mockFrom = jest.fn(() => ({ upload: mockUpload }))
    
    // Tell TypeScript this is a Jest mock
    const mockedCreateClient = createClientComponentClient as jest.Mock
    mockedCreateClient.mockReturnValue({
      storage: { from: mockFrom }
    })
  })

  it('renders the upload area and initial UI', () => {
    render(<ImageUpload userId="user123" />)

    expect(screen.getByText(/Upload Image/i)).toBeInTheDocument()
    expect(screen.getByText(/Drag and drop or click to select your meal photo/i)).toBeInTheDocument()
  })

  it('shows an error if a non-image file is selected', async () => {
    render(<ImageUpload userId="user123" />)
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })

    const input = screen.getByTestId('file-input')
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() =>
      expect(screen.getByText(/valid image file/i)).toBeInTheDocument()
    )
  })

  it('calls onUploadComplete with base64 when isGuest=true', async () => {
    render(
      <ImageUpload userId="guest123" isGuest onUploadComplete={mockOnUploadComplete} />
    )

    const file = new File(['mock'], 'photo.png', { type: 'image/png' })
    const input = screen.getByTestId('file-input')
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() =>
      expect(mockOnUploadComplete).toHaveBeenCalledWith(
        expect.stringContaining('data:image')
      )
    )
  })

  it('calls Supabase upload for normal user and shows success', async () => {
    jest.useFakeTimers()
    render(
      <ImageUpload userId="user123" onUploadComplete={mockOnUploadComplete} />
    )

    const file = new File(['mock'], 'meal.png', { type: 'image/png' })
    const input = screen.getByTestId('file-input')
    fireEvent.change(input, { target: { files: [file] } })

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() =>
      expect(mockOnUploadComplete).toHaveBeenCalledWith(
        expect.stringMatching(/user123\/\d+_meal.png/)
      )
    )

    expect(screen.getByText(/Upload successful/i)).toBeInTheDocument()
    jest.useRealTimers()
  })

  it('shows error if Supabase upload fails', async () => {
    // Override mock to simulate failure
    const mockUploadFail = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Upload failed' }
    })
    const mockFromFail = jest.fn(() => ({ upload: mockUploadFail }))
    const mockedCreateClient = createClientComponentClient as jest.Mock
    mockedCreateClient.mockReturnValue({
      storage: { from: mockFromFail }
    })

    render(<ImageUpload userId="user123" />)

    const file = new File(['mock'], 'meal.png', { type: 'image/png' })
    const input = screen.getByTestId('file-input')
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() =>
      expect(screen.getByText(/Upload failed/i)).toBeInTheDocument()
    )
  })

  it('shows an error when file is too large', async () => {
    render(<ImageUpload userId="user123" />)
    // Create a "large" fake file (size 15MB)
    const largeFile = new File(['x'.repeat(15 * 1024 * 1024)], 'big.png', { type: 'image/png' })

    const input = screen.getByTestId('file-input')
    fireEvent.change(input, { target: { files: [largeFile] } })

    await waitFor(() =>
      expect(screen.getByText(/File size must be less than 10MB/i)).toBeInTheDocument()
    )
  })

  it('handles drag and drop of an image file', async () => {
    render(<ImageUpload userId="user123" onUploadComplete={mockOnUploadComplete} />)

    const imageFile = new File(['mock'], 'meal.png', { type: 'image/png' })
    const dropArea = screen.getByText(/Choose your food image/i).closest('div')!

    // Simulate drag over
    fireEvent.dragOver(dropArea)
    // Simulate drop
    fireEvent.drop(dropArea, { dataTransfer: { files: [imageFile] } })

    await waitFor(() =>
      expect(mockOnUploadComplete).toHaveBeenCalledWith(
        expect.stringMatching(/user123\/\d+_meal.png/)
      )
    )
  })

    it('prevents upload when file exceeds 10MB and stops further processing', async () => {
    render(<ImageUpload userId="user123" />)
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'huge.png', { type: 'image/png' })

    const input = screen.getByTestId('file-input')
    fireEvent.change(input, { target: { files: [largeFile] } })

    // Wait for error
    await waitFor(() => {
      expect(screen.getByText(/File size must be less than 10MB/i)).toBeInTheDocument()
    })

    // Ensure it didn't set preview or try to upload
    expect(screen.queryByAltText(/Preview/i)).not.toBeInTheDocument()
  })

  it('sets and clears dragOver state correctly', () => {
    render(<ImageUpload userId="user123" />)
    const dropArea = screen.getByTestId('drop-area')

    // Initially, no dragOver styles
    expect(dropArea.className).not.toMatch(/border-cyan-400/)

    // Simulate drag over
    fireEvent.dragOver(dropArea)
    expect(dropArea.className).toMatch(/border-cyan-400/)

    // Simulate drag leave
    fireEvent.dragLeave(dropArea)
    expect(dropArea.className).not.toMatch(/border-cyan-400/)
  })

  it('clicks the drop area to trigger file input', () => {
    render(<ImageUpload userId="user123" />)
    const dropArea = screen.getByTestId('drop-area')
    const fileInput = screen.getByTestId('file-input')

    const mockClick = jest.fn()
    fileInput.click = mockClick

    fireEvent.click(dropArea)
    expect(mockClick).toHaveBeenCalled()
  })

  it('ignores upload when no file is selected', async () => {
    render(<ImageUpload userId="user123" />)
    const input = screen.getByTestId('file-input')

    // Simulate an empty selection
    fireEvent.change(input, { target: { files: [] } })

    // No preview or upload messages should appear
    expect(screen.queryByText(/Upload successful/i)).not.toBeInTheDocument()
    expect(screen.queryByAltText(/Preview/i)).not.toBeInTheDocument()
  })

  it('processes image file when dropped (guest)', async () => {
    render(
      <ImageUpload userId="guest123" isGuest onUploadComplete={mockOnUploadComplete} />
    )

    const dropArea = screen.getByTestId('drop-area')
    const file = new File(['data'], 'meal.png', { type: 'image/png' })

    fireEvent.drop(dropArea, {
      dataTransfer: { files: [file] },
    })

    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument()
      expect(mockOnUploadComplete).toHaveBeenCalledWith(
        expect.stringContaining('data:image')
      )
    })
  })

})
