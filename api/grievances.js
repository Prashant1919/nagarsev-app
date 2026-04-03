// api/grievances.js
// GET    /api/grievances              → list all grievances (with optional ?status= filter)
// POST   /api/grievances             → log a new grievance
// PATCH  /api/grievances?row=N       → update status/notes for a grievance

const { requireAuth } = require('./_auth');
const { getClient } = require('./_sheets');

const SHEET = 'Records';
// Sheet columns:
// A=GrievanceID, B=Date, C=CitizenName, D=Phone, E=Ward, F=Category,
// G=Description, H=Status, I=Priority, J=FollowUpDate, K=Notes, L=AssignedTo

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const { sheets, SPREADSHEET_ID } = getClient();

  // ─── GET: list grievances ────────────────────────────────────────
  if (req.method === 'GET') {
    const statusFilter = req.query.status || '';
    const search = (req.query.search || '').toLowerCase();

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET}!A2:L`,
      });

      const rows = response.data.values || [];
      let grievances = rows.map((row, idx) => ({
        sheetRow: idx + 2,
        id: row[0] || '',
        date: row[1] || '',
        citizenName: row[2] || '',
        phone: row[3] || '',
        ward: row[4] || '',
        category: row[5] || '',
        description: row[6] || '',
        status: row[7] || 'Open',
        priority: row[8] || 'Normal',
        followUpDate: row[9] || '',
        notes: row[10] || '',
        assignedTo: row[11] || '',
      }));

      if (statusFilter) {
        grievances = grievances.filter(g => g.status === statusFilter);
      }
      if (search) {
        grievances = grievances.filter(g =>
          g.citizenName.toLowerCase().includes(search) ||
          g.id.toLowerCase().includes(search) ||
          g.description.toLowerCase().includes(search) ||
          g.category.toLowerCase().includes(search) ||
          g.ward.toLowerCase().includes(search)
        );
      }

      // Sort: Open/In-Progress first, then by date desc
      grievances.sort((a, b) => {
        const order = { 'Open': 0, 'In Progress': 1, 'Resolved': 2, 'Closed': 3 };
        const oa = order[a.status] ?? 99, ob = order[b.status] ?? 99;
        if (oa !== ob) return oa - ob;
        return b.date.localeCompare(a.date);
      });

      return res.status(200).json({ grievances, total: grievances.length });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to read grievances' });
    }
  }

  // ─── POST: log a new grievance ───────────────────────────────────
  if (req.method === 'POST') {
    const { citizenName, phone, ward, category, description, priority, followUpDate, assignedTo } = req.body || {};

    if (!citizenName || !description) {
      return res.status(400).json({ error: 'citizenName and description are required' });
    }

    const id = `GRV-${Date.now()}`;
    const date = new Date().toISOString().split('T')[0];

    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET}!A:L`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            id, date, citizenName, phone || '', ward || '',
            category || 'General', description,
            'Open', priority || 'Normal',
            followUpDate || '', '', assignedTo || '',
          ]],
        },
      });
      return res.status(201).json({ success: true, id, date });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to log grievance' });
    }
  }

  // ─── PATCH: update status / notes / follow-up for a grievance ────
  if (req.method === 'PATCH') {
    const rowNum = parseInt(req.query.row, 10);
    if (!rowNum || rowNum < 2) {
      return res.status(400).json({ error: 'Valid row number required' });
    }

    const { status, notes, followUpDate, assignedTo } = req.body || {};

    // Build sparse updates: only write columns that are sent
    const updates = [];

    if (status !== undefined)      updates.push({ col: 'H', val: status });
    if (notes !== undefined)       updates.push({ col: 'K', val: notes });
    if (followUpDate !== undefined) updates.push({ col: 'J', val: followUpDate });
    if (assignedTo !== undefined)  updates.push({ col: 'L', val: assignedTo });

    if (!updates.length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    try {
      await Promise.all(updates.map(u =>
        sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET}!${u.col}${rowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[u.val]] },
        })
      ));
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update grievance' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
