import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { downloadCSV } from '../../lib/format';
import { audit } from '../../lib/adminAuth';
import { strength } from '../../lib/security';
import { cn } from '../../utils/cn';

export const when = (iso) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export const Pill = ({ children, ok = true }) => (
  <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>{children}</span>
);

export function PasswordInput({ id, value, onChange, placeholder, autoFocus, autoComplete = 'current-password' }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className="field pr-12"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        spellCheck={false}
      />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-royal">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function StrengthMeter({ password }) {
  const s = strength(password);
  const colors = ['bg-red-500', 'bg-red-400', 'bg-amber-400', 'bg-emerald-500', 'bg-emerald-600'];
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i < Math.max(1, s.level) ? colors[s.level] : 'bg-navy/10')} />
        ))}
      </div>
      <p className="mt-1.5 text-xs font-semibold text-navy/60">{s.label}</p>
      {s.tips.length > 0 && <p className="mt-0.5 text-xs text-navy/45">{s.tips.join(' \u00b7 ')}</p>}
    </div>
  );
}

const labelOf = (x) => {
  const r = x;
  return String(r.title ?? r.name ?? r.q ?? r.id ?? '');
};

/* ============ Generic add / edit / delete manager ============ */
export function ResourceManager(p) {
  const [draft, setDraft] = useState(null);
  const read = (k) => draft[k];
  const write = (k, v) => setDraft({ ...draft, [k]: v });

  function save(e) {
    e.preventDefault();
    if (!draft) return;
    for (const f of p.fields) {
      if (f.required && !String(read(f.key) ?? '').trim()) {
        toast.error(`${f.label} is required.`);
        return;
      }
    }
    const isNew = !p.items.some((x) => x.id === draft.id);
    p.onSave(draft);
    audit(`${p.noun} ${isNew ? 'created' : 'updated'}`, labelOf(draft));
    toast.success(`${p.noun} saved.`);
    setDraft(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold">{p.title}</h2>
        {!draft && (
          <button className="btn btn-primary !py-2.5" onClick={() => setDraft(p.blank())}>
            <Plus className="h-4 w-4" /> Add {p.noun.toLowerCase()}
          </button>
        )}
      </div>

      {draft ? (
        <form onSubmit={save} className="mt-5 rounded-3xl border border-royal/15 bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {p.fields.map((f) => (
              <div key={f.key} className={cn(f.type === 'textarea' && 'sm:col-span-2', f.type === 'checkbox' && 'flex items-end')}>
                {f.type === 'checkbox' ? (
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-navy/15 px-4 py-3 text-sm font-semibold">
                    <input type="checkbox" className="h-4 w-4 accent-[#0B6EDC]" checked={Boolean(read(f.key))} onChange={(e) => write(f.key, e.target.checked)} />
                    {f.label}
                  </label>
                ) : (
                  <>
                    <label className="label">
                      {f.label}
                      {f.required && ' *'}
                    </label>
                    {f.type === 'textarea' ? (
                      <textarea rows={3} className="field" value={String(read(f.key) ?? '')} onChange={(e) => write(f.key, e.target.value)} />
                    ) : f.type === 'select' ? (
                      <select className="field" value={String(read(f.key) ?? '')} onChange={(e) => write(f.key, e.target.value)}>
                        {f.options?.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input className="field" type={f.type === 'url' ? 'text' : f.type} value={String(read(f.key) ?? '')} onChange={(e) => write(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)} />
                    )}
                    {f.hint && <p className="mt-1 text-xs text-navy/45">{f.hint}</p>}
                  </>
                )}
              </div>
            ))}
          </div>
          {p.extra && p.extra(draft, setDraft)}
          <div className="mt-6 flex gap-3">
            <button className="btn btn-primary">Save {p.noun.toLowerCase()}</button>
            <button type="button" className="btn btn-outline" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-5 space-y-3">
          {p.items.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-navy/55">Nothing here yet. Click &ldquo;Add&rdquo; to create your first one.</p>}
          {p.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-4 rounded-2xl border border-royal/10 bg-white p-4 transition hover:border-royal/30 hover:shadow-md">
              <div className="min-w-0 flex-1">{p.summary(it)}</div>
              <div className="flex shrink-0 gap-2">
                <button className="btn btn-outline !px-3 !py-2" onClick={() => setDraft({ ...it })} aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  className="btn !px-3 !py-2 text-red-600 hover:bg-red-50"
                  aria-label="Delete"
                  onClick={() => {
                    if (window.confirm(`Delete this ${p.noun.toLowerCase()}? This cannot be undone.`)) {
                      p.onDelete(it.id);
                      audit(`${p.noun} deleted`, labelOf(it));
                      toast.success(`${p.noun} deleted.`);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ Data table with CSV export ============ */
export function DataTable({ title, name, rows, cols }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold">
          {title} <span className="text-sm font-medium text-navy/45">({rows.length})</span>
        </h3>
        <button
          className="btn btn-outline !py-2"
          onClick={() => {
            if (!downloadCSV(name, rows.map((r) => Object.fromEntries(cols.map((c) => [c.h, c.csv(r)]))))) toast.error('Nothing to export yet.');
            else audit('CSV exported', name);
          }}
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-royal/10 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-sky text-xs uppercase tracking-wider text-navy/60">
            <tr>
              {cols.map((c) => (
                <th key={c.h} className="px-4 py-3 font-semibold">
                  {c.h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols.length} className="px-4 py-8 text-center text-navy/45">
                  No records yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-royal/10">
                {cols.map((c) => (
                  <td key={c.h} className="px-4 py-3 align-top">
                    {c.v(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
