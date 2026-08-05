import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

beforeEach(() => window.localStorage.clear())

describe('Signal Atlas', () => {
  it('returns a contextual resource from the hero search', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: /describe what you need/i }), {
      target: { value: 'avatar generator' },
    })

    expect(screen.getByText('DiceBear')).toBeTruthy()
    expect(screen.getByText(/context matches for/i).textContent).toContain('avatar generator')
  })

  it('opens CMDK with the keyboard shortcut for contextual retrieval', () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'k', metaKey: true })

    expect(screen.getByPlaceholderText(/describe what you are looking for/i)).toBeTruthy()
    expect(screen.getByText('Contextual retrieval')).toBeTruthy()
  })

  it('adds a unique portal link to the searchable collection', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('button', { name: /add a link/i })[0])
    fireEvent.change(screen.getByRole('textbox', { name: 'URL' }), { target: { value: 'https://example.test/new-tool' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Why keep it?' }), { target: { value: 'A test-only visual utility.' } })
    fireEvent.click(screen.getByRole('button', { name: /add to atlas/i }))

    expect(screen.getByText(/added\. it is now searchable/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /all 366/i })).toBeTruthy()
  })
})
