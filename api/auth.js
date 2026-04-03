// api/auth.js
// POST /api/auth  – validates credentials, returns a signed session token.
// The token is a simple HMAC-signed string stored in sessionStorage on the client.
// No database, no cookies – the client sends it as Bearer on every request.

const crypto = require('crypto');

const USERS = {
  // Change these before deployment!
  admin: process.env.ADMIN_PASSWORD || 'PMC@2025#Secure',
};

const SECRET = process.env.SESSION_SECRET || 'change-this-secret-key-in-vercel-env';

function sign(payload) {
  const data = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
  return Buffer.from(data).toString('base64') + '.' + sig;
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const expected = USERS[username];
  if (!expected || expected !== password) {
    // Add a small delay to slow brute-force attempts
    await new Promise(r => setTimeout(r, 800));
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const payload = {
    username,
    iat: Date.now(),
    exp: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
  };

  const token = sign(payload);
  return res.status(200).json({ token, username });
};
