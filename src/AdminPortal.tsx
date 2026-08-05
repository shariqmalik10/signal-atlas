import { ArrowLeft, ArrowUpRight, Check, Cloud, KeyRound, LogOut, Plus, ShieldCheck } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { COLLECTION_LINKS } from './data/atlas'
import { canonicalizeUrl, makeLinkId, mergeLinks, type AtlasLink } from './lib/links'
import { getPortalSession, loadOnlineLinks, onlineStoreConfigured, saveOnlineLink, sendMagicLink, signOutPortal } from './lib/remote-store'

const categories = ['Inspiration', 'Components', 'Motion & effects', 'Tools', 'AI & agents', 'Reading', 'Portfolios']

type FormState = { url: string; title: string; description: string; category: string }
const blankForm: FormState = { url: '', title: '', description: '', category: 'Tools' }

function titleFromUrl(url: string): string {
  return new URL(url)
    .hostname
    .replace(/^www\./, '')
    .split('.')[0]
    .split(/[-_]/)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function AdminPortal() {
  const [remoteLinks, setRemoteLinks] = useState<AtlasLink[]>([])
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(blankForm)
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(onlineStoreConfigured)
  const allLinks = useMemo(() => mergeLinks(COLLECTION_LINKS, remoteLinks), [remoteLinks])

  useEffect(() => {
    if (!onlineStoreConfigured) return
    Promise.all([getPortalSession(), loadOnlineLinks()])
      .then(([session, links]) => {
        setSessionEmail(session?.user.email ?? null)
        setRemoteLinks(links)
      })
      .catch(() => setNotice('The public directory is available, but the online connection could not be reached.'))
      .finally(() => setLoading(false))
  }, [])

  async function requestLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    try {
      await sendMagicLink(email)
      setNotice('Check your inbox for the secure magic link. Return here to manage the atlas.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not send the magic link.')
    }
  }

  async function addLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    if (!sessionEmail) {
      setNotice('Sign in with your approved email before adding a link.')
      return
    }

    let url: string
    try {
      url = canonicalizeUrl(form.url)
    } catch {
      setNotice('Enter a complete URL, for example https://example.com.')
      return
    }
    if (allLinks.some((link) => canonicalizeUrl(link.url) === url)) {
      setNotice('That link is already in the atlas, so it was not added twice.')
      return
    }

    const link: AtlasLink = {
      id: makeLinkId(url),
      title: form.title.trim() || titleFromUrl(url),
      url,
      category: form.category,
      description: form.description.trim() || 'Added through the Signal Atlas management portal.',
      tags: [form.category.toLowerCase(), 'community atlas', 'new addition'],
      sources: [{ name: 'Signal Atlas management portal', url: '' }],
      addedBy: 'portal',
    }

    try {
      await saveOnlineLink(link)
      setRemoteLinks((links) => [link, ...links])
      setForm(blankForm)
      setNotice('Published. The link is now visible in the public atlas.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not publish the link.')
    }
  }

  async function signOut() {
    await signOutPortal()
    setSessionEmail(null)
    setNotice('Signed out of the management portal.')
  }

  return <main className="manager-shell">
    <header className="manager-header">
      <a className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Signal<br />Atlas</span></a>
      <a className="return-link" href="/"><ArrowLeft size={15} /> Public atlas</a>
    </header>

    <section className="manager-hero">
      <p className="eyebrow"><span /> Private management portal</p>
      <h1>Keep the public<br /><em>signal clean.</em></h1>
      <p>New entries are written to the shared online atlas. Public visitors browse without an account; only approved administrators can publish.</p>
      <div className="manager-stats"><span><Cloud size={14} /> {onlineStoreConfigured ? 'Supabase connected' : 'Supabase needs configuration'}</span><span><ShieldCheck size={14} /> {allLinks.length} indexed links</span></div>
    </section>

    <section className="manager-content" aria-label="Atlas management controls">
      {!onlineStoreConfigured ? <ConnectionGuide /> : !sessionEmail ? <LoginCard email={email} notice={notice} setEmail={setEmail} submit={requestLogin} /> : <PublishCard form={form} notice={notice} setForm={setForm} submit={addLink} email={sessionEmail} signOut={signOut} />}
      <aside className="manager-notes">
        <p className="eyebrow">Publishing rules</p>
        <ol><li><span>01</span> URLs are normalized before saving, so duplicate URLs cannot enter twice.</li><li><span>02</span> Public reads are enabled; database writes are restricted by Supabase row-level security.</li><li><span>03</span> The public list merges new online links with the original curated collection.</li></ol>
      </aside>
    </section>
  </main>
}

function ConnectionGuide() {
  return <section className="manager-card connection-card">
    <div className="manager-card-icon"><Cloud size={23} /></div>
    <p className="eyebrow">One-time setup</p>
    <h2>Connect the shared store.</h2>
    <p>Supabase is wired into the app but no project credentials are present in this workspace yet. Once configured, this route becomes the protected publisher while the main atlas reads the same online records.</p>
    <ol className="setup-list"><li><b>1</b>Create a Supabase project.</li><li><b>2</b>Run <code>supabase/schema.sql</code> in its SQL editor.</li><li><b>3</b>Add the public project URL and anon key from <code>.env.example</code> to <code>.env.local</code>.</li><li><b>4</b>Sign in here once, then grant your user ID admin access using the included SQL note.</li></ol>
  </section>
}

function LoginCard({ email, notice, setEmail, submit }: { email: string; notice: string; setEmail: (value: string) => void; submit: (event: FormEvent<HTMLFormElement>) => Promise<void> }) {
  return <section className="manager-card login-card"><div className="manager-card-icon"><KeyRound size={23} /></div><p className="eyebrow">Administrator sign in</p><h2>Get a secure link.</h2><p>Use the email address you will grant access to in the Supabase <code>atlas_admins</code> table.</p><form onSubmit={submit}><label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>{notice && <p className="manager-notice">{notice}</p>}<button className="primary-button" type="submit">Send magic link <ArrowUpRight size={16} /></button></form></section>
}

function PublishCard({ form, notice, setForm, submit, email, signOut }: { form: FormState; notice: string; setForm: (next: FormState) => void; submit: (event: FormEvent<HTMLFormElement>) => Promise<void>; email: string; signOut: () => Promise<void> }) {
  function update<Key extends keyof FormState>(key: Key, value: FormState[Key]) { setForm({ ...form, [key]: value }) }
  return <section className="manager-card publish-card"><div className="account-line"><span><Check size={14} /> Signed in as {email}</span><button onClick={signOut}><LogOut size={14} /> Sign out</button></div><p className="eyebrow">Add a resource</p><h2>Publish a link.</h2><form onSubmit={submit}><label>URL<input required type="url" value={form.url} onChange={(event) => update('url', event.target.value)} placeholder="https://…" /></label><div className="manager-form-split"><label>Display name<input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Optional" /></label><label>Category<select value={form.category} onChange={(event) => update('category', event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label></div><label>Context<textarea rows={3} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Why is this link worth keeping?" /></label>{notice && <p className="manager-notice">{notice}</p>}<button className="primary-button" type="submit"><Plus size={16} /> Publish to public atlas</button></form></section>
}
