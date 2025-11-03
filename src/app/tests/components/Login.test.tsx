import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import Login from '@/components/Login'
import { useAuth } from '@/components/AuthProvider'

// Mock the AuthProvider
jest.mock('@/components/AuthProvider', () => ({
    useAuth: jest.fn(),
}))

// Mock the HCaptcha component
const mockResetCaptcha = jest.fn()
jest.mock('@hcaptcha/react-hcaptcha', () => {
    interface MockHCaptchaProps {
        onVerify: (token: string) => void
        sitekey: string
        theme: 'dark' | 'light'
    }
    interface HCaptchaHandle {
        resetCaptcha: () => void
    }
    const MockHCaptcha = React.forwardRef<HCaptchaHandle, MockHCaptchaProps>(
        (props, ref) => {
        React.useImperativeHandle(ref, () => ({
            resetCaptcha: mockResetCaptcha,
        }))

        return (
            <div
            data-testid="mock-hcaptcha"
            // Simulate a successful verification
            onClick={() => props.onVerify('mock-captcha-token')}
            />
        )
        },
    )
    MockHCaptcha.displayName = 'MockHCaptcha'
    return MockHCaptcha
})

describe('Login component', () => {
  const mockSignIn = jest.fn()
  const mockSignInWithGoogle = jest.fn()
  const mockOnGuestLogin = jest.fn()

  // Helper function to fill the form
  const fillForm = () => {
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' },
    })
  }

  // Helper function to pass the CAPTCHA
  const passCaptcha = () => {
    fireEvent.click(screen.getByTestId('mock-hcaptcha'))
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock useAuth return
    ;(useAuth as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
      signInWithGoogle: mockSignInWithGoogle,
    })

    // Reset mocks
    mockSignIn.mockResolvedValue({})
    mockSignInWithGoogle.mockResolvedValue({})
  })

  it('renders all initial UI elements correctly', () => {
    render(<Login onGuestLogin={mockOnGuestLogin} />)

    expect(
      screen.getByRole('heading', { name: 'CarbScope' }),
    ).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByTestId('mock-hcaptcha')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Sign In' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Continue as Guest' }),
    ).toBeInTheDocument()
  })

  it('calls onGuestLogin when "Continue as Guest" is clicked', () => {
    render(<Login onGuestLogin={mockOnGuestLogin} />)

    fireEvent.click(screen.getByRole('button', { name: 'Continue as Guest' }))

    expect(mockOnGuestLogin).toHaveBeenCalledTimes(1)
  })

  it('shows an error if sign in is attempted without CAPTCHA', async () => {
    render(<Login onGuestLogin={mockOnGuestLogin} />)
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(
        screen.getByText('Please complete the CAPTCHA verification.'),
      ).toBeInTheDocument()
    })
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('calls signIn on successful form submission with CAPTCHA', async () => {
    render(<Login onGuestLogin={mockOnGuestLogin} />)
    fillForm()
    passCaptcha()

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    // Check for loading state
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Signing in...' }),
      ).toBeDisabled()
    })

    // Check that signIn was called correctly
    expect(mockSignIn).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
      { captchaToken: 'mock-captcha-token' },
    )

    // Check that loading state is removed and CAPTCHA is reset
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Sign In' }),
      ).toBeInTheDocument()
      expect(mockResetCaptcha).toHaveBeenCalled()
    })
  })

  it('shows an error if signIn throws an error', async () => {
    const errorMessage = 'Invalid credentials'
    mockSignIn.mockRejectedValue(new Error(errorMessage))

    render(<Login onGuestLogin={mockOnGuestLogin} />)
    fillForm()
    passCaptcha()

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    // Wait for the error
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    // Check that loading state is removed and CAPTCHA is reset
    expect(
      screen.getByRole('button', { name: 'Sign In' }),
    ).toBeInTheDocument()
    expect(mockResetCaptcha).toHaveBeenCalled()
  })

  it('calls signInWithGoogle and shows loading state', async () => {
    render(<Login onGuestLogin={mockOnGuestLogin} />)

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))

    // Check for loading state
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Connecting...' }),
      ).toBeDisabled()
    })

    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Continue with Google' }),
      ).toBeInTheDocument()
    })
  })

  it('shows an error if signInWithGoogle throws an error', async () => {
    const errorMessage = 'Google sign-in failed'
    mockSignInWithGoogle.mockRejectedValue(new Error(errorMessage))

    render(<Login onGuestLogin={mockOnGuestLogin} />)

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))

    // Wait for the error
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeInTheDocument()
  })
})