import { ArrowUpRight, Command as CommandIcon, ExternalLink, Plus, Search } from 'lucide-react'
import { Command } from 'cmdk'
import { useEffect, useMemo, useState } from 'react'
import { COLLECTION_LINKS } from './data/atlas'
import { mergeLinks, scoreLinkForQuery, type AtlasLink } from './lib/links'
import { loadOnlineLinks, onlineStoreConfigured } from './lib/remote-store'

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

function publicDescription(link: AtlasLink) {
  const cleaned = link.description.replace(/\s*Collected via .+$/gi, '').trim()
  return cleaned || `A curated ${link.category.toLowerCase()} resource from Signal Atlas.`
}

function displayName(link: AtlasLink, nearbyLinks: AtlasLink[]) {
  const hasSiblingOnSameSite = nearbyLinks.some((candidate) => candidate.id !== link.id && candidate.title === link.title && domainFor(candidate.url) === domainFor(link.url))
  if (!hasSiblingOnSameSite) return link.title
  const path = new URL(link.url).pathname.split('/').filter(Boolean).at(-1)
  return `${link.title} — ${path ? path.replace(/[-_]/g, ' ') : 'home'}`
}

function PixelScout() {
  return <div className="pixel-scout" aria-hidden="true"><span className="pixel-star star-one" /><span className="pixel-star star-two" /><span className="pixel-scout-antenna" /><span className="pixel-scout-ear left" /><span className="pixel-scout-ear right" /><span className="pixel-scout-head"><i className="pixel-eye left" /><i className="pixel-eye right" /><b /></span><span className="pixel-scout-body"><i /><i /></span><span className="pixel-scout-shadow" /></div>
}

export default function App() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [commandOpen, setCommandOpen] = useState(false)
  const [remoteLinks, setRemoteLinks] = useState<AtlasLink[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(48)

  useEffect(() => {
    if (!onlineStoreConfigured) return
    loadOnlineLinks().then(setRemoteLinks).catch(() => undefined)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const links = useMemo(() => mergeLinks(COLLECTION_LINKS, remoteLinks), [remoteLinks])
  const categories = useMemo(() => ['All', ...Array.from(new Set(links.map((link) => link.category))).sort()], [links])
  const results = useMemo(() => links
    .filter((link) => activeCategory === 'All' || link.category === activeCategory)
    .map((link) => ({ link, score: scoreLinkForQuery(link, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.link.title.localeCompare(b.link.title))
    .map(({ link }) => link), [activeCategory, links, query])
  const hoveredLink = results.find((link) => link.id === hoveredId) ?? results[0] ?? null
  const visibleResults = results.slice(0, visibleCount)

  useEffect(() => {
    setVisibleCount(48)
  }, [activeCategory, query])

  return <main className="atlas-shell" id="directory">
    <header className="site-header">
      <a className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Signal<br />Atlas</span></a>
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
      <div className="scout-stage"><PixelScout /><p>Scout’s currently<br />looking for <em>good stuff.</em></p></div>
    </section>

    <section className="directory-intro">
      <div><p className="eyebrow">The directory</p><h2>One line per place.</h2></div>
      <p>Hover or focus a listing to inspect it. The full context lives in the preview, leaving the index calm and scannable.</p>
    </section>

    <nav className="filter-row" aria-label="Filter links by category">
      {categories.map((category) => <button className={category === activeCategory ? 'is-active' : ''} key={category} onClick={() => setActiveCategory(category)}>{category}</button>)}
    </nav>

    <section className="collection-layout" aria-label="Link collection">
      <div className="link-index">
        <div className="index-header"><span>{results.length} result{results.length === 1 ? '' : 's'}</span><span>Hover a line to inspect <ArrowUpRight size={14} /></span></div>
        <ol className="resource-lines">
          {visibleResults.map((link, index) => <li key={link.id} className={hoveredLink?.id === link.id ? 'is-hovered' : ''}>
            <button className="resource-line" onMouseEnter={() => setHoveredId(link.id)} onFocus={() => setHoveredId(link.id)} onClick={() => setHoveredId(link.id)} aria-label={`Preview ${link.title}`}>
              <span className="line-number">{String(index + 1).padStart(3, '0')}</span>
              <span className="line-name">{displayName(link, results)}</span>
              <span className="line-domain">{domainFor(link.url)}</span>
              <span className="line-arrow" aria-hidden="true">↗</span>
            </button>
          </li>)}
        </ol>
        {!results.length && <div className="empty-state"><p>No exact signal yet.</p><button onClick={() => { setQuery(''); setActiveCategory('All') }}>Reset the directory</button></div>}
        {visibleResults.length < results.length && <button className="load-more" onClick={() => setVisibleCount((count) => count + 48)}>Load 48 more <Plus size={15} /></button>}
      </div>
      <PreviewPanel link={hoveredLink} />
    </section>

    <section className="provenance" id="sources">
      <div><p className="eyebrow">Provenance, once</p><h2>Curated in public.</h2></div>
      <div><p>Every imported resource retains its source data, while the directory stays intentionally quiet. The original collection came from your supplied Arc links; additional routes were discovered from these curation hubs.</p><ul>{SOURCE_HUBS.map((source) => <li key={source.name}><a href={source.url} target={source.url.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{source.name} <ArrowUpRight size={13} /></a></li>)}</ul></div>
    </section>

    <footer className="site-footer"><span>Signal Atlas / living index</span><span>{onlineStoreConfigured ? 'Online collection enabled' : 'Static collection + online-ready store'}</span><a href="/manage">Manage collection <ArrowUpRight size={14} /></a></footer>

    <Command.Dialog className="command-dialog" open={commandOpen} onOpenChange={setCommandOpen} label="Search Signal Atlas">
      <div className="command-box"><div className="command-input-wrap"><Search size={17} /><Command.Input value={query} onValueChange={setQuery} placeholder="Try “creative coding”, “avatar generator”, or “agent UI”…" autoFocus /></div><Command.List>{results.slice(0, 10).map((link) => <Command.Item key={link.id} value={`${link.title} ${link.category} ${link.tags.join(' ')}`} onSelect={() => { setHoveredId(link.id); setCommandOpen(false); document.querySelector('.collection-layout')?.scrollIntoView({ behavior: 'smooth' }) }}><span><b>{link.title}</b><small>{link.category} · {link.description}</small></span><ArrowUpRight size={16} /></Command.Item>)}{!results.length && <Command.Empty>No matching links.</Command.Empty>}</Command.List><div className="command-footer"><span>↵ to focus a result</span><span>esc to close</span><span><kbd>⌘ K</kbd> from anywhere</span></div></div>
    </Command.Dialog>
  </main>
}

function PreviewPanel({ link }: { link: AtlasLink | null }) {
  if (!link) return <aside className="preview-panel preview-empty"><p>Hover a link to open its field note.</p></aside>
  return <aside className="preview-panel" aria-live="polite">
    <div className="preview-label"><span>Live site preview</span><span>{domainFor(link.url)}</span></div>
    <div className="preview-window" key={link.id}><iframe title={`Preview of ${link.title}`} src={link.url} sandbox="allow-scripts allow-forms allow-popups" referrerPolicy="no-referrer" loading="lazy" /><div className="preview-fallback">Some sites block embedded previews. <a href={link.url} target="_blank" rel="noreferrer">Open {link.title} instead <ExternalLink size={13} /></a></div></div>
    <div className="preview-content"><div className="preview-heading"><p className="eyebrow">{link.category}</p><a href={link.url} target="_blank" rel="noreferrer">{link.title} <ArrowUpRight size={16} /></a></div><p>{publicDescription(link)}</p><div className="preview-tags">{link.tags.slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div></div>
  </aside>
}
