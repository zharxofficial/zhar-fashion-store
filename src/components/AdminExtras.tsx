import React, { useEffect, useRef, useState } from 'react';
import { uploadMedia, deleteMedia } from '../lib/media.ts';
import { Order } from '../types/index.ts';

const inp = 'w-full bg-black border border-neutral-800 p-2.5 text-white text-xs font-mono';
const lbl = 'block text-[10px] uppercase tracking-wider text-neutral-400 mb-1';
const btn = 'px-4 py-2 bg-neutral-800 text-white text-xs uppercase tracking-wider hover:bg-neutral-700 disabled:opacity-50 transition-colors';
const hdr = (t: string) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` });

type Folder = 'products' | 'banners' | 'video' | 'promo' | 'logo';

export const MediaUploadButton: React.FC<{
  token: string; folder: Folder; label: string; accept?: string; multiple?: boolean; onUploaded: (url: string) => void;
}> = ({ token, folder, label, accept = 'image/jpeg,image/png,image/webp,image/avif', multiple, onUploaded }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true); setErr('');
    try { for (const f of files) onUploaded(await uploadMedia(f, folder, token)); }
    catch (x: any) { setErr(x.message || 'Upload failed.'); }
    finally { setBusy(false); }
  };
  return (
    <div>
      <input ref={ref} type="file" hidden multiple={multiple} accept={accept} onChange={pick} />
      <button type="button" disabled={busy} className={btn} onClick={() => ref.current?.click()}>{busy ? 'Uploading…' : label}</button>
      {err && <p className="text-red-400 text-[11px] mt-1">{err}</p>}
    </div>
  );
};

export const CategoriesTab: React.FC<{ token: string; onChanged?: () => void }> = ({ token, onChanged }) => {
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const load = async () => { const r = await fetch('/api/categories'); if (r.ok) setCats(await r.json()); };
  useEffect(() => { load(); }, []);
  const call = async (method: string, url: string, body?: object) => {
    setMsg('');
    const r = await fetch(url, { method, headers: hdr(token), body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(j.error || 'Action failed.'); else { await load(); onChanged?.(); }
  };
  return (
    <div className="space-y-4 max-w-xl text-xs">
      <h2 className="text-xl font-serif-luxury uppercase tracking-wider">Categories</h2>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (name.trim()) { call('POST', '/api/admin/categories', { name }); setName(''); } }}>
        <input className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="New category name" maxLength={60} />
        <button className={btn}>Add</button>
      </form>
      {msg && <p className="text-red-400">{msg}</p>}
      <ul className="divide-y divide-neutral-900 border border-neutral-900">
        {cats.map(c => (
          <li key={c.id} className="flex items-center gap-2 p-2">
            <input className={inp} defaultValue={c.name} maxLength={60} onBlur={e => { const v = e.target.value.trim(); if (v && v !== c.name) call('PUT', `/api/admin/categories/${c.id}`, { name: v }); }} />
            <button type="button" className={btn} onClick={() => { if (confirm(`Delete "${c.name}"?`)) call('DELETE', `/api/admin/categories/${c.id}`); }}>Delete</button>
          </li>
        ))}
        {!cats.length && <li className="p-4 text-neutral-500">No categories yet.</li>}
      </ul>
      <p className="text-neutral-500">Rename by editing the text and clicking away. A category with products cannot be deleted.</p>
    </div>
  );
};

const ImageField: React.FC<{ token: string; folder: Folder; label: string; value: string; onChange: (v: string) => void }> = ({ token, folder, label, value, onChange }) => (
  <div>
    <label className={lbl}>{label}</label>
    {value && <img src={value} alt="" className="h-24 object-cover mb-2 border border-neutral-800" />}
    <div className="flex gap-2 flex-wrap">
      <MediaUploadButton token={token} folder={folder} label={value ? 'Replace image' : 'Upload image'} onUploaded={async u => { const old = value; onChange(u); await deleteMedia(old, token); }} />
      {value && <button type="button" className={btn} onClick={async () => { await deleteMedia(value, token); onChange(''); }}>Remove</button>}
    </div>
  </div>
);

export const ContentTab: React.FC<{ token: string; onSaved?: () => void }> = ({ token, onSaved }) => {
  const [s, setS] = useState<any>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { fetch('/api/settings').then(r => r.json()).then(setS); }, []);
  if (!s) return <p className="text-xs text-neutral-500">Loading…</p>;
  const set = (k: string, sub: string | null, v: string) => setS((p: any) => (sub ? { ...p, [k]: { ...(p[k] || {}), [sub]: v } } : { ...p, [k]: v }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('');
    const r = await fetch('/api/admin/settings', {
      method: 'PUT', headers: hdr(token),
      body: JSON.stringify({ homepageBanner: s.homepageBanner, promo: s.promo, contact: s.contact, jazzcashInstructions: s.jazzcashInstructions, easypaisaInstructions: s.easypaisaInstructions })
    });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? 'Saved.' : j.error || 'Could not save.'); if (r.ok) onSaved?.();
  };
  const b = s.homepageBanner || {}, p = s.promo || {}, c = s.contact || {};
  return (
    <form onSubmit={save} className="space-y-6 max-w-2xl text-xs">
      <h2 className="text-xl font-serif-luxury uppercase tracking-wider">Homepage Content & Contact</h2>
      <fieldset className="space-y-3 border border-neutral-900 p-4"><legend className={lbl}>Homepage banner</legend>
        <ImageField token={token} folder="banners" label="Banner image" value={b.imageUrl || ''} onChange={v => set('homepageBanner', 'imageUrl', v)} />
        <div><label className={lbl}>Title</label><input className={inp} maxLength={120} value={b.title || ''} onChange={e => set('homepageBanner', 'title', e.target.value)} /></div>
        <div><label className={lbl}>Subtitle</label><input className={inp} maxLength={240} value={b.subtitle || ''} onChange={e => set('homepageBanner', 'subtitle', e.target.value)} /></div>
      </fieldset>
      <fieldset className="space-y-3 border border-neutral-900 p-4"><legend className={lbl}>Promotional section</legend>
        <ImageField token={token} folder="promo" label="Promo image" value={p.imageUrl || ''} onChange={v => set('promo', 'imageUrl', v)} />
        <div><label className={lbl}>Title</label><input className={inp} maxLength={120} value={p.title || ''} onChange={e => set('promo', 'title', e.target.value)} /></div>
        <div><label className={lbl}>Text</label><textarea className={inp} rows={3} maxLength={600} value={p.text || ''} onChange={e => set('promo', 'text', e.target.value)} /></div>
      </fieldset>
      <fieldset className="space-y-3 border border-neutral-900 p-4"><legend className={lbl}>Store contact</legend>
        <div><label className={lbl}>Email</label><input className={inp} type="email" value={c.email || ''} onChange={e => set('contact', 'email', e.target.value)} /></div>
        <div><label className={lbl}>Phone</label><input className={inp} value={c.phone || ''} onChange={e => set('contact', 'phone', e.target.value)} /></div>
        <div><label className={lbl}>Address</label><input className={inp} maxLength={300} value={c.address || ''} onChange={e => set('contact', 'address', e.target.value)} /></div>
      </fieldset>
      <fieldset className="space-y-3 border border-neutral-900 p-4"><legend className={lbl}>Payment instructions shown at checkout</legend>
        <div><label className={lbl}>JazzCash</label><textarea className={inp} rows={2} maxLength={600} value={s.jazzcashInstructions || ''} onChange={e => set('jazzcashInstructions', null, e.target.value)} /></div>
        <div><label className={lbl}>Easypaisa</label><textarea className={inp} rows={2} maxLength={600} value={s.easypaisaInstructions || ''} onChange={e => set('easypaisaInstructions', null, e.target.value)} /></div>
      </fieldset>
      <div className="flex items-center gap-3"><button className="px-6 py-3 bg-white text-black uppercase tracking-[0.2em]">Save</button><span className="text-neutral-400">{msg}</span></div>
    </form>
  );
};

const PAY = ['unpaid', 'pending_verification', 'paid', 'failed', 'refunded'] as const;
export const PaymentStatusControl: React.FC<{ token: string; order: Order; onDone: () => void }> = ({ token, order, onDone }) => {
  const [ps, setPs] = useState<string>((order as any).paymentStatus || 'unpaid');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => { setPs((order as any).paymentStatus || 'unpaid'); setMsg(''); }, [order.id]);
  const save = async () => {
    const r = await fetch(`/api/admin/orders/${order.id}/payment`, { method: 'PUT', headers: hdr(token), body: JSON.stringify({ paymentStatus: ps, note }) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? 'Payment status saved.' : j.error || 'Could not save.'); if (r.ok) { setNote(''); onDone(); }
  };
  const d = order.paymentDetails || {};
  return (
    <div className="border border-neutral-800 p-3 mb-4 text-xs space-y-2">
      <div className={lbl}>Payment verification ({order.paymentMethod})</div>
      {order.paymentMethod !== 'cod' && <p className="font-mono text-neutral-300">Transaction ID: {d.transactionId || '—'} · Sender: {d.senderNumber || '—'}<br /><span className="text-neutral-500">Check this ID in your JazzCash / Easypaisa app before marking Paid.</span></p>}
      <div className="flex gap-2 flex-wrap">
        <select value={ps} onChange={e => setPs(e.target.value)} className="bg-neutral-900 border border-neutral-700 p-2 text-white font-mono">{PAY.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}</select>
        <input value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="Note (optional)" className="flex-1 min-w-[140px] bg-neutral-900 border border-neutral-700 p-2 text-white font-mono" />
        <button type="button" onClick={save} className={btn}>Save payment</button>
      </div>
      {msg && <p className="text-neutral-400">{msg}</p>}
    </div>
  );
};
