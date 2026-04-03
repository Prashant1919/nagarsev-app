// api/_auth.js  – reusable token verification middleware
const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || 'change-this-secret-key-in-vercel-env';

function verify(token) {
  try {
    const [datab64, sig] = token.split('.');
    const data = Buffer.from(datab64, 'base64').toString();
    const expected = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
    if (sig !== expected) return null;
    const payload = JSON.parse(data);
    if (payload.exp < Date.now()) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

function requireAuth(req, res) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return null;
  }
  const payload = verify(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
  return payload;
}

module.exports = { requireAuth };
