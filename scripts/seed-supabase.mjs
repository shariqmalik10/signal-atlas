import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for this one-time server-side import. Never put the service-role key in .env.local or browser code.')
}

const source = await readFile(new URL('../src/data/atlas.ts', import.meta.url), 'utf8')
const collection = JSON.parse(source.split('export const COLLECTION_LINKS: AtlasLink[] = ', 1)[1])
const supabase = createClient(url, serviceRoleKey)
const rows = collection.map((link) => ({
  id: link.id,
  title: link.title,
  url: link.url,
  category: link.category,
  description: link.description,
  tags: link.tags,
  sources: link.sources,
  added_by: 'collection',
}))

for (let start = 0; start < rows.length; start += 100) {
  const batch = rows.slice(start, start + 100)
  const { error } = await supabase.from('atlas_links').upsert(batch, { onConflict: 'url' })
  if (error) throw error
  console.log(`Imported ${Math.min(start + batch.length, rows.length)} of ${rows.length} links.`)
}

console.log(`Signal Atlas seed complete: ${rows.length} links are stored online.`)
