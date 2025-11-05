import '@testing-library/jest-dom'
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabaseClient'
import type {
  Session,
  User,
  AuthChangeEvent,
  Subscription,
} from '@supabase/supabase-js'

// Mock supabaseClient
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
    },
  },
}))

// Mock data
const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
}

const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  user: mockUser,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
}

const mockSubscription = {
  subscription: {
    id: 'mock-subscription-id',
    callback: jest.fn(),
    unsubscribe: jest.fn(),
  } as Subscription,
}

const TestComponent = () => {
  const { user, signIn, signInWithGoogle, signOut } = useAuth()

  return (
    <div>
      <div data-testid="user-display">
        {user ? `User: ${user.id}` : 'No User'}
      </div>
      <button
        onClick={() =>
          signIn('test@example.com', 'password123', {
            captchaToken: 'mock-token',
          }).catch(() => {
            // TODO
          })
        }
      >
        Sign In
      </button>
      <button
        onClick={() =>
          signInWithGoogle().catch(() => {
            // TODO
          })
        }
      >
        Google Sign In
      </button>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}

describe('AuthProvider', () => {
  let onAuthStateChangeCallback: (
    event: AuthChangeEvent,
    session: Session | null,
  ) => void

  beforeEach(() => {
    jest.clearAllMocks()

    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    })

    // Mock onAuthStateChange
    ;(supabase.auth.onAuthStateChange as jest.Mock).mockImplementation(
      (
        callback: (event: AuthChangeEvent, session: Session | null) => void,
      ) => {
        onAuthStateChangeCallback = callback
        return { data: mockSubscription }
      },
    )

    // Mock successful signOut
    ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null })
  })

  it('throws an error if useAuth is used outside of AuthProvider', () => {
    const originalError = console.error
    console.error = jest.fn()

    expect(() => render(<TestComponent />)).toThrow(
      'useAuth must be used within AuthProvider',
    )

    console.error = originalError
  })

  it('initialises with no user by default', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    // Wait for the useEffect
    await waitFor(() => {
      expect(supabase.auth.getSession).toHaveBeenCalled()
      expect(screen.getByTestId('user-display')).toHaveTextContent('No User')
    })
  })

  it('initialises with a user if a session exists', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    // Wait for useEffect and state update
    await waitFor(() => {
      expect(screen.getByTestId('user-display')).toHaveTextContent(
        `User: ${mockUser.id}`,
      )
    })
  })

  it('updates user state when onAuthStateChange fires a SIGNED_IN event', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    // Ensure initial state is 'No User;
    await waitFor(() => {
      expect(screen.getByTestId('user-display')).toHaveTextContent('No User')
    })

    act(() => {
      onAuthStateChangeCallback('SIGNED_IN', mockSession)
    })

    // Wait for state to update
    await waitFor(() => {
      expect(screen.getByTestId('user-display')).toHaveTextContent(
        `User: ${mockUser.id}`,
      )
    })
  })

  it('updates user state when onAuthStateChange fires a SIGNED_OUT event', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )


    await waitFor(() => {
      expect(screen.getByTestId('user-display')).toHaveTextContent(
        `User: ${mockUser.id}`,
      )
    })

    // 3. Simulate SIGNED_OUT event
    act(() => {
      onAuthStateChangeCallback('SIGNED_OUT', null)
    })

    // Wait for state to update
    await waitFor(() => {
      expect(screen.getByTestId('user-display')).toHaveTextContent('No User')
    })
  })

  it('calls supabase.auth.signInWithPassword on signIn', async () => {
    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: mockSession, user: mockUser },
      error: null,
    })
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: { captchaToken: 'mock-token' },
      })
    })
  })

  it('throws error if signIn fails', async () => {
    const errorMessage = 'Invalid login'
    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: null, user: null },
      error: new Error(errorMessage),
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalled()
    })
  })

  it('calls supabase.auth.signInWithOAuth on signInWithGoogle', async () => {
    ;(supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
      data: { provider: 'google', url: 'http://mock.url' },
      error: null,
    })
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Google Sign In' }))

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost',
        },
      })
    })
  })

  it('calls supabase.auth.signOut on signOut and sets user to null', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('user-display')).toHaveTextContent(
        `User: ${mockUser.id}`,
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }))

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled()
      expect(screen.getByTestId('user-display')).toHaveTextContent('No User')
    })
  })

  it('unsubscribes from auth listener on unmount', async () => {
    const { unmount } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled()
    })

    unmount()

    expect(mockSubscription.subscription.unsubscribe).toHaveBeenCalledTimes(1)
  })
})