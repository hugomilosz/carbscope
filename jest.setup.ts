import '@testing-library/jest-dom'
import * as React from 'react'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(async () => ({ error: null })),
      })),
    },
  })),
}))

// Mock react-markdown
jest.mock('react-markdown', () => (props: { children: React.ReactNode }) => {
  return React.createElement(React.Fragment, null, props.children)
})

// Mock FileReader for guest uploads
class MockFileReader {
  onloadend: (() => void) | null = null
  result: string = 'data:image/png;base64,mockdata'
  readAsDataURL() {
    setTimeout(() => {
      if (typeof this.onloadend === 'function') this.onloadend()
    }, 0)
  }
}

global.FileReader = MockFileReader as any
