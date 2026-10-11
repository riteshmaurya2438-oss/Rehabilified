import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, format } from 'date-fns';
import toast from 'react-hot-toast';
import { adminToken, useAdminSession } from './adminAuth';

/**
 * Data layer. Everything on the site is read from this store, and the Admin panel writes to it.
 * It is persisted in the browser (localStorage) so the whole product works end-to-end as a demo.
 */
export const newId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const iso = (n) => format(addDays(new Date(), n), 'yyyy-MM-dd');
const now = () => new Date().toISOString();
const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const L = (id, module, title, duration) => ({ id, module, title, duration, videoUrl: SAMPLE_VIDEO });

function seedSlots() {
  const out = [];
  for (let d = 1; d <= 10; d++) {
    if (addDays(new Date(), d).getDay() === 0) continue; // closed on Sundays
    const date = iso(d);
    ['11:00', '16:00', '18:30'].forEach((t) => out.push({ id: `c-${date}-${t}`, kind: 'consultation', date, time: t, booked: false }));
    ['10:00', '12:00', '15:00', '17:00'].forEach((t) => out.push({ id: `p-${date}-${t}`, kind: 'patient', date, time: t, booked: false }));
  }
  return out;
}

function seed() {
  return {
    lectures: [
      {
        id: 'lec-icu-mobilisation',
        title: 'ICU Rehab 101: Early Mobilisation, Done Safely',
        description:
          'A practical walkthrough of safety screening, readiness criteria and step-wise mobilisation for critically ill and ventilated patients, with real bedside decision points.',
        date: iso(6),
        time: '19:00',
        mode: 'Online',
        price: 0,
        seats: 120,
        joinLink: 'https://meet.google.com/',
        published: true,
      },
      {
        id: 'lec-clinical-reasoning',
        title: 'Clinical Reasoning for Physios: From Assessment to Goals',
        description:
          'Learn a repeatable framework to move from patient interview to a defensible assessment, a clinical hypothesis and measurable, patient-centred goals.',
        date: iso(13),
        time: '19:00',
        mode: 'Online',
        price: 499,
        seats: 80,
        joinLink: 'https://meet.google.com/',
        published: true,
      },
      {
        id: 'lec-resp-icu',
        title: 'Respiratory Physiotherapy in the ICU: What to Do and When',
        description:
          'Secretion clearance, positioning, ventilator basics and weaning support, explained from the physiotherapist\u2019s point of view with clear do\u2019s and don\u2019ts.',
        date: iso(20),
        time: '18:30',
        mode: 'Online',
        price: 799,
        seats: 50,
        joinLink: 'https://meet.google.com/',
        published: true,
      },
    ],
    courses: [
      {
        id: 'course-icu-foundations',
        title: 'ICU Rehab Foundations',
        description:
          'A structured, video-led programme on ICU rehabilitation: from understanding monitors and lines to progressive mobilisation and team communication.',
        thumbnail: '',
        price: 2499,
        link: 'https://your-course-link.example.com/icu-foundations',
        published: true,
      },
      {
        id: 'course-clinical-reasoning',
        title: 'Clinical Reasoning Bootcamp',
        description:
          'Build the thinking habits of a confident clinician: structured assessment, hypothesis testing, outcome measures and goal setting.',
        thumbnail: '',
        price: 1799,
        link: 'https://your-course-link.example.com/clinical-reasoning',
        published: true,
      },
    ],
    slots: seedSlots(),
    registrations: [],
    enrollments: [],
    bookings: [],
    appointments: [],
    payments: [],
    testimonials: [
      {
        id: 't1',
        name: 'Student name',
        role: 'Placeholder \u00b7 replace in Admin \u2192 Testimonials',
        text: 'Add a real student testimonial here from the Admin panel. Short, specific stories about what changed in their clinical confidence work best.',
        rating: 5,
        published: true,
      },
      {
        id: 't2',
        name: 'Physiotherapist name',
        role: 'Placeholder \u00b7 replace in Admin \u2192 Testimonials',
        text: 'This is placeholder text. Edit or delete it in the Admin panel and publish genuine feedback from your lecture attendees.',
        rating: 5,
        published: true,
      },
      {
        id: 't3',
        name: 'Intern name',
        role: 'Placeholder \u00b7 replace in Admin \u2192 Testimonials',
        text: 'Placeholder testimonial. Every testimonial on this page can be edited, hidden or removed without touching any code.',
        rating: 5,
        published: true,
      },
    ],
    faqs: [
      { id: 'f1', q: 'Who are the lectures and courses for?', a: 'Physiotherapy students, interns, early-career clinicians and practising physiotherapists who want to understand how theory is applied at the bedside and in the clinic.', published: true },
      { id: 'f2', q: 'How do I join a live lecture?', a: 'Once you register, your join link appears on the thank-you page and in your dashboard under My Registrations, and a confirmation email is sent to you.', published: true },
      { id: 'f3', q: 'Are payments secure?', a: 'Yes. Payments are processed in INR by Razorpay. Card and UPI details are entered in Razorpay\u2019s secure window and are never seen or stored by this website.', published: true },
      { id: 'f4', q: 'What happens after I buy a course?', a: 'Your modules and video lessons unlock immediately in Dashboard \u2192 My Courses. You can track your progress lesson by lesson.', published: true },
      { id: 'f5', q: 'Can I change my 1:1 consultation slot?', a: 'Message us on WhatsApp as early as possible and we will help you move to another available slot.', published: true },
      { id: 'f6', q: 'Is the patient appointment form for emergencies?', a: 'No. It is for non-urgent physiotherapy concerns only. In an emergency, call your local emergency number (112 in India) or go to the nearest hospital.', published: true },
    ],
    stats: [
      { id: 's1', label: 'Physios taught & mentored', value: 1500, suffix: '+' },
      { id: 's2', label: 'Years in ICU & cardio rehab', value: 6, suffix: '+' },
      { id: 's3', label: 'Workshops & talks delivered', value: 40, suffix: '+' },
      { id: 's4', label: 'Average learner rating', value: 4.9, suffix: '/5' },
    ],
    settings: { consultationPrice: 999, consultation30Price: 799, consultation60Price: 999, consultationFormUrl: 'https://forms.gle/SdUuf9npWgMxzNpj8', whatsapp: '917303995608', instagram: 'rehabilified', instagramUrl: 'https://www.instagram.com/rehabilified?stkn=MXM5M2xuNzJuYXMzbg==', email: '' },
    progress: {},
  };
}

const SLOT_API = `${process.env.REACT_APP_BACKEND_URL}/api/slots`;
function syncSlot(slotId, booked) {
  fetch(`${SLOT_API}/${encodeURIComponent(slotId)}/${booked ? 'book' : 'release'}`, { method: 'POST' }).catch(() => {});
}

/* ---------- Server-backed purchases ---------- */
const PURCHASES_API = `${process.env.REACT_APP_BACKEND_URL}/api/purchases`;

export async function fetchPurchases() {
  try {
    const res = await fetch(PURCHASES_API, { credentials: 'include' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function cancelPurchaseOnServer(purchaseId) {
  try {
    const res = await fetch(`${PURCHASES_API}/${purchaseId}/cancel`, { method: 'PATCH', credentials: 'include' });
    return res.ok;
  } catch {
    return false;
  }
}

const upsert = (arr, item) => (arr.some((x) => x.id === item.id) ? arr.map((x) => (x.id === item.id ? item : x)) : [...arr, item]);

export const useDB = create()(
  persist(
    (set, get) => ({
      ...seed(),

      saveLecture: (l) => set((s) => ({ lectures: upsert(s.lectures, l) })),
      removeLecture: (id) => set((s) => ({ lectures: s.lectures.filter((x) => x.id !== id) })),
      saveCourse: (c) => set((s) => ({ courses: upsert(s.courses, c) })),
      removeCourse: (id) => set((s) => ({ courses: s.courses.filter((x) => x.id !== id) })),
      saveTestimonial: (t) => set((s) => ({ testimonials: upsert(s.testimonials, t) })),
      removeTestimonial: (id) => set((s) => ({ testimonials: s.testimonials.filter((x) => x.id !== id) })),
      saveFaq: (f) => set((s) => ({ faqs: upsert(s.faqs, f) })),
      removeFaq: (id) => set((s) => ({ faqs: s.faqs.filter((x) => x.id !== id) })),
      setStats: (stats) => set({ stats }),
      setSettings: (settings) => set({ settings }),

      addSlots: (kind, date, times) => {
        let added = 0;
        set((s) => {
          const next = [...s.slots];
          times.forEach((t) => {
            const id = `${kind === 'consultation' ? 'c' : 'p'}-${date}-${t}`;
            if (!next.some((x) => x.id === id)) {
              next.push({ id, kind, date, time: t, booked: false });
              added++;
            }
          });
          return { slots: next };
        });
        return added;
      },
      removeSlot: (id) => set((s) => ({ slots: s.slots.filter((x) => x.id !== id || x.booked) })),
      addPayment: (p) => set((s) => ({ payments: [p, ...s.payments] })),

      checkLecture: (lectureId, email) => {
        const s = get();
        const lec = s.lectures.find((l) => l.id === lectureId);
        if (!lec) return 'This lecture is no longer available.';
        if (s.registrations.some((r) => r.lectureId === lectureId && r.email.toLowerCase() === email.toLowerCase()))
          return 'You are already registered for this lecture.';
        if (s.registrations.filter((r) => r.lectureId === lectureId).length >= lec.seats) return 'Sorry, this lecture is now full.';
        return null;
      },
      checkSlot: (slotId) => {
        const slot = get().slots.find((x) => x.id === slotId);
        if (!slot) return 'That time slot no longer exists. Please pick another.';
        if (slot.booked) return 'Sorry, that slot has just been taken. Please pick another.';
        return null;
      },

      registerLecture: ({ lectureId, user, phone, amount, paymentId }) => {
        const err = get().checkLecture(lectureId, user.email);
        if (err) return { ok: false, error: err };
        const registration = {
          id: newId(), lectureId, userId: user.id, name: user.name, email: user.email, phone, amount, paymentId, createdAt: now(),
        };
        set((s) => ({ registrations: [registration, ...s.registrations] }));
        return { ok: true, data: registration };
      },

      enroll: ({ courseId, user, phone, amount, paymentId }) => {
        const s = get();
        if (!s.courses.some((c) => c.id === courseId)) return { ok: false, error: 'This course is no longer available.' };
        const existing = s.enrollments.find((e) => e.courseId === courseId && e.userId === user.id);
        if (existing) return { ok: true, data: existing };
        const enrollment = {
          id: newId(), courseId, userId: user.id, name: user.name, email: user.email, phone, amount, paymentId, createdAt: now(),
        };
        set((st) => ({ enrollments: [enrollment, ...st.enrollments] }));
        return { ok: true, data: enrollment };
      },

      bookConsultation: ({ slotId, user, phone, goal, amount, paymentId }) => {
        const err = get().checkSlot(slotId);
        if (err) return { ok: false, error: err };
        const booking = {
          id: newId(), slotId, userId: user.id, name: user.name, email: user.email, phone, goal, amount, paymentId, status: 'confirmed', createdAt: now(),
        };
        set((s) => ({
          bookings: [booking, ...s.bookings],
          slots: s.slots.map((x) => (x.id === slotId ? { ...x, booked: true } : x)),
        }));
        syncSlot(slotId, true);
        return { ok: true, data: booking };
      },

      requestAppointment: ({ slotId, name, phone, concern }) => {
        const err = get().checkSlot(slotId);
        if (err) return { ok: false, error: err };
        const slot = get().slots.find((x) => x.id === slotId);
        const appt = { id: newId(), slotId, name, phone, concern, date: slot.date, time: slot.time, status: 'requested', createdAt: now() };
        set((s) => ({
          appointments: [appt, ...s.appointments],
          slots: s.slots.map((x) => (x.id === slotId ? { ...x, booked: true } : x)),
        }));
        syncSlot(slotId, true);
        return { ok: true, data: appt };
      },

      cancelBooking: (id) =>
        set((s) => {
          const b = s.bookings.find((x) => x.id === id);
          if (!b) return {};
          syncSlot(b.slotId, false);
          return {
            bookings: s.bookings.map((x) => (x.id === id ? { ...x, status: 'cancelled' } : x)),
            slots: s.slots.map((x) => (x.id === b.slotId ? { ...x, booked: false } : x)),
          };
        }),

      setAppointmentStatus: (id, status) =>
        set((s) => {
          const a = s.appointments.find((x) => x.id === id);
          if (!a) return {};
          syncSlot(a.slotId, status !== 'cancelled');
          return {
            appointments: s.appointments.map((x) => (x.id === id ? { ...x, status } : x)),
            slots: s.slots.map((x) => (x.id === a.slotId ? { ...x, booked: status !== 'cancelled' } : x)),
          };
        }),

      toggleLesson: (key, lessonId) =>
        set((s) => {
          const cur = s.progress[key] ?? [];
          const next = cur.includes(lessonId) ? cur.filter((x) => x !== lessonId) : [...cur, lessonId];
          return { progress: { ...s.progress, [key]: next } };
        }),

      resetAll: () => set({ ...seed() }),
    }),
    { name: 'rehabilified-db-v5' },
  ),
);

/* ---------- Server sync: Admin edits are shared across ALL devices ---------- */
const CONTENT_API = `${process.env.REACT_APP_BACKEND_URL}/api/content`;
let _hydrating = false;
let _syncTimer;

function contentSnapshot(s) {
  return { lectures: s.lectures, courses: s.courses, testimonials: s.testimonials, faqs: s.faqs, stats: s.stats, settings: s.settings, slots: s.slots };
}
let _pendingPush = false;
function pushContent() {
  const token = adminToken();
  if (!token) return;
  fetch(CONTENT_API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(contentSnapshot(useDB.getState())),
  })
    .then((res) => {
      if (res.ok) {
        _pendingPush = false;
      } else if (res.status === 401) {
        _pendingPush = true;
        useAdminSession.getState().expire();
        toast.error('Your admin session expired. Sign in again to save your latest change.');
      } else {
        toast.error('Could not save your change to the server. Please try again.');
      }
    })
    .catch(() => toast.error('Could not reach the server. Your latest change was not saved.'));
}

/** After an admin signs in: save a change that failed because the session had expired, otherwise load the latest server content. */
export function syncAfterLogin() {
  if (_pendingPush) {
    pushContent();
    return Promise.resolve();
  }
  return hydrateContent();
}
let _prevContent = JSON.stringify(contentSnapshot(useDB.getState()));
useDB.subscribe((s) => {
  if (_hydrating) return;
  const cur = JSON.stringify(contentSnapshot(s));
  if (cur !== _prevContent) {
    _prevContent = cur;
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(pushContent, 500);
  }
});

export async function hydrateContent() {
  try {
    const res = await fetch(CONTENT_API);
    if (!res.ok) return;
    const d = await res.json();
    if (d && Array.isArray(d.lectures)) {
      _hydrating = true;
      useDB.setState({
        lectures: d.lectures,
        courses: d.courses ?? [],
        testimonials: d.testimonials ?? [],
        faqs: d.faqs ?? [],
        stats: d.stats ?? [],
        settings: d.settings ?? useDB.getState().settings,
        slots: d.slots ?? [],
      });
      _prevContent = JSON.stringify(contentSnapshot(useDB.getState()));
      _hydrating = false;
    } else {
      // Server has no content yet — seed it from this device's current content.
      pushContent();
    }
  } catch (e) {
    /* offline — keep local cache */
  }
}

/* ---------- Student session ---------- */
export const useSession = create()(
  persist(
    (set) => ({
      user: null,
      signOut: () => set({ user: null }),
    }),
    { name: 'rehabilified-session' },
  ),
);
