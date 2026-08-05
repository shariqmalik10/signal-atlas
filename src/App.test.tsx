import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Signal Atlas public directory', () => {
  it('shows a date and short description before the destination in each resource row', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: /search links by context/i }), {
      target: { value: 'avatar generator' },
    })

    expect(screen.getAllByText('05 Aug 2026').length).toBeGreaterThan(0)
    const diceBearRow = screen.getByRole('button', { name: /preview dicebear/i })
    expect(within(diceBearRow).getByText(/free, open source avatar library/i)).toBeTruthy()
    expect(screen.getByText('Added')).toBeTruthy()
    expect(screen.getByText('Context')).toBeTruthy()
  })

  it('returns a contextual resource from the hero search as an aligned resource line', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: /search links by context/i }), {
      target: { value: 'avatar generator' },
    })

    expect(screen.getByRole('button', { name: /preview dicebear/i })).toBeTruthy()
    expect(screen.getByText(/result/).textContent).toContain('result')
  })

  it('keeps description-only contextual matches in CMDK and removes repeated provenance copy', () => {
    render(<App />)
    fireEvent.keyDown(window, { key: 'k', metaKey: true })

    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByPlaceholderText(/try “creative coding”/i), { target: { value: 'library' } })

    expect(within(dialog).getByText('DiceBear')).toBeTruthy()
    expect(within(dialog).queryByText(/collected via/i)).toBeNull()
  })

  it('shows the preview and tags only while its resource line is hovered', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: /search links by context/i }), { target: { value: 'avatar generator' } })
    expect(screen.queryByRole('complementary', { name: /preview dicebear/i })).toBeNull()

    fireEvent.mouseEnter(screen.getByRole('button', { name: /preview dicebear/i }), { clientX: 260, clientY: 340 })

    const preview = screen.getByRole('complementary', { name: /preview dicebear/i })
    expect(within(preview).getByTitle(/preview of dicebear/i).getAttribute('src')).toContain('dicebear.com')
    expect(within(preview).getByText('utility')).toBeTruthy()
    expect(screen.queryByText(/collected via/i)).toBeNull()
  })

  it('anchors pointer-activated previews beside the selected row', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: /search links by context/i }), { target: { value: 'avatar generator' } })
    fireEvent.click(screen.getByRole('button', { name: /preview dicebear/i }), { detail: 1, clientX: 260, clientY: 340 })

    const preview = screen.getByRole('complementary', { name: /preview dicebear/i })
    expect(preview.className).toContain('is-pointer')
    expect(preview.style.left).not.toBe('')
  })

  it('opens the same tagged preview when a resource line receives keyboard focus', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: /search links by context/i }), { target: { value: 'avatar generator' } })
    fireEvent.focus(screen.getByRole('button', { name: /preview dicebear/i }))

    expect(screen.getByRole('complementary', { name: /preview dicebear/i })).toBeTruthy()
  })

  it('tracks the pointer with the pixel cursor and Scout’s eyes', () => {
    render(<App />)

    fireEvent.pointerMove(window, { clientX: 120, clientY: 180, pointerType: 'mouse' })

    expect(screen.getByTestId('pixel-cursor').style.transform).toContain('120px')
    expect(screen.getByTestId('scout-eyes').style.getPropertyValue('--gaze-x')).not.toBe('0px')
  })

  it('uses a source-controlled custom-links file instead of a publishing portal', () => {
    render(<App />)

    expect(screen.queryByRole('button', { name: /add a link|publish to public atlas/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /manage collection/i })).toBeNull()
    expect(screen.getByText(/src\/data\/custom-links\.ts/i)).toBeTruthy()
  })
})
