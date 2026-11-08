import React, { useState } from 'react';
import { User } from '../types/index.ts';

export const ProfileForm: React.FC<{ user: User; onSaved: (u: User) => void }> = ({ user, onSaved }) => {
  const [fullName, setFullName] = useState(user.fullName || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [msg, setMsg] = useState('');
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('');
    const r = await fetch('/api/account', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('zhar_customer_token') || ''}` }, body: JSON.stringify({ fullName, phone }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setMsg('Profile updated.'); onSaved(j.user); } else setMsg(j.error || 'Could not update profile.');
  };
  const cls = 'w-full bg-black border border-neutral-700 px-3 py-2 text-white text-xs';
  return (
    <form onSubmit={save} className="flex flex-col gap-2 text-xs">
      <label className="text-[10px] uppercase tracking-wider text-neutral-500">Full name</label>
      <input className={cls} value={fullName} maxLength={120} required onChange={e => setFullName(e.target.value)} />
      <label className="text-[10px] uppercase tracking-wider text-neutral-500">Phone</label>
      <input className={cls} value={phone} maxLength={40} onChange={e => setPhone(e.target.value)} />
      <button className="mt-1 py-2 bg-white text-black uppercase tracking-[0.2em]">Save profile</button>
      {msg && <p className="text-neutral-400">{msg}</p>}
    </form>
  );
};
