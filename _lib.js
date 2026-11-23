// Shared server helpers. Files starting with "_" are not exposed as URLs by Vercel.
let _a = null;
function admin() {
  if (_a) return _a;
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT; if (!raw) return null;
  if (raw.trim()[0] !== '{') raw = Buffer.from(raw, 'base64').toString('utf8');
  const a = require('firebase-admin');
  if (!a.apps.length) a.initializeApp({ credential: a.credential.cert(JSON.parse(raw)) });
  return (_a = a);
}
// Checks the login token and that the student has paid. Returns { uid } or { status, error } or { open:true } when cloud is not configured.
async function authUser(req) {
  const a = admin(); if (!a) return { open: true };
  const h = req.headers.authorization || ''; if (h.slice(0, 7) !== 'Bearer ') return { status: 401, error: 'Please log in first' };
  let uid; try { uid = (await a.auth().verifyIdToken(h.slice(7))).uid; } catch (e) { return { status: 401, error: 'Please log in again' }; }
  const e = await a.firestore().doc('entitlements/' + uid).get();
  if (!e.exists || e.data().paid !== true) return { status: 402, error: 'Unlock your tracker first' };
  return { uid };
}
module.exports = { admin, authUser };
