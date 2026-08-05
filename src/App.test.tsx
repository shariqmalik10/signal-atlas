import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import AdminPortal from './AdminPortal'

describe('Signal Atlas public directory', () => {
  it('returns a contextual resource from the hero search as an aligned resource line', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: /search links by context/i }), {
      target: { value: 'avatar generator' },
    })

    expect(screen.getByRole('button', { name: /preview dicebear/i })).toBeTruthy()
    expect(screen.getByText(/result/).textContent).toContain('result')
  })

  it('opens CMDK with the keyboard shortcut for contextual retrieval', () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'k', metaKey: true })

    expect(screen.getByPlaceholderText(/try “creative coding”/i)).toBeTruthy()
    expect(screen.getByText(/esc to close/i)).toBeTruthy()
  })

  it('updates the side preview when a resource line is hovered', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: /search links by context/i }), { target: { value: 'avatar generator' } })
    fireEvent.mouseEnter(screen.getByRole('button', { name: /preview dicebear/i }))

    expect(screen.getByTitle(/preview of dicebear/i).getAttribute('src')).toContain('dicebear.com')
    expect(screen.queryByText(/collected via/i)).toBeNull()
  })

  it('keeps publishing out of the public browsing experience', () => {
    render(<App />)

    expect(screen.queryByRole('button', { name: /add a link|publish to public atlas/i })).toBeNull()
    expect(screen.getByRole('link', { name: /manage collection/i }).getAttribute('href')).toBe('/manage')
  })
})

describe('Signal Atlas management portal', () => {
  it('keeps online storage setup separate from public browsing when no project is configured', () => {
    render(<AdminPortal />)

    expect(screen.getByRole('heading', { name: /connect the shared store/i })).toBeTruthy()
    expect(screen.getByText(/supabase is wired into the app/i)).toBeTruthy()
  })
})
