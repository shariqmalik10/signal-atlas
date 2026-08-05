import { describe, expect, it } from 'vitest'
import { canonicalizeUrl, mergeLinks, scoreLinkForQuery, type AtlasLink } from './links'

const links: AtlasLink[] = [
  {
    id: 'dicebear',
    title: 'DiceBear',
    url: 'https://www.dicebear.com/',
    category: 'Tools',
    description: 'Open source avatar library and API.',
    tags: ['avatar', 'generator', 'identity', 'api'],
    sources: [{ name: 'Your Arc collection', url: '' }],
  },
  {
    id: 'mobbin',
    title: 'Mobbin',
    url: 'https://mobbin.com/',
    category: 'Inspiration',
    description: 'A product interface reference library.',
    tags: ['reference', 'product', 'mobile', 'ui inspiration'],
    sources: [{ name: 'Design Engineer Tools', url: 'https://designengineer.tools/' }],
  },
]

describe('canonicalizeUrl', () => {
  it('removes tracking parameters and normalizes a host plus trailing slash', () => {
    expect(canonicalizeUrl('HTTPS://www.DiceBear.com/?utm_source=atlas#readme')).toBe('https://dicebear.com/')
  })
})

describe('scoreLinkForQuery', () => {
  it('retrieves an avatar resource from a contextual request', () => {
    expect(scoreLinkForQuery(links[0], 'need a character avatar generator')).toBeGreaterThan(0)
    expect(scoreLinkForQuery(links[0], 'need a character avatar generator')).toBeGreaterThan(
      scoreLinkForQuery(links[1], 'need a character avatar generator'),
    )
  })

  it('retrieves a product reference library for inspiration intent', () => {
    expect(scoreLinkForQuery(links[1], 'show me product ui inspiration')).toBeGreaterThan(0)
  })
})

describe('mergeLinks', () => {
  it('keeps one normalized URL while retaining both source citations', () => {
    const result = mergeLinks([links[0]], [{ ...links[0], url: 'https://dicebear.com/?utm_source=directory', sources: [{ name: 'Design Engineer Tools', url: 'https://designengineer.tools/' }] }])

    expect(result).toHaveLength(1)
    expect(result[0].sources.map((source) => source.name)).toEqual(['Your Arc collection', 'Design Engineer Tools'])
  })
})
