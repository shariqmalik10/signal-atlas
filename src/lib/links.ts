export type Source = {
  name: string
  url: string
}

export type AtlasLink = {
  id: string
  title: string
  url: string
  category: string
  description: string
  tags: string[]
  sources: Source[]
  addedBy?: 'collection' | 'portal'
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'for', 'from', 'i', 'in', 'is', 'me', 'need', 'of', 'on', 'show', 'the', 'to', 'with', 'you',
])

const SYNONYMS: Record<string, string[]> = {
  agent: ['ai', 'automation', 'llm', 'copilot'],
  ai: ['agent', 'automation', 'llm', 'copilot'],
  animation: ['motion', 'easing', 'transition', 'interaction'],
  avatar: ['identity', 'face', 'character', 'generator'],
  brand: ['branding', 'identity', 'logo'],
  components: ['component', 'ui', 'react', 'library'],
  component: ['components', 'ui', 'react', 'library'],
  design: ['ui', 'interface', 'product', 'visual'],
  developer: ['engineering', 'code', 'frontend'],
  engineer: ['engineering', 'code', 'frontend'],
  inspiration: ['reference', 'gallery', 'showcase', 'collection'],
  interface: ['ui', 'product', 'interaction'],
  motion: ['animation', 'easing', 'transition', 'interaction'],
  portfolio: ['people', 'studio', 'creative'],
  product: ['interface', 'ui', 'app', 'mobile'],
  tools: ['tool', 'generator', 'utility', 'playground'],
  tool: ['tools', 'generator', 'utility', 'playground'],
}

export function canonicalizeUrl(input: string): string {
  const candidate = input.trim().match(/^https?:\/\//i) ? input.trim() : `https://${input.trim()}`
  const url = new URL(candidate)
  url.protocol = url.protocol.toLowerCase()
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '')
  url.hash = ''

  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|ref$)/i.test(key)) url.searchParams.delete(key)
  }

  if (!url.pathname) url.pathname = '/'
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '')
  return url.toString()
}

export function makeLinkId(url: string): string {
  return canonicalizeUrl(url)
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function normalizeWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
}

export function scoreLinkForQuery(link: AtlasLink, query: string): number {
  const queryWords = normalizeWords(query)
  if (!queryWords.length) return 1

  const haystack = `${link.title} ${link.category} ${link.description} ${link.tags.join(' ')} ${link.url}`.toLowerCase()
  let score = 0

  for (const word of queryWords) {
    if (haystack.includes(word)) score += 14
    for (const synonym of SYNONYMS[word] ?? []) {
      if (haystack.includes(synonym)) score += 5
    }
  }

  const phrase = queryWords.join(' ')
  if (phrase.length > 3 && haystack.includes(phrase)) score += 18
  return score
}

export function mergeLinks(seed: AtlasLink[], additions: AtlasLink[]): AtlasLink[] {
  const byCanonicalUrl = new Map<string, AtlasLink>()

  for (const item of [...seed, ...additions]) {
    const url = canonicalizeUrl(item.url)
    const existing = byCanonicalUrl.get(url)
    if (!existing) {
      byCanonicalUrl.set(url, { ...item, id: makeLinkId(url), url })
      continue
    }

    const mergedSources = [...existing.sources]
    for (const source of item.sources) {
      if (!mergedSources.some((candidate) => candidate.name === source.name && candidate.url === source.url)) {
        mergedSources.push(source)
      }
    }

    existing.sources = mergedSources
    existing.tags = [...new Set([...existing.tags, ...item.tags])]
  }

  return [...byCanonicalUrl.values()]
}
