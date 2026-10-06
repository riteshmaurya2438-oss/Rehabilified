import { format, parseISO } from 'date-fns';

export const inr = (n) => (n <= 0 ? 'Free' : `\u20b9${n.toLocaleString('en-IN')}`);

export const todayISO = () => format(new Date(), 'yyyy-MM-dd');

export const fmtDate = (d) => {
  try {
    return format(parseISO(d), 'EEE, d MMM yyyy');
  } catch {
    return d;
  }
};
export const dayNum = (d) => format(parseISO(d), 'd');
export const monthShort = (d) => format(parseISO(d), 'MMM');
export const weekdayShort = (d) => format(parseISO(d), 'EEE');

export const fmtTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`;
};

export function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function downloadCSV(name, rows) {
  if (!rows.length) return false;
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
