import { useUI } from './ui';

/**
 * Razorpay integration.
 * - If an API base is set, payments go through a secure backend.
 * - If it is NOT set, a clearly labelled DEMO checkout is shown so the whole flow can be tested.
 */
export const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const LIVE = Boolean(process.env.REACT_APP_BACKEND_URL);

const rid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export function makePayment(req, patch = {}) {
  const n = Date.now().toString(36);
  return {
    id: 'pay-' + rid(),
    email: req.email,
    kind: req.kind,
    refId: req.refId,
    label: req.label,
    amount: req.amount,
    currency: 'INR',
    status: 'paid',
    orderId: `order_demo_${n}`,
    paymentId: `pay_demo_${n}`,
    verified: false,
    mode: 'demo',
    createdAt: new Date().toISOString(),
    ...patch,
  };
}

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the payment window. Please check your connection.'));
    document.body.appendChild(s);
  });
}

async function liveCheckout(req) {
  const res = await fetch(`${API_BASE}/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: req.amount, currency: 'INR', kind: req.kind, refId: req.refId, email: req.email }),
  });
  if (!res.ok) throw new Error('We could not start the payment. Please try again.');
  const order = await res.json();
  await loadRazorpay();

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: 'INR',
      name: 'Rehabilified\u2122',
      description: req.label,
      order_id: order.orderId,
      prefill: { name: req.name, email: req.email, contact: req.phone },
      theme: { color: '#0B6EDC' },
      handler: async (r) => {
        try {
          const v = await fetch(`${API_BASE}/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...r, kind: req.kind, refId: req.refId, email: req.email }),
          });
          const out = await v.json();
          if (!v.ok || !out.verified) throw new Error('Payment verification failed. If you were charged, please contact us on WhatsApp.');
          resolve(makePayment(req, { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, verified: true, mode: 'razorpay' }));
        } catch (e) {
          reject(e);
        }
      },
      modal: { ondismiss: () => resolve(null) },
    });
    rzp.on('payment.failed', () => reject(new Error('The payment failed. You have not been charged.')));
    rzp.open();
  });
}

/** Resolves with a Payment, or null if the user closed the payment window. Rejects on errors. */
export function requestPayment(req) {
  if (LIVE) return liveCheckout(req);
  return new Promise((resolve) => {
    useUI.setState({ pay: { req, resolve } });
  });
}
