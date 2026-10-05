import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';

const base = '/api/v1/admin/research';
const keyName = 'floodtrace_staff_key';
const geographies = ['PRACHINBURI_LOCAL', 'EXTERNAL_CONTEXT', 'LOCATION_UNCONFIRMED', 'OUT_OF_SCOPE'];
const statuses = ['DISCOVERED', 'AI_TRIAGED', 'NEEDS_REVIEW', 'APPROVED_SOURCE', 'NEEDS_VERIFICATION', 'REJECTED', 'OUT_OF_SCOPE'];
type Candidate = {
  id: string; version: number; source_url: string; connector_kind: string; safe_title?: string;
  safe_excerpt?: string; safe_summary?: string; discovered_at: string; published_at?: string;
  retrieved_at?: string; event_date?: string; publisher?: string; source_status: string; source_reason?: string;
  geography: string; geography_supporting_text?: string; district?: string; subdistrict?: string; area?: string;
  relationship_rationale?: string; triage_status: string; review_decision?: string; review_note?: string;
  privacy_resolution_note?: string; reviewer_username?: string; reviewed_at?: string;
  evidence_classification: string; verification_state: string; ai_status: string; ai_reason?: string;
  ai_relevance_score?: number; ai_relevance_reasons: string[]; ai_suggestions: Record<string, unknown>;
  attributed_claims: { classification: string; source_quote: string }[]; privacy_legal_flags: string[];
  duplicate_group_id?: string; audit?: { id: string; action: string; actor_username: string; created_at: string }[];
};
type Capabilities = {
  connectors: { kind: string; availability: string; failure_reason?: string }[];
  ai_provider: { availability: string; reason?: string }; permitted_feeds: string[];
  geography_hints: { districts: string[]; subdistricts: string[]; waterways: string[]; limitation: string };
};
const field = 'rw-staff-field border rounded-lg p-2.5 w-full bg-white';
const button = 'rw-staff-button border rounded-lg px-3 py-2 disabled:opacity-40';
const when = (value?: string) => value ? new Date(value).toLocaleString() : 'Unknown';

export const ResearchInboxPage: React.FC = () => {
  const [key, setKey] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [profile, setProfile] = useState<{ username: string; permissions: { can_triage: boolean; can_verify: boolean } } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [items, setItems] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [url, setUrl] = useState('');
  const [filters, setFilters] = useState({ keyword: '', date_from: '', date_to: '', area: '', source_type: '', review_status: '', geography: '' });
  const [review, setReview] = useState({ note: '', geography: 'LOCATION_UNCONFIRMED', supporting_text: '', relationship_rationale: '', privacy_resolution_note: '' });

  function logout() {
    sessionStorage.removeItem(keyName);
    setKey(''); setKeyInput(''); setProfile(null); setCapabilities(null); setItems([]); setSelected(null);
  }
  async function request(path: string, body?: unknown, credential = key) {
    const response = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST', cache: 'no-store', credentials: 'omit',
      headers: { 'X-Admin-Key': credential, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401) logout();
      throw new Error(response.status === 403 ? 'Permission denied.' : response.status === 409
        ? 'Candidate changed. Reload the detail before reviewing again.' : result.error?.message || `Request failed (${response.status}).`);
    }
    return result;
  }
  async function perform(action: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Request unavailable.'); }
    finally { setBusy(false); }
  }
  async function login(credential: string) {
    const value = credential.trim();
    if (!value) throw new Error('Enter a staff access key.');
    const resolved = await request('/api/v1/admin/auth/me', undefined, value);
    sessionStorage.setItem(keyName, value); setKey(value); setProfile(resolved); setKeyInput('');
  }
  async function loadList(credential = key) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([name, value]) => { if (value) params.set(name, value); });
    const result = await request(`${base}/candidates?${params}`, undefined, credential);
    setItems(result.items); setTotal(result.total);
  }
  function choose(candidate: Candidate) {
    setSelected(candidate);
    setReview({ note: '', geography: candidate.geography, supporting_text: candidate.geography_supporting_text || '',
      relationship_rationale: candidate.relationship_rationale || '', privacy_resolution_note: candidate.privacy_resolution_note || '' });
  }
  async function detail(id: string) { choose(await request(`${base}/candidates/${encodeURIComponent(id)}`)); }
  useEffect(() => { const saved = sessionStorage.getItem(keyName); if (saved) void perform(() => login(saved)); }, []);
  useEffect(() => {
    if (key && profile) void perform(async () => { setCapabilities(await request(`${base}/connectors`)); await loadList(); });
  }, [key, profile]);
  async function decide(decision: string) {
    if (!selected) return;
    const payload: Record<string, unknown> = { expected_version: selected.version, decision, note: review.note };
    Object.entries(review).forEach(([name, value]) => { if (name !== 'note' && value.trim()) payload[name] = value; });
    await request(`${base}/candidates/${encodeURIComponent(selected.id)}/review`, payload);
    await detail(selected.id); await loadList(); setMessage('Review saved. Verification remains UNVERIFIED; nothing was published.');
  }

  return <main className="rw-page-shell space-y-4 text-slate-800">
    <PageHeader eyebrow="RUWAIGON · STAFF ONLY" title="Prachinburi Research Inbox"
      description="Internal source research. Approval means relevance only. Research never publishes automatically."
      actions={profile && <button className={button} onClick={logout}>Sign out ({profile.username})</button>} />
    {busy && <p role="status">Loading…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {message && <p role="status">{message}</p>}
    {!profile ? <form className="max-w-md space-y-3" onSubmit={e => { e.preventDefault(); void perform(() => login(keyInput)); }}>
      <label>Staff access key<input className={field} type="password" autoComplete="off" value={keyInput} onChange={e => setKeyInput(e.target.value)} /></label>
      <button className={button} disabled={busy}>Sign in</button>
    </form> : <>
      {capabilities && <section className="rw-card space-y-2" aria-label="Connector availability">
        <h2 className="font-semibold">Connectors and providers</h2>
        {capabilities.connectors.map(c => <p key={c.kind}>{c.kind}: {c.availability}{c.failure_reason && ` — ${c.failure_reason}`}</p>)}
        <p>AI triage: {capabilities.ai_provider.availability} {capabilities.ai_provider.reason}</p>
        <p className="text-sm">{capabilities.geography_hints.limitation}</p>
        <p className="text-sm">Waterway hints: {capabilities.geography_hints.waterways.join(', ') || 'Unavailable'}</p>
      </section>}
      <section className="rw-card space-y-3">
        <h2 className="font-semibold">Intake</h2>
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void perform(async () => {
          const result = await request(`${base}/intake`, { url }); await detail(result.candidate.id); await loadList();
          setMessage(result.created ? 'Candidate retained for review.' : 'Existing candidate retained.');
        }); }}>
          <label className="flex-1">Paste public URL<input className={field} type="url" required value={url} onChange={e => setUrl(e.target.value)} /></label>
          <button className={button} disabled={busy || !profile.permissions.can_triage}>Intake</button>
        </form>
        <button className={button} disabled={busy || !profile.permissions.can_triage || !capabilities?.permitted_feeds.length}
          onClick={() => void perform(async () => { const result = await request(`${base}/discover`, {}); await loadList(); setMessage(JSON.stringify(result)); })}>
          Discover from permitted RSS feeds</button>
        {!profile.permissions.can_triage && <p>Intake and triage permission denied.</p>}
      </section>
      <form className="grid sm:grid-cols-3 gap-3" onSubmit={e => { e.preventDefault(); void perform(() => loadList()); }}>
        <label>Keyword<input className={field} value={filters.keyword} onChange={e => setFilters({ ...filters, keyword: e.target.value })} /></label>
        <label>Discovered from<input className={field} type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} /></label>
        <label>Discovered through<input className={field} type="date" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} /></label>
        <label>Prachinburi area (source label)<input className={field} list="research-areas" value={filters.area} onChange={e => setFilters({ ...filters, area: e.target.value })} /></label>
        <datalist id="research-areas">{[...(capabilities?.geography_hints.districts || []), ...(capabilities?.geography_hints.subdistricts || [])].map(a => <option key={a} value={a} />)}</datalist>
        <label>Source type<select className={field} value={filters.source_type} onChange={e => setFilters({ ...filters, source_type: e.target.value })}><option value="">All</option>{['MANUAL_PUBLIC_URL', 'RSS'].map(s => <option key={s}>{s}</option>)}</select></label>
        <label>Review status<select className={field} value={filters.review_status} onChange={e => setFilters({ ...filters, review_status: e.target.value })}><option value="">All</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></label>
        <label>Geography<select className={field} value={filters.geography} onChange={e => setFilters({ ...filters, geography: e.target.value })}><option value="">All</option>{geographies.map(s => <option key={s}>{s}</option>)}</select></label>
        <button className={button} disabled={busy}>Search</button>
      </form>
      <div className="grid xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4">
        <section aria-label="Candidates" className="space-y-3"><h2 className="font-semibold">Candidates ({total}; showing up to 50)</h2>
          {!busy && !items.length && <p>No candidates match.</p>}
          {items.map(c => <button key={c.id} className="block w-full border rounded p-3 text-left" disabled={busy} onClick={() => void perform(() => detail(c.id))}>
            <strong>{c.safe_title || 'Untitled source'}</strong><p className="break-all">{c.source_url}</p>
            <p>{c.connector_kind} · {when(c.discovered_at)} · {c.geography}</p>
            <p>Relevance: {c.ai_relevance_score ?? 'Unavailable'} / 100 · {c.triage_status}</p>
          </button>)}
        </section>
        {selected && <section className="rw-card space-y-3 break-words" aria-label="Candidate detail">
          <h2 className="font-semibold">{selected.safe_title || 'Untitled source'}</h2>
          <a className="underline break-all" href={selected.source_url} target="_blank" rel="noopener noreferrer">Original source</a>
          <p>Publisher: {selected.publisher || 'Unknown'} · {selected.connector_kind}</p>
          <p>Discovered: {when(selected.discovered_at)} · Retrieved: {when(selected.retrieved_at)} · Published: {when(selected.published_at)}</p>
          <p>Event date: {selected.event_date || 'Unknown'}</p>
          <p>Source: {selected.source_status} {selected.source_reason} · Evidence: {selected.evidence_classification} · {selected.verification_state}</p>
          <p>Geography: {selected.geography} — {selected.geography_supporting_text || 'Unconfirmed'}</p>
          <p>Area: {[selected.district, selected.subdistrict, selected.area].filter(Boolean).join(', ') || 'Unknown'}</p>
          <p>AI: {selected.ai_status} {selected.ai_reason} · Relevance: {selected.ai_relevance_score ?? 'Unavailable'} / 100 (not truth confidence)</p>
          <ul>{selected.ai_relevance_reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
          <p>Summary: {selected.safe_summary || 'Unavailable'}</p>
          <details><summary>Unverified source excerpt</summary><p className="whitespace-pre-wrap">{selected.safe_excerpt || 'Unavailable'}</p></details>
          <p>AI suggestions (unconfirmed): {JSON.stringify(selected.ai_suggestions)}</p>
          {selected.attributed_claims.map((claim, i) => <p key={i}>{claim.classification}: “{claim.source_quote}”</p>)}
          <p>Privacy/legal review: {selected.privacy_legal_flags.join(', ') || 'No automatic flags; human review still required'}</p>
          <p>Duplicate group: {selected.duplicate_group_id || 'Unknown'}</p>
          <p>Review: {selected.review_decision || 'Pending'} · {selected.reviewer_username || 'No reviewer'} · {when(selected.reviewed_at)}</p>
          <p>{selected.review_note}</p>
          <button className={button} disabled={busy} onClick={() => void perform(() => detail(selected.id))}>Reload detail</button>
          <button className={button} disabled={busy || !profile.permissions.can_triage || !!selected.review_decision}
            onClick={() => void perform(async () => { await request(`${base}/candidates/${encodeURIComponent(selected.id)}/triage`, { expected_version: selected.version }); await detail(selected.id); await loadList(); })}>Run AI triage</button>
          {!profile.permissions.can_verify ? <p>Review permission denied.</p> : <div className="space-y-2">
            <label>Geography<select className={field} value={review.geography} onChange={e => setReview({ ...review, geography: e.target.value })}>{geographies.map(g => <option key={g}>{g}</option>)}</select></label>
            <label>Exact supporting source text<textarea className={field} value={review.supporting_text} onChange={e => setReview({ ...review, supporting_text: e.target.value })} /></label>
            <label>External relationship rationale<textarea className={field} value={review.relationship_rationale} onChange={e => setReview({ ...review, relationship_rationale: e.target.value })} /></label>
            <label>Privacy/legal resolution<textarea className={field} value={review.privacy_resolution_note} onChange={e => setReview({ ...review, privacy_resolution_note: e.target.value })} /></label>
            <label>Review note (required)<textarea className={field} maxLength={2000} value={review.note} onChange={e => setReview({ ...review, note: e.target.value })} /></label>
            <div className="flex flex-wrap gap-2">{[['APPROVE_SOURCE', 'Approve source (research only)'], ['NEEDS_VERIFICATION', 'Needs verification'], ['REJECT', 'Reject']].map(([decision, label]) =>
              <button className={button} key={decision} disabled={busy || !review.note.trim()} onClick={() => void perform(() => decide(decision))}>{label}</button>)}</div>
          </div>}
          <details><summary>Review history</summary>{selected.audit?.map(a => <p key={a.id}>{when(a.created_at)} · {a.actor_username} · {a.action}</p>)}</details>
        </section>}
      </div>
    </>}
  </main>;
};
