import { useState } from 'react';
import toast from 'react-hot-toast';
import { ImageIcon, Plus, Trash2, Upload } from 'lucide-react';
import { newId, useDB } from '../../lib/store';
import { fmtDate, fmtTime, inr, todayISO } from '../../lib/format';
import { fileToDataUrl } from '../../lib/image';
import { audit, IDLE_MS, useAudit, useAuth } from '../../lib/adminAuth';
import { strength } from '../../lib/security';
import { BrandLogoFull, CountUp } from '../../components/ui';
import { DataTable, PasswordInput, Pill, ResourceManager, StrengthMeter, when } from './parts';

/* ---------------- Overview ---------------- */
export function Overview({ go }) {
  const db = useDB();
  const revenue = db.payments.filter((p) => p.status === 'paid').reduce((a, p) => a + p.amount, 0);
  const cards = [
    ['Lectures', db.lectures.length],
    ['Courses', db.courses.length],
    ['Lecture registrations', db.registrations.length],
    ['Course enrollments', db.enrollments.length],
    ['1:1 bookings', db.bookings.filter((b) => b.status === 'confirmed').length],
    ['Patient requests', db.appointments.length],
    ['Open slots', db.slots.filter((s) => !s.booked && s.date >= todayISO()).length],
  ];
  const quick = [
    ['Add a lecture', 'lectures'],
    ['Add a course', 'courses'],
    ['Open new slots', 'slots'],
  ];
  return (
    <div>
      <h2 className="text-xl font-extrabold">Overview</h2>
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(([l, v]) => (
          <div key={l} className="card !p-5">
            <p className="font-display text-3xl font-extrabold text-royal">
              <CountUp value={v} />
            </p>
            <p className="mt-1 text-xs text-navy/55">{l}</p>
          </div>
        ))}
        <div className="card !p-5">
          <p className="break-words font-display text-2xl font-extrabold text-royal sm:text-3xl">{inr(revenue)}</p>
          <p className="mt-1 text-xs text-navy/55">Revenue (paid)</p>
        </div>
      </div>
      <h3 className="mt-10 text-sm font-bold uppercase tracking-widest text-navy/50">Quick actions</h3>
      <div className="mt-3 flex flex-wrap gap-3">
        {quick.map(([l, t]) => (
          <button key={t} className="btn btn-outline" onClick={() => go(t)}>
            {l}
          </button>
        ))}
      </div>
      <div className="mt-10 rounded-2xl bg-sky p-5 text-sm leading-relaxed text-navy/75">
        <p className="font-bold text-navy">How this works</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Your content (lectures, courses, testimonials, FAQs, numbers, settings) is saved on the server, so edits appear on <strong>every device</strong> for all visitors.</li>
          <li>Testimonials, homepage numbers and course links are <strong>placeholders</strong> until you replace them.</li>
          <li>Payments are verified securely on the server. See the Security tab for details.</li>
        </ul>
      </div>
      <button
        className="btn btn-outline mt-6"
        onClick={() => {
          if (window.confirm('Reset ALL website data back to the sample content? Registrations, payments and bookings will be erased.')) {
            db.resetAll();
            audit('Website data reset to sample content');
            toast.success('Sample data restored.');
          }
        }}
      >
        Reset to sample data
      </button>
    </div>
  );
}

/* ---------------- Lectures ---------------- */
export function Lectures() {
  const items = useDB((s) => s.lectures);
  const save = useDB((s) => s.saveLecture);
  const del = useDB((s) => s.removeLecture);
  return (
    <ResourceManager
      title="Lectures"
      noun="Lecture"
      items={items}
      onSave={save}
      onDelete={del}
      blank={() => ({ id: newId(), title: '', description: '', date: todayISO(), time: '19:00', mode: 'Online', price: 0, seats: 100, joinLink: '', published: true })}
      fields={[
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'textarea', required: true },
        { key: 'date', label: 'Date', type: 'date', required: true },
        { key: 'time', label: 'Time (IST)', type: 'time', required: true },
        { key: 'mode', label: 'Mode', type: 'select', options: ['Online', 'In-person', 'Hybrid'] },
        { key: 'price', label: 'Price (\u20b9)', type: 'number', hint: 'Enter 0 for a free lecture' },
        { key: 'seats', label: 'Total seats', type: 'number' },
        { key: 'joinLink', label: 'Join link (Meet / Zoom)', type: 'url', hint: 'Shown to registered students only' },
        { key: 'published', label: 'Published (visible on website)', type: 'checkbox' },
      ]}
      summary={(l) => (
        <>
          <p className="truncate font-bold">
            {l.title} {!l.published && <Pill ok={false}>Hidden</Pill>}
          </p>
          <p className="text-xs text-navy/55">
            {fmtDate(l.date)} &middot; {fmtTime(l.time)} &middot; {l.mode} &middot; {inr(l.price)} &middot; {l.seats} seats
          </p>
        </>
      )}
    />
  );
}

/* ---------------- Courses & lessons ---------------- */
export function Courses() {
  const items = useDB((s) => s.courses);
  const save = useDB((s) => s.saveCourse);
  const del = useDB((s) => s.removeCourse);
  return (
    <ResourceManager
      title="Courses"
      noun="Course"
      items={items}
      onSave={save}
      onDelete={del}
      blank={() => ({ id: newId(), title: '', description: '', thumbnail: '', price: 999, link: '', published: true })}
      fields={[
        { key: 'title', label: 'Course title', type: 'text', required: true },
        { key: 'price', label: 'Price (\u20b9)', type: 'number' },
        { key: 'description', label: 'Description', type: 'textarea', required: true },
        { key: 'link', label: 'Course access link', type: 'url', required: true, hint: 'Buyers get this link automatically after a successful payment (e.g. Google Drive, Notion, YouTube playlist).' },
        { key: 'thumbnail', label: 'Thumbnail', type: 'image', hint: 'Upload an image or paste a URL. A blue gradient is used if empty.' },
        { key: 'published', label: 'Published (visible on website)', type: 'checkbox' },
      ]}
      summary={(c) => (
        <>
          <p className="truncate font-bold">
            {c.title} {!c.published && <Pill ok={false}>Hidden</Pill>}
          </p>
          <p className="truncate text-xs text-navy/55">
            {inr(c.price)} &middot; {c.link || 'No link set'}
          </p>
        </>
      )}
    />
  );
}

/* ---------------- Slots ---------------- */
export function SlotsTab() {
  const slots = useDB((s) => s.slots);
  const addSlots = useDB((s) => s.addSlots);
  const removeSlot = useDB((s) => s.removeSlot);
  const [kind, setKind] = useState('consultation');
  const [date, setDate] = useState(todayISO());
  const [times, setTimes] = useState('10:00, 12:00, 16:00');

  function add(e) {
    e.preventDefault();
    const list = times
      .split(',')
      .map((t) => t.trim())
      .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
      .map((t) => t.padStart(5, '0'));
    if (!list.length) return void toast.error('Enter times like 10:00, 12:30');
    const n = addSlots(kind, date, list);
    if (n) audit('Slots added', `${n} \u00d7 ${kind} on ${date}`);
    toast.success(n ? `${n} slot${n > 1 ? 's' : ''} added.` : 'Those slots already exist.');
  }

  const upcoming = slots.filter((s) => s.date >= todayISO()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return (
    <div>
      <h2 className="text-xl font-extrabold">Availability slots</h2>
      <form onSubmit={add} className="mt-5 grid gap-4 rounded-3xl border border-royal/15 bg-white p-6 sm:grid-cols-4">
        <div>
          <label className="label">For</label>
          <select className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="consultation">1:1 consultations</option>
            <option value="patient">Patient appointments</option>
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Times (comma separated, 24h IST)</label>
          <input className="field" value={times} onChange={(e) => setTimes(e.target.value)} />
        </div>
        <div className="sm:col-span-4">
          <button className="btn btn-primary">
            <Plus className="h-4 w-4" /> Add slots
          </button>
        </div>
      </form>
      <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {upcoming.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-royal/10 bg-white px-4 py-3 text-sm">
            <div>
              <p className="font-semibold">
                {fmtDate(s.date)} &middot; {fmtTime(s.time)}
              </p>
              <p className="text-xs text-navy/50">{s.kind === 'consultation' ? '1:1 consultation' : 'Patient appointment'}</p>
            </div>
            {s.booked ? (
              <Pill>Booked</Pill>
            ) : (
              <button className="rounded-full p-2 text-red-600 hover:bg-red-50" aria-label="Delete slot" onClick={() => removeSlot(s.id)}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Registrations / payments / appointments ---------------- */
export function Registrations() {
  const regs = useDB((s) => s.registrations);
  const enrolls = useDB((s) => s.enrollments);
  const lectures = useDB((s) => s.lectures);
  const courses = useDB((s) => s.courses);
  const lt = (id) => lectures.find((l) => l.id === id)?.title ?? '\u2014';
  const ct = (id) => courses.find((c) => c.id === id)?.title ?? '\u2014';
  return (
    <div className="space-y-10">
      <DataTable
        title="Lecture registrations"
        name="lecture-registrations"
        rows={regs}
        cols={[
          { h: 'Date', v: (r) => when(r.createdAt), csv: (r) => r.createdAt },
          { h: 'Name', v: (r) => r.name, csv: (r) => r.name },
          { h: 'Email', v: (r) => r.email, csv: (r) => r.email },
          { h: 'Phone', v: (r) => r.phone, csv: (r) => r.phone },
          { h: 'Lecture', v: (r) => lt(r.lectureId), csv: (r) => lt(r.lectureId) },
          { h: 'Paid', v: (r) => inr(r.amount), csv: (r) => r.amount },
        ]}
      />
      <DataTable
        title="Course enrollments"
        name="course-enrollments"
        rows={enrolls}
        cols={[
          { h: 'Date', v: (r) => when(r.createdAt), csv: (r) => r.createdAt },
          { h: 'Name', v: (r) => r.name, csv: (r) => r.name },
          { h: 'Email', v: (r) => r.email, csv: (r) => r.email },
          { h: 'Phone', v: (r) => r.phone, csv: (r) => r.phone },
          { h: 'Course', v: (r) => ct(r.courseId), csv: (r) => ct(r.courseId) },
          { h: 'Paid', v: (r) => inr(r.amount), csv: (r) => r.amount },
        ]}
      />
    </div>
  );
}

export function PaymentsTab() {
  const payments = useDB((s) => s.payments);
  return (
    <DataTable
      title="Payments"
      name="payments"
      rows={payments}
      cols={[
        { h: 'Date', v: (r) => when(r.createdAt), csv: (r) => r.createdAt },
        { h: 'Email', v: (r) => r.email, csv: (r) => r.email },
        { h: 'Item', v: (r) => r.label, csv: (r) => r.label },
        { h: 'Amount', v: (r) => inr(r.amount), csv: (r) => r.amount },
        { h: 'Status', v: (r) => <Pill ok={r.status === 'paid'}>{r.status}</Pill>, csv: (r) => r.status },
        { h: 'Mode', v: (r) => (r.mode === 'demo' ? 'Demo' : 'Razorpay'), csv: (r) => r.mode },
        { h: 'Signature verified', v: (r) => (r.verified ? 'Yes' : 'No'), csv: (r) => (r.verified ? 'yes' : 'no') },
        { h: 'Order ID', v: (r) => <span className="text-xs">{r.orderId}</span>, csv: (r) => r.orderId },
        { h: 'Payment ID', v: (r) => <span className="text-xs">{r.paymentId}</span>, csv: (r) => r.paymentId },
      ]}
    />
  );
}

export function AppointmentsTab() {
  const appts = useDB((s) => s.appointments);
  const bookings = useDB((s) => s.bookings);
  const slots = useDB((s) => s.slots);
  const setStatus = useDB((s) => s.setAppointmentStatus);
  const cancelBooking = useDB((s) => s.cancelBooking);
  const slotText = (id) => {
    const s = slots.find((x) => x.id === id);
    return s ? `${fmtDate(s.date)} \u00b7 ${fmtTime(s.time)}` : '\u2014';
  };
  return (
    <div className="space-y-10">
      <DataTable
        title="Patient appointments"
        name="patient-appointments"
        rows={appts}
        cols={[
          { h: 'Requested', v: (r) => when(r.createdAt), csv: (r) => r.createdAt },
          { h: 'Appointment', v: (r) => `${fmtDate(r.date)} \u00b7 ${fmtTime(r.time)}`, csv: (r) => `${r.date} ${r.time}` },
          { h: 'Name', v: (r) => r.name, csv: (r) => r.name },
          { h: 'Phone', v: (r) => r.phone, csv: (r) => r.phone },
          { h: 'Concern', v: (r) => <span className="line-clamp-3 max-w-xs">{r.concern}</span>, csv: (r) => r.concern },
          {
            h: 'Status',
            v: (r) => (
              <select
                className="field !w-auto !py-1.5 !text-xs"
                value={r.status}
                onChange={(e) => {
                  setStatus(r.id, e.target.value);
                  audit('Appointment status changed', `${r.name} \u2192 ${e.target.value}`);
                }}
              >
                <option value="requested">requested</option>
                <option value="confirmed">confirmed</option>
                <option value="cancelled">cancelled</option>
              </select>
            ),
            csv: (r) => r.status,
          },
        ]}
      />
      <DataTable
        title="1:1 consultation bookings"
        name="consultation-bookings"
        rows={bookings}
        cols={[
          { h: 'Booked', v: (r) => when(r.createdAt), csv: (r) => r.createdAt },
          { h: 'Session', v: (r) => slotText(r.slotId), csv: (r) => slotText(r.slotId) },
          { h: 'Name', v: (r) => r.name, csv: (r) => r.name },
          { h: 'Email', v: (r) => r.email, csv: (r) => r.email },
          { h: 'Phone', v: (r) => r.phone, csv: (r) => r.phone },
          { h: 'Goal', v: (r) => <span className="line-clamp-3 max-w-xs">{r.goal}</span>, csv: (r) => r.goal },
          {
            h: 'Status',
            v: (r) =>
              r.status === 'confirmed' ? (
                <button
                  className="text-xs font-semibold text-red-600 hover:underline"
                  onClick={() => {
                    if (window.confirm('Cancel this booking and release the slot?')) {
                      cancelBooking(r.id);
                      audit('Consultation cancelled', r.name);
                    }
                  }}
                >
                  Cancel
                </button>
              ) : (
                <Pill ok={false}>cancelled</Pill>
              ),
            csv: (r) => r.status,
          },
        ]}
      />
    </div>
  );
}

/* ---------------- Testimonials & FAQs ---------------- */
export function ContentTab() {
  const testimonials = useDB((s) => s.testimonials);
  const faqs = useDB((s) => s.faqs);
  const db = useDB();
  return (
    <div className="space-y-14">
      <ResourceManager
        title="Testimonials"
        noun="Testimonial"
        items={testimonials}
        onSave={db.saveTestimonial}
        onDelete={db.removeTestimonial}
        blank={() => ({ id: newId(), name: '', role: '', text: '', rating: 5, published: true })}
        fields={[
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'role', label: 'Role / institution', type: 'text' },
          { key: 'text', label: 'Testimonial', type: 'textarea', required: true },
          { key: 'rating', label: 'Rating (1\u20135)', type: 'number' },
          { key: 'published', label: 'Published', type: 'checkbox' },
        ]}
        summary={(t) => (
          <>
            <p className="truncate font-bold">
              {t.name} {!t.published && <Pill ok={false}>Hidden</Pill>}
            </p>
            <p className="truncate text-xs text-navy/55">{t.text}</p>
          </>
        )}
      />
      <ResourceManager
        title="FAQs"
        noun="FAQ"
        items={faqs}
        onSave={db.saveFaq}
        onDelete={db.removeFaq}
        blank={() => ({ id: newId(), q: '', a: '', published: true })}
        fields={[
          { key: 'q', label: 'Question', type: 'text', required: true },
          { key: 'a', label: 'Answer', type: 'textarea', required: true },
          { key: 'published', label: 'Published', type: 'checkbox' },
        ]}
        summary={(f) => (
          <>
            <p className="truncate font-bold">
              {f.q} {!f.published && <Pill ok={false}>Hidden</Pill>}
            </p>
            <p className="truncate text-xs text-navy/55">{f.a}</p>
          </>
        )}
      />
    </div>
  );
}

/* ---------------- Homepage numbers + settings ---------------- */
export function HomepageTab() {
  const stats = useDB((s) => s.stats);
  const settings = useDB((s) => s.settings);
  const setStats = useDB((s) => s.setStats);
  const setSettings = useDB((s) => s.setSettings);
  const [st, setSt] = useState(stats);
  const [price, setPrice] = useState(settings.consultationPrice);
  const [price30, setPrice30] = useState(settings.consultation30Price || 799);
  const [price60, setPrice60] = useState(settings.consultation60Price || 999);
  const [formUrl, setFormUrl] = useState(settings.consultationFormUrl || '');
  const [wa, setWa] = useState(settings.whatsapp);
  const [ig, setIg] = useState(settings.instagram);
  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-extrabold">Homepage numbers</h2>
        <p className="mt-1 text-sm text-navy/55">These count up in the About section. They are placeholders: enter your real figures.</p>
        <div className="mt-5 space-y-3">
          {st.map((s, i) => (
            <div key={s.id} className="grid gap-3 rounded-2xl border border-royal/10 bg-white p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <input className="field" value={s.label} onChange={(e) => setSt(st.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)))} />
              <input type="number" step="any" className="field" value={s.value} onChange={(e) => setSt(st.map((x, n) => (n === i ? { ...x, value: Number(e.target.value) } : x)))} />
              <input className="field" value={s.suffix} placeholder="+ or /5" onChange={(e) => setSt(st.map((x, n) => (n === i ? { ...x, suffix: e.target.value } : x)))} />
            </div>
          ))}
        </div>
        <button
          className="btn btn-primary mt-4"
          onClick={() => {
            setStats(st);
            audit('Homepage numbers updated');
            toast.success('Homepage numbers saved.');
          }}
        >
          Save numbers
        </button>
      </div>
      <div>
        <h2 className="text-xl font-extrabold">Site settings</h2>
        <div className="mt-5 space-y-5">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-navy/50">1:1 Consultation pricing &amp; link</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">30-min price (\u20b9)</label>
                <input type="number" className="field" value={price30} onChange={(e) => setPrice30(Number(e.target.value))} />
              </div>
              <div>
                <label className="label">60-min price (\u20b9)</label>
                <input type="number" className="field" value={price60} onChange={(e) => setPrice60(Number(e.target.value))} />
              </div>
              <div>
                <label className="label">Registration form URL</label>
                <input className="field" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://forms.gle/..." />
                <p className="mt-1 text-xs text-navy/40">Shown after successful payment</p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-navy/50">Contact &amp; Social</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">WhatsApp number (with country code)</label>
                <input className="field" value={wa} onChange={(e) => setWa(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div>
                <label className="label">Instagram handle</label>
                <input className="field" value={ig} onChange={(e) => setIg(e.target.value.replace(/^@/, ''))} />
              </div>
            </div>
          </div>
        </div>
        <button
          className="btn btn-primary mt-4"
          onClick={() => {
            setSettings({ ...useDB.getState().settings, consultationPrice: price, consultation30Price: price30, consultation60Price: price60, consultationFormUrl: formUrl, whatsapp: wa, instagram: ig });
            audit('Site settings updated');
            toast.success('Settings saved.');
          }}
        >
          Save settings
        </button>
      </div>
    </div>
  );
}

/* ---------------- Brand: upload logo & founder photo ---------------- */
function ImageCard({ title, hint, preview, hasCustom, onFile, onClear }) {
  return (
    <div className="card !p-5">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1 text-xs text-navy/55">{hint}</p>
      <div className="mt-4 flex aspect-square max-h-72 items-center justify-center overflow-hidden rounded-2xl bg-mist">{preview}</div>
      <div className="mt-4 flex flex-wrap gap-3">
        <label className="btn btn-primary cursor-pointer !py-2.5">
          <Upload className="h-4 w-4" /> Upload image
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        {hasCustom && (
          <button className="btn btn-outline !py-2.5" onClick={onClear}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export function BrandTab() {
  const settings = useDB((s) => s.settings);
  const setSettings = useDB((s) => s.setSettings);

  async function upload(kind, f) {
    try {
      const data = await fileToDataUrl(f, kind === 'logoData' ? 800 : 1100, kind === 'logoData' ? 'image/png' : 'image/jpeg');
      setSettings({ ...useDB.getState().settings, [kind]: data });
      audit(kind === 'logoData' ? 'Logo uploaded' : 'Founder photo uploaded');
      toast.success('Image saved. It now appears across the website.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not use that image.');
    }
  }
  function clear(kind) {
    setSettings({ ...useDB.getState().settings, [kind]: undefined });
    audit(kind === 'logoData' ? 'Logo removed' : 'Founder photo removed');
    toast.success('Removed.');
  }

  return (
    <div>
      <h2 className="text-xl font-extrabold">Logo & founder photo</h2>
      <p className="mt-1 max-w-2xl text-sm text-navy/60">
        Upload your Rehabilified logo and Dr. Sayyeda&rsquo;s photo here. They appear instantly in the navbar, hero, about section and footer. Images are resized automatically.
      </p>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <ImageCard
          title="Logo"
          hint="Square logo works best (PNG or JPG). Until you upload one, the built-in vector logo is used."
          hasCustom={!!settings.logoData}
          onFile={(f) => upload('logoData', f)}
          onClear={() => clear('logoData')}
          preview={settings.logoData ? <img src={settings.logoData} alt="Logo preview" className="h-full w-full object-cover" /> : <BrandLogoFull className="h-full w-full" />}
        />
        <ImageCard
          title="Founder photo"
          hint="A portrait photo of Dr. Sayyeda Uneza Fatima (PNG, JPG or WEBP)."
          hasCustom={!!settings.founderData}
          onFile={(f) => upload('founderData', f)}
          onClear={() => clear('founderData')}
          preview={
            settings.founderData ? (
              <img src={settings.founderData} alt="Founder preview" className="h-full w-full object-cover object-top" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-navy/40">
                <ImageIcon className="h-12 w-12" />
                <span className="text-sm font-semibold">No photo uploaded yet</span>
              </div>
            )
          }
        />
      </div>
      <p className="mt-6 rounded-2xl bg-sky p-4 text-xs leading-relaxed text-navy/70">
        For a permanent launch, you can also place the files at <code>public/images/logo.png</code> and <code>public/images/founder.jpg</code> before publishing. Uploads made here are stored in this browser.
      </p>
    </div>
  );
}

/* ---------------- Security ---------------- */
export function SecurityTab({ onLock }) {
  const change = useAuth((s) => s.change);
  const createdAt = useAuth((s) => s.createdAt);
  const entries = useAudit((s) => s.entries);
  const clear = useAudit((s) => s.clear);
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [nw2, setNw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!strength(nw).ok) return void toast.error('Please choose a stronger new password.');
    if (nw !== nw2) return void toast.error('The new passwords do not match.');
    setBusy(true);
    const r = await change(cur, nw);
    setBusy(false);
    if (!r.ok) return void toast.error(r.error);
    setCode(r.code ?? '');
    setCur('');
    setNw('');
    setNw2('');
    toast.success('Password changed. Save your NEW recovery code below.');
  }

  const safeguards = [
    'No default password: you created it yourself. Only a salted bcrypt hash is stored, on the server.',
    '5 wrong attempts triggers a lockout that doubles each time (5 \u2192 10 \u2192 20 \u2192 60 min).',
    `Auto-lock after ${IDLE_MS / 60000} minutes of inactivity and a hard 8-hour session limit.`,
    'Sign-in is checked by the server, so admin access cannot be created or unlocked from another browser.',
    'Session lives in this tab only and ends when you close it or sign out.',
    'Every sign-in, failed attempt and change made in this browser is written to the activity log below.',
    'Recovery code (shown once) is the only way to reset a forgotten password.',
    'The admin page is hidden from search engines (noindex).',
  ];

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-extrabold">Security</h2>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div className="card !p-6">
            <h3 className="font-bold">Active protections</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-navy/70">
              {safeguards.map((s) => (
                <li key={s} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-navy/50">Admin created {createdAt ? when(createdAt) : '\u2014'} &middot; bcrypt (cost 12), stored on the server</p>
            <button className="btn btn-outline mt-5" onClick={onLock}>
              Lock admin now
            </button>
          </div>

          <form onSubmit={submit} className="card !p-6">
            <h3 className="font-bold">Change password</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="label" htmlFor="cp-cur">Current password</label>
                <PasswordInput id="cp-cur" value={cur} onChange={setCur} />
              </div>
              <div>
                <label className="label" htmlFor="cp-new">New password</label>
                <PasswordInput id="cp-new" value={nw} onChange={setNw} autoComplete="new-password" />
                <StrengthMeter password={nw} />
              </div>
              <div>
                <label className="label" htmlFor="cp-new2">Confirm new password</label>
                <PasswordInput id="cp-new2" value={nw2} onChange={setNw2} autoComplete="new-password" />
              </div>
              <button className="btn btn-primary w-full" disabled={busy || !cur || !nw}>
                {busy ? 'Updating\u2026' : 'Update password'}
              </button>
            </div>
            {code && (
              <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">New recovery code, save it now</p>
                <p className="mt-2 select-all break-all font-mono text-base font-bold tracking-wider text-navy sm:text-lg">{code}</p>
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
        <p className="font-bold">How your admin access works</p>
        <p className="mt-1">
          Your admin password is checked by the <strong>server</strong>, and only a signed-in admin can change website content. Your edits are saved to the server, so they show on every device. Payments are verified server-side. Registrations, enrolments and bookings are still kept in the browser where they were made.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold">Activity log <span className="text-sm font-medium text-navy/45">({entries.length})</span></h3>
          <button className="btn btn-outline !py-2" onClick={() => window.confirm('Clear the activity log?') && clear()}>
            Clear log
          </button>
        </div>
        <div className="mt-3 max-h-96 overflow-y-auto rounded-2xl border border-royal/10 bg-white">
          {entries.length === 0 && <p className="p-8 text-center text-sm text-navy/45">No activity recorded yet.</p>}
          {entries.slice(0, 80).map((e) => (
            <div key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-royal/10 px-4 py-3 text-sm first:border-t-0">
              <p>
                <span className="font-semibold">{e.action}</span>
                {e.detail && <span className="text-navy/55"> &middot; {e.detail}</span>}
              </p>
              <span className="text-xs text-navy/45">{when(e.at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
