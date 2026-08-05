import { createClient, type Session } from '@supabase/supabase-js'
import type { AtlasLink, Source } from './links'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const onlineStoreConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = onlineStoreConfigured ? createClient(supabaseUrl!, supabaseAnonKey!) : null

type AtlasLinkRow = {
  id: string
  title: string
  url: string
  category: string
  description: string
  tags: string[]
  sources: Source[]
  added_by: 'collection' | 'portal'
}

function asSources(value: unknown): Source[] {
  if (!Array.isArray(value)) return []
  return value.filter((source): source is Source => {
    return Boolean(source) && typeof source === 'object' && 'name' in source && typeof source.name === 'string' && 'url' in source && typeof source.url === 'string'
  })
}

function fromRow(row: AtlasLinkRow): AtlasLink {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    category: row.category,
    description: row.description,
    tags: Array.isArray(row.tags) ? row.tags : [],
    sources: asSources(row.sources),
    addedBy: row.added_by,
  }
}

export async function loadOnlineLinks(): Promise<AtlasLink[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('atlas_links').select('id,title,url,category,description,tags,sources,added_by').order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as AtlasLinkRow[]).map(fromRow)
}

export async function saveOnlineLink(link: AtlasLink): Promise<void> {
  if (!supabase) throw new Error('Online storage is not configured yet.')
  const { error } = await supabase.from('atlas_links').upsert({
    id: link.id,
    title: link.title,
    url: link.url,
    category: link.category,
    description: link.description,
    tags: link.tags,
    sources: link.sources,
    added_by: 'portal',
  }, { onConflict: 'url' })
  if (error) throw error
}

export async function getPortalSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function sendMagicLink(email: string): Promise<void> {
  if (!supabase) throw new Error('Online storage is not configured yet.')
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/manage` },
  })
  if (error) throw error
}

export async function signOutPortal(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
