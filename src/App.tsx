import { Command } from 'cmdk'
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Command as CommandIcon,
  ExternalLink,
  FilePlus2,
  FolderHeart,
  Link2,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { COLLECTION_LINKS, COLLECTION_SOURCES } from './data/atlas'
import { canonicalizeUrl, makeLinkId, mergeLinks, scoreLinkForQuery, type AtlasLink } from './lib/links'

const STORAGE_KEY = 'signal-atlas-custom-links-v1'
const CATEGORY_ORDER = [
  'Inspiration',
  'Components',
  'Motion & effects',
  'Tools',
  'AI & agents',
  'Reading',
  'Portfolios',
  'Collections',
]

type PortalForm = {
  url: string
  title: string
  description: string
  category: string
}

const initialPortalForm: PortalForm = {
  url: '',
  title: '',
  description: '',
  category: 'Tools',
}

function restorePortalLinks(): AtlasLink[] {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value ? JSON.parse(value) : []
  } catch {
    return []
  }
}

function titleFromUrl(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, '')
  return host
    .split('.')[0]
    .split(/[-_]/)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(' ')
}

function categoryClass(category: string): string {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export default function App() {
  const [portalLinks, setPortalLinks] = useState<AtlasLink[]>(restorePortalLinks)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [commandOpen, setCommandOpen] = useState(false)
  const [portalOpen, setPortalOpen] = useState(false)
  const [portalForm, setPortalForm] = useState<PortalForm>(initialPortalForm)
  const [portalNotice, setPortalNotice] = useState('')

  const allLinks = useMemo(() => mergeLinks(COLLECTION_LINKS, portalLinks), [portalLinks])
  const categories = useMemo(
    () => CATEGORY_ORDER.filter((category) => allLinks.some((link) => link.category === category)),
    [allLinks],
  )

  const categoryLinks = useMemo(
    () => (selectedCategory === 'All' ? allLinks : allLinks.filter((link) => link.category === selectedCategory)),
    [allLinks, selectedCategory],
  )

  const rankedLinks = useMemo(() => {
    const normalizedQuery = query.trim()
    return [...categoryLinks]
      .map((link) => ({ link, score: scoreLinkForQuery(link, normalizedQuery) }))
      .filter(({ score }) => !normalizedQuery || score > 0)
      .sort((a, b) => (normalizedQuery ? b.score - a.score || a.link.title.localeCompare(b.link.title) : a.link.title.localeCompare(b.link.title)))
  }, [categoryLinks, query])

  const visibleLinks = rankedLinks.slice(0, query.trim() ? 24 : 36)
  const commandLinks = rankedLinks.slice(0, 12)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen((open) => !open)
      }
      if (event.key === 'Escape') setPortalOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function updatePortalForm<Key extends keyof PortalForm>(key: Key, value: PortalForm[Key]) {
    setPortalForm((form) => ({ ...form, [key]: value }))
  }

  function savePortalLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPortalNotice('')

    let url: string
    try {
      url = canonicalizeUrl(portalForm.url)
    } catch {
      setPortalNotice('Add a complete web address, for example https://example.com.')
      return
    }

    if (allLinks.some((link) => canonicalizeUrl(link.url) === url)) {
      setPortalNotice('Already in your atlas — duplicate links are intentionally blocked.')
      return
    }

    const nextLink: AtlasLink = {
      id: makeLinkId(url),
      title: portalForm.title.trim() || titleFromUrl(url),
      url,
      category: portalForm.category,
      description: portalForm.description.trim() || 'Added through your personal portal.',
      tags: [portalForm.category.toLowerCase(), 'personal collection', 'saved'],
      sources: [{ name: 'Added through your portal', url: '' }],
      addedBy: 'portal',
    }
    const nextLinks = [...portalLinks, nextLink]
    setPortalLinks(nextLinks)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLinks))
    setPortalForm(initialPortalForm)
    setPortalNotice('Added. It is now searchable in this browser.')
  }

  function selectCommandLink(link: AtlasLink) {
    setQuery(link.title)
    setSelectedCategory('All')
    setCommandOpen(false)
    requestAnimationFrame(() => document.querySelector('#library')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <main>
      <header className="site-header" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Signal Atlas home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>Signal<br />Atlas</span>
        </a>
        <nav className="nav-links" aria-label="On this page">
          <a href="#library">Library</a>
          <a href="#method">Method</a>
          <button className="nav-add" onClick={() => setPortalOpen(true)}><FilePlus2 size={15} /> Add a link</button>
        </nav>
        <button className="command-trigger" onClick={() => setCommandOpen(true)} aria-label="Open contextual search">
          <Search size={16} /> <span>Search</span><kbd>⌘ K</kbd>
        </button>
      </header>

      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span /> 365 signals, organized by purpose</p>
          <h1 id="hero-title">Find the <em>right</em> corner<br />of the internet.</h1>
          <p className="hero-description">An opinionated field guide to interface craft — portfolios, components, references, experiments, and the useful rabbit holes behind them.</p>
          <div className="hero-search-shell">
            <Search size={19} aria-hidden="true" />
            <input
              aria-label="Describe what you need"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') setCommandOpen(true) }}
              placeholder="Try: “a beautiful avatar generator”"
            />
            <button onClick={() => setCommandOpen(true)}>Search <ArrowUpRight size={15} /></button>
          </div>
          <div className="query-prompts" aria-label="Search ideas">
            <span>Good starting points</span>
            {['motion details', 'product UI reference', 'agent interface', 'frontend components'].map((prompt) => (
              <button key={prompt} onClick={() => { setQuery(prompt); setCommandOpen(true) }}>{prompt}</button>
            ))}
          </div>
        </div>
        <div className="hero-orbit" aria-label="Signal Atlas visual index">
          <div className="orbit-copy top-copy">context<br />over<br />clutter</div>
          <div className="orbit-copy bottom-copy">not just<br />bookmarks</div>
          <div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-ring ring-three" />
          <div className="orbit-core"><span>Explore</span><ArrowDownRight size={28} /></div>
          <span className="orbit-point point-a" /><span className="orbit-point point-b" /><span className="orbit-point point-c" />
          <span className="orbit-label label-a">craft</span><span className="orbit-label label-b">utility</span><span className="orbit-label label-c">taste</span>
        </div>
      </section>

      <section className="signal-strip" aria-label="Collection information">
        <p><Sparkles size={15} /> Curated from your Arc collection</p>
        <p><FolderHeart size={15} /> {COLLECTION_SOURCES.length} cited source directories</p>
        <p><Link2 size={15} /> Exact URL duplicates removed</p>
        <button onClick={() => setPortalOpen(true)}>Add your next find <ArrowUpRight size={15} /></button>
      </section>

      <section className="library-section" id="library" aria-labelledby="library-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The library</p>
            <h2 id="library-title">Browse by <em>intent.</em></h2>
          </div>
          <p className="library-summary">Every card preserves its trail: direct finds are marked as your Arc collection, while imported links cite the directory or note that led here.</p>
        </div>

        <div className="category-row" aria-label="Filter library by category">
          <button className={selectedCategory === 'All' ? 'category-chip is-active' : 'category-chip'} onClick={() => setSelectedCategory('All')}>All <span>{allLinks.length}</span></button>
          {categories.map((category) => {
            const count = allLinks.filter((link) => link.category === category).length
            return <button key={category} className={selectedCategory === category ? 'category-chip is-active' : 'category-chip'} onClick={() => setSelectedCategory(category)}>{category} <span>{count}</span></button>
          })}
        </div>

        <div className="result-bar" aria-live="polite">
          <p>{query.trim() ? <>Context matches for <strong>“{query.trim()}”</strong></> : <>A selected field of <strong>{allLinks.length} links</strong></>}</p>
          {query.trim() && <button onClick={() => setQuery('')}>Clear query <X size={14} /></button>}
        </div>

        {visibleLinks.length ? (
          <div className="link-grid">
            {visibleLinks.map(({ link, score }, index) => <LinkCard key={link.id} link={link} score={score} index={index} />)}
          </div>
        ) : (
          <div className="empty-state">
            <Search size={24} />
            <h3>No direct signal yet.</h3>
            <p>Try a different description, or save the exact site through your portal.</p>
            <button onClick={() => setPortalOpen(true)}>Open personal portal <ArrowUpRight size={15} /></button>
          </div>
        )}
        {rankedLinks.length > visibleLinks.length && <p className="result-footnote">Showing the strongest {visibleLinks.length} matches. Refine your context in the command menu for more.</p>}
      </section>

      <section className="method-section" id="method" aria-labelledby="method-title">
        <div className="method-aside"><p className="eyebrow">A living collection</p><span>01—03</span></div>
        <div className="method-copy">
          <h2 id="method-title">The links are useful. <em>The trail is, too.</em></h2>
          <div className="method-grid">
            <article><span>01</span><h3>Purpose first</h3><p>Search feels like a short brief, not a filename lookup. “Motion details for a product page” can surface tools, reading, and references together.</p></article>
            <article><span>02</span><h3>Sources stay visible</h3><p>Imported resources carry their original directory or article citation, so you can keep following the people whose taste got you there.</p></article>
            <article><span>03</span><h3>Yours grows locally</h3><p>The portal adds a link straight into this browser’s atlas and makes it searchable immediately — without polluting the curated base.</p></article>
          </div>
        </div>
      </section>

      <footer>
        <a className="brand" href="#top"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Signal<br />Atlas</span></a>
        <p>Built as a personal map for better interface work.</p>
        <button onClick={() => setCommandOpen(true)}>Search the atlas <CommandIcon size={15} /></button>
      </footer>

      <Command.Dialog className="command-dialog" label="Search Signal Atlas" open={commandOpen} onOpenChange={setCommandOpen} shouldFilter={false}>
        <div className="command-shell">
          <div className="command-topline"><span><Sparkles size={14} /> Contextual retrieval</span><button onClick={() => setCommandOpen(false)} aria-label="Close search"><X size={18} /></button></div>
          <div className="command-input-wrap"><Search size={19} /><Command.Input value={query} onValueChange={setQuery} placeholder="Describe what you are looking for…" autoFocus /></div>
          <Command.List className="command-list">
            {commandLinks.length === 0 && <Command.Empty className="command-empty">No match yet — try a use case or category.</Command.Empty>}
            {commandLinks.length > 0 && <Command.Group heading={query.trim() ? 'Best contextual matches' : 'Start exploring'}>
              {commandLinks.map(({ link }) => <Command.Item key={link.id} value={link.id} onSelect={() => selectCommandLink(link)}>
                <span className={`command-category ${categoryClass(link.category)}`}>{link.category}</span>
                <span className="command-link-copy"><b>{link.title}</b><small>{link.description}</small></span>
                <ArrowUpRight size={16} />
              </Command.Item>)}
            </Command.Group>}
          </Command.List>
          <div className="command-footer"><span>↵ to focus a result</span><span>esc to close</span><span><kbd>⌘ K</kbd> from anywhere</span></div>
        </div>
      </Command.Dialog>

      {portalOpen && <div className="portal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPortalOpen(false) }}>
        <section className="portal" role="dialog" aria-modal="true" aria-labelledby="portal-title">
          <div className="portal-heading"><div><p className="eyebrow">Personal intake</p><h2 id="portal-title">Add a new signal.</h2></div><button onClick={() => setPortalOpen(false)} aria-label="Close add-link portal"><X size={20} /></button></div>
          <p className="portal-intro">Saved locally in this browser, searchable straight away, and checked against the complete atlas before it is added.</p>
          <form onSubmit={savePortalLink}>
            <label>URL <input required type="url" value={portalForm.url} onChange={(event) => updatePortalForm('url', event.target.value)} placeholder="https://…" /></label>
            <div className="form-split"><label>Name <input value={portalForm.title} onChange={(event) => updatePortalForm('title', event.target.value)} placeholder="Optional — inferred from URL" /></label>
              <label>Category <select value={portalForm.category} onChange={(event) => updatePortalForm('category', event.target.value)}>{CATEGORY_ORDER.filter((category) => category !== 'Collections').map((category) => <option key={category}>{category}</option>)}</select></label></div>
            <label>Why keep it? <textarea value={portalForm.description} onChange={(event) => updatePortalForm('description', event.target.value)} placeholder="A short note makes future retrieval much better." rows={3} /></label>
            {portalNotice && <p className={portalNotice.startsWith('Added') ? 'portal-notice is-success' : 'portal-notice'}>{portalNotice.startsWith('Added') && <Check size={15} />}{portalNotice}</p>}
            <div className="portal-actions"><button type="button" onClick={() => setPortalOpen(false)}>Cancel</button><button className="submit-link" type="submit">Add to atlas <ArrowUpRight size={16} /></button></div>
          </form>
        </section>
      </div>}
    </main>
  )
}

function LinkCard({ link, score, index }: { link: AtlasLink; score: number; index: number }) {
  return <article className={`link-card ${categoryClass(link.category)}`} style={{ '--index': index } as React.CSSProperties}>
    <div className="card-top"><span className="link-index">{String(index + 1).padStart(2, '0')}</span><span className="category-label">{link.category}</span></div>
    <div className="card-main"><h3>{link.title}</h3><p>{link.description}</p></div>
    <div className="card-tags">{link.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
    <div className="card-bottom">
      <div className="source-line"><BookOpen size={13} /><span>Via&nbsp;</span>{link.sources.map((source, sourceIndex) => source.url ? <a key={`${source.name}-${source.url}`} href={source.url} target="_blank" rel="noreferrer">{source.name}{sourceIndex < link.sources.length - 1 ? ', ' : ''}</a> : <span key={source.name}>{source.name}{sourceIndex < link.sources.length - 1 ? ', ' : ''}</span>)}</div>
      <a className="visit-link" href={link.url} target="_blank" rel="noreferrer" aria-label={`Visit ${link.title}`}><ExternalLink size={16} /></a>
    </div>
    {score > 0 && <span className="match-dot" title="Context match" />}
  </article>
}
