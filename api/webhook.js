// Lemon Squeezy webhook: marks a student as paid (or refunded) after verifying the signature.
const crypto = require('crypto');
const { admin } = require('./_lib');
function raw(req) {
  return new Promise((ok, no) => {
    if (req.readableEnded && req.body !== undefined) return ok(Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body)));
    const c = []; req.on('data', d => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); req.on('error', no);
  });
}
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const secret = process.env.LS_WEBHOOK_SECRET, a = admin();
  if (!secret || !a) return res.status(500).json({ error: 'Not configured' });
  const body = await raw(req);
  const sig = String(req.headers['x-signature'] || ''), want = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return res.status(401).json({ error: 'Bad signature' });
  let j; try { j = JSON.parse(body.toString('utf8')); } catch (e) { return res.status(400).end(); }
  const ev = j.meta && j.meta.event_name, uid = j.meta && j.meta.custom_data && j.meta.custom_data.uid;
  if (!uid) return res.status(200).json({ ignored: 'no uid' });
  const ref = a.firestore().doc('entitlements/' + uid), at = new Date().toISOString();
  if (ev === 'order_created' && j.data && j.data.attributes && j.data.attributes.status === 'paid') await ref.set({ paid: true, orderId: String(j.data.id), email: j.data.attributes.user_email || '', at }, { merge: true });
  else if (ev === 'order_refunded') await ref.set({ paid: false, refunded: true, at }, { merge: true });
  return res.status(200).json({ ok: true });
};
module.exports.config = { api: { bodyParser: false } };
