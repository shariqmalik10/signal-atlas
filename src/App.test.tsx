import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

describe('UI Atlas public directory', () => {
  it('shows a date and short description before the destination in each resource row', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: /search links by context/i }), {
      target: { value: 'avatar generator' },
    })

    expect(screen.getAllByText('05 Aug 2026').length).toBeGreaterThan(0)
    const diceBearRow = screen.getByRole('link', { name: /open dicebear in a new tab/i })
    expect(within(diceBearRow).getByText(/free, open source avatar library/i)).toBeTruthy()
    expect(screen.getByText('Added')).toBeTruthy()
    expect(screen.getByText('Context')).toBeTruthy()
  })

  it('returns a contextual resource from the hero search as an aligned resource line', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: /search links by context/i }), {
      target: { value: 'avatar generator' },
    })

    expect(screen.getByRole('link', { name: /open dicebear in a new tab/i })).toBeTruthy()
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

  it('opens a selected CMDK result in a new tab', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(<App />)

    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByPlaceholderText(/try “creative coding”/i), { target: { value: 'avatar generator' } })
    fireEvent.click(within(dialog).getByText('DiceBear'))

    expect(open).toHaveBeenCalledWith('https://dicebear.com/', '_blank', 'noopener,noreferrer')
    open.mockRestore()
  })

  it('keeps hover previews off until the directory toggle enables them', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: /search links by context/i }), { target: { value: 'avatar generator' } })
    const diceBearRow = screen.getByRole('link', { name: /open dicebear in a new tab/i })

    fireEvent.mouseEnter(diceBearRow, { clientX: 260, clientY: 340 })
    expect(screen.queryByRole('complementary', { name: /preview dicebear/i })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /hover previews: off/i }))
    fireEvent.mouseEnter(diceBearRow, { clientX: 260, clientY: 340 })

    expect(screen.getByRole('complementary', { name: /preview dicebear/i })).toBeTruthy()
  })

  it('makes every resource row a new-tab link to its destination', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: /search links by context/i }), { target: { value: 'avatar generator' } })

    const diceBearRow = screen.getByRole('link', { name: /open dicebear in a new tab/i })
    expect(diceBearRow.getAttribute('href')).toBe('https://dicebear.com/')
    expect(diceBearRow.getAttribute('target')).toBe('_blank')
  })

  it('shows the preview and tags only while its resource line is hovered', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: /search links by context/i }), { target: { value: 'avatar generator' } })
    expect(screen.queryByRole('complementary', { name: /preview dicebear/i })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /hover previews: off/i }))

    fireEvent.mouseEnter(screen.getByRole('link', { name: /open dicebear in a new tab/i }), { clientX: 260, clientY: 340 })

    const preview = screen.getByRole('complementary', { name: /preview dicebear/i })
    expect(within(preview).getByTitle(/preview of dicebear/i).getAttribute('src')).toContain('dicebear.com')
    expect(within(preview).getByText('utility')).toBeTruthy()
    expect(screen.queryByText(/collected via/i)).toBeNull()
  })

  it('keeps the preview as a noninteractive visual-only tooltip', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: /search links by context/i }), { target: { value: 'avatar generator' } })
    fireEvent.click(screen.getByRole('button', { name: /hover previews: off/i }))
    fireEvent.mouseEnter(screen.getByRole('link', { name: /open dicebear in a new tab/i }), { clientX: 260, clientY: 340 })

    const preview = screen.getByRole('complementary', { name: /preview dicebear/i })
    expect(within(preview).queryByRole('link')).toBeNull()
    const iframe = within(preview).getByTitle(/preview of dicebear/i) as HTMLIFrameElement
    expect(iframe.tabIndex).toBe(-1)
  })

  it('keeps enabled hover previews dynamically above the cursor', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: /search links by context/i }), { target: { value: 'avatar generator' } })
    fireEvent.click(screen.getByRole('button', { name: /hover previews: off/i }))
    const diceBearRow = screen.getByRole('link', { name: /open dicebear in a new tab/i })
    fireEvent.mouseEnter(diceBearRow, { clientX: 260, clientY: 340 })

    const preview = screen.getByRole('complementary', { name: /preview dicebear/i })
    const initialTop = Number.parseInt(preview.style.top, 10)
    fireEvent.mouseMove(diceBearRow, { clientX: 260, clientY: 660 })

    expect(preview.className).toContain('is-pointer')
    expect(Number.parseInt(preview.style.top, 10)).toBeGreaterThan(initialTop)
    expect(Number.parseInt(preview.style.top, 10)).toBeLessThan(660)
  })

  it('opens the same tagged preview when a resource line receives keyboard focus', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('textbox', { name: /search links by context/i }), { target: { value: 'avatar generator' } })
    fireEvent.click(screen.getByRole('button', { name: /hover previews: off/i }))
    fireEvent.focus(screen.getByRole('link', { name: /open dicebear in a new tab/i }))

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
