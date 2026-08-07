import { ArrowUpRight, Command as CommandIcon, Plus, Search } from 'lucide-react'
import { Command } from 'cmdk'
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { COLLECTION_LINKS } from './data/atlas'
import { CUSTOM_LINKS } from './data/custom-links'
import { mergeLinks, scoreLinkForQuery, type AtlasLink } from './lib/links'

const SOURCE_HUBS = [
  { name: 'Your Arc collection', url: '#directory' },
  { name: 'DesEngs', url: 'https://desengs.com' },
  { name: 'UI Land Resources', url: 'https://ui.land/resources' },
  { name: 'Design Engineer Tools', url: 'https://designengineer.tools' },
  { name: 'Flora Guo — Design Engineering', url: 'https://floguo.com/notes/design-engineering' },
  { name: 'Design Minis', url: 'https://designminis.com' },
  { name: 'cur8d.club', url: 'https://cur8d.club' },
]

function domainFor(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

const COLLECTION_ADDED_AT = '2026-08-05'

function formatAddedDate(link: AtlasLink) {
  const [year, month, day] = (link.addedAt ?? COLLECTION_ADDED_AT).split('-')
  const monthName = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))))
  return `${day} ${monthName} ${year}`
}

function publicDescription(link: AtlasLink) {
  const cleaned = link.description.replace(/\s*Collected via .+$/gi, '').trim()
  return cleaned || `A curated ${link.category.toLowerCase()} resource from UI Atlas.`
}

function displayName(link: AtlasLink, nearbyLinks: AtlasLink[]) {
  const hasSiblingOnSameSite = nearbyLinks.some((candidate) => candidate.id !== link.id && candidate.title === link.title && domainFor(candidate.url) === domainFor(link.url))
  if (!hasSiblingOnSameSite) return link.title
  const path = new URL(link.url).pathname.split('/').filter(Boolean).at(-1)
  return `${link.title} — ${path ? path.replace(/[-_]/g, ' ') : 'home'}`
}

type PreviewPoint = { left: number; top: number }

function previewPoint(clientX: number, clientY: number): PreviewPoint {
  const width = 376
  const height = 468
  const margin = 16
  return {
    left: Math.max(margin, Math.min(clientX - width / 2, window.innerWidth - width - margin)),
    top: Math.max(margin, Math.min(clientY - height - 14, window.innerHeight - height - margin)),
  }
}

type PointerPosition = { x: number; y: number }

function PixelScout({ pointer }: { pointer: PointerPosition | null }) {
  const scoutRef = useRef<HTMLDivElement>(null)
  const bounds = scoutRef.current?.getBoundingClientRect()
  const centerX = bounds && bounds.width ? bounds.left + bounds.width / 2 : window.innerWidth / 2
  const centerY = bounds && bounds.height ? bounds.top + bounds.height / 2 : window.innerHeight / 2
  const gazeX = pointer ? Math.max(-6, Math.min(6, (pointer.x - centerX) / 28)) : 0
  const gazeY = pointer ? Math.max(-4, Math.min(4, (pointer.y - centerY) / 42)) : 0
  const eyeStyle = { '--gaze-x': `${gazeX}px`, '--gaze-y': `${gazeY}px` } as CSSProperties

  return <div className="pixel-scout" ref={scoutRef} aria-hidden="true"><span className="pixel-star star-one" /><span className="pixel-star star-two" /><span className="pixel-scout-antenna" /><span className="pixel-scout-ear left" /><span className="pixel-scout-ear right" /><span className="pixel-scout-head"><span className="pixel-eye-track" data-testid="scout-eyes" style={eyeStyle}><i className="pixel-eye left" /><i className="pixel-eye right" /></span><b /></span><span className="pixel-scout-body"><i /><i /></span><span className="pixel-scout-shadow" /></div>
}

export default function App() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [commandOpen, setCommandOpen] = useState(false)
  const [hoverPreviewsEnabled, setHoverPreviewsEnabled] = useState(false)
  const [pointer, setPointer] = useState<PointerPosition | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [tooltipPoint, setTooltipPoint] = useState<PreviewPoint | null>(null)
  const previewDismissTimer = useRef<number | null>(null)
  const [visibleCount, setVisibleCount] = useState(48)

  function keepPreviewOpen() {
    if (previewDismissTimer.current !== null) window.clearTimeout(previewDismissTimer.current)
  }

  function showPreview(linkId: string, point?: PreviewPoint) {
    keepPreviewOpen()
    setHoveredId(linkId)
    setTooltipPoint(point ?? null)
  }

  function queuePreviewDismissal() {
    previewDismissTimer.current = window.setTimeout(() => {
      setHoveredId(null)
      setTooltipPoint(null)
    }, 120)
  }

  function toggleHoverPreviews() {
    if (hoverPreviewsEnabled) {
      setHoveredId(null)
      setTooltipPoint(null)
    }
    setHoverPreviewsEnabled((enabled) => !enabled)
  }

  useEffect(() => {
    function trackPointer(event: PointerEvent) {
      if (event.pointerType !== 'touch' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setPointer({ x: event.clientX, y: event.clientY })
    }
    window.addEventListener('pointermove', trackPointer)
    return () => window.removeEventListener('pointermove', trackPointer)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (previewDismissTimer.current !== null) window.clearTimeout(previewDismissTimer.current)
    }
  }, [])

  const links = useMemo(() => mergeLinks(COLLECTION_LINKS, CUSTOM_LINKS), [])
  const categories = useMemo(() => ['All', ...Array.from(new Set(links.map((link) => link.category))).sort()], [links])
  const results = useMemo(() => links
    .filter((link) => activeCategory === 'All' || link.category === activeCategory)
    .map((link) => ({ link, score: scoreLinkForQuery(link, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.link.title.localeCompare(b.link.title))
    .map(({ link }) => link), [activeCategory, links, query])
  const hoveredLink = hoveredId ? results.find((link) => link.id === hoveredId) ?? null : null
  const visibleResults = results.slice(0, visibleCount)

  useEffect(() => {
    setVisibleCount(48)
  }, [activeCategory, query])

  return <main className="atlas-shell" id="directory">
    <div aria-hidden="true" className={`pixel-cursor${pointer ? ' is-visible' : ''}`} data-testid="pixel-cursor" style={pointer ? { transform: `translate(${pointer.x}px, ${pointer.y}px)` } : undefined} />
    <header className="site-header">
      <a className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>UI<br />Atlas</span></a>
      <div className="header-actions"><a className="subtle-link" href="#sources">Sources</a><button className="command-trigger" onClick={() => setCommandOpen(true)} aria-label="Open contextual search"><Search size={16} /><span>Search the atlas</span><kbd>⌘ K</kbd></button></div>
    </header>

    <section className="atlas-hero">
      <div className="hero-copy">
        <p className="eyebrow"><span /> A public field guide for the good internet</p>
        <h1>Keep the useful<br /><em>corners close.</em></h1>
        <p className="hero-description">A deliberately edited collection of interfaces, people, tools, and experiments—organized by purpose, not hype.</p>
        <div className="hero-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Describe what you’re looking for…" aria-label="Search links by context" /><button onClick={() => setCommandOpen(true)}><CommandIcon size={15} /> Browse</button></div>
        <div className="hero-facts"><span><b>{links.length}</b> useful links</span><span><b>7</b> source trails</span><span><b>⌘K</b> contextual search</span></div>
      </div>
      <div className="scout-stage"><PixelScout pointer={pointer} /><p>Scout’s currently<br />looking for <em>good stuff.</em></p></div>
    </section>

    <section className="directory-intro">
      <div><p className="eyebrow">The directory</p><h2>One line per place.</h2></div>
      <p>Hover previews are off by default. Switch them on to inspect a site without interrupting the directory.</p>
    </section>

    <nav className="filter-row" aria-label="Filter links by category">
      {categories.map((category) => <button className={category === activeCategory ? 'is-active' : ''} key={category} onClick={() => setActiveCategory(category)}>{category}</button>)}
    </nav>
    <div className="preview-toggle-row">
      <span>Site previews</span>
      <button type="button" aria-pressed={hoverPreviewsEnabled} onClick={toggleHoverPreviews}>Hover previews: {hoverPreviewsEnabled ? 'on' : 'off'}</button>
    </div>

    <section className="collection-layout" aria-label="Link collection">
      <div className="link-index">
        <div className="index-header"><span>{results.length} result{results.length === 1 ? '' : 's'}</span><span className="index-columns"><b>Added</b><b>Context</b><b>Destination</b></span></div>
        <ol className="resource-lines">
          {visibleResults.map((link, index) => <li key={link.id} className={hoveredLink?.id === link.id ? 'is-hovered' : ''}>
            <a className="resource-line" href={link.url} target="_blank" rel="noreferrer" onMouseEnter={(event) => { if (hoverPreviewsEnabled) showPreview(link.id, previewPoint(event.clientX, event.clientY)) }} onMouseMove={(event) => { if (hoverPreviewsEnabled) showPreview(link.id, previewPoint(event.clientX, event.clientY)) }} onMouseLeave={() => { if (hoverPreviewsEnabled) queuePreviewDismissal() }} onFocus={() => { if (hoverPreviewsEnabled) showPreview(link.id) }} onBlur={() => { if (hoverPreviewsEnabled) queuePreviewDismissal() }} aria-label={`Open ${link.title} in a new tab`}>
              <span className="line-number">{String(index + 1).padStart(3, '0')}</span>
              <span className="line-date">{formatAddedDate(link)}</span>
              <span className="line-summary">{publicDescription(link)}</span>
              <span className="line-name">{displayName(link, results)}</span>
              <span className="line-domain">{domainFor(link.url)}</span>
              <span className="line-arrow" aria-hidden="true">↗</span>
            </a>
          </li>)}
        </ol>
        {!results.length && <div className="empty-state"><p>No exact signal yet.</p><button onClick={() => { setQuery(''); setActiveCategory('All') }}>Reset the directory</button></div>}
        {visibleResults.length < results.length && <button className="load-more" onClick={() => setVisibleCount((count) => count + 48)}>Load 48 more <Plus size={15} /></button>}
      </div>
    </section>
    {hoveredLink && <PreviewTooltip link={hoveredLink} point={tooltipPoint} />}

    <section className="provenance" id="sources">
      <div><p className="eyebrow">Provenance, once</p><h2>Curated in public.</h2></div>
      <div><p>Every imported resource retains its source data, while the directory stays intentionally quiet. The original collection came from your supplied Arc links; additional routes were discovered from these curation hubs.</p><ul>{SOURCE_HUBS.map((source) => <li key={source.name}><a href={source.url} target={source.url.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{source.name} <ArrowUpRight size={13} /></a></li>)}</ul></div>
    </section>

    <footer className="site-footer"><span>UI Atlas / living index</span><span>Static catalog · edit <code>src/data/custom-links.ts</code> to add a link</span></footer>

    <Command.Dialog className="command-dialog" open={commandOpen} onOpenChange={setCommandOpen} label="Search UI Atlas" shouldFilter={false}>
      <div className="command-box"><div className="command-input-wrap"><Search size={17} /><Command.Input value={query} onValueChange={setQuery} placeholder="Try “creative coding”, “avatar generator”, or “agent UI”…" autoFocus /></div><Command.List>{results.slice(0, 10).map((link) => <Command.Item key={link.id} value={`${link.title} ${link.category} ${link.tags.join(' ')}`} onSelect={() => { window.open(link.url, '_blank', 'noopener,noreferrer'); setCommandOpen(false) }}><span><b>{link.title}</b><small>{link.category} · {publicDescription(link)}</small></span><ArrowUpRight size={16} /></Command.Item>)}{!results.length && <Command.Empty>No matching links.</Command.Empty>}</Command.List><div className="command-footer"><span>↵ to open a result</span><span>esc to close</span><span><kbd>⌘ K</kbd> from anywhere</span></div></div>
    </Command.Dialog>
  </main>
}

function PreviewTooltip({ link, point }: { link: AtlasLink; point: PreviewPoint | null }) {
  return <aside className={`preview-tooltip${point ? ' is-pointer' : ''}`} aria-label={`Preview ${link.title}`} aria-live="polite" style={point ?? undefined}>
    <div className="preview-label"><span>Site preview</span><span>{domainFor(link.url)}</span></div>
    <div className="preview-window" key={link.id}><iframe title={`Preview of ${link.title}`} src={link.url} sandbox="allow-scripts allow-forms allow-popups" referrerPolicy="no-referrer" loading="lazy" tabIndex={-1} /><div className="preview-fallback">Some sites block embedded previews.</div></div>
    <div className="preview-content"><div className="preview-heading"><p className="eyebrow">{link.category}</p><strong>{link.title}</strong></div><p>{publicDescription(link)}</p><div className="preview-tags">{link.tags.slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div></div>
  </aside>
}
