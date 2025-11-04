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

    // Wait for the useEffect to run getSession
    await waitFor(() => {
      expect(supabase.auth.getSession).toHaveBeenCalled()
      expect(screen.getByTestId('user-display')).toHaveTextContent('No User')
    })
  })
})