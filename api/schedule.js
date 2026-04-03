// api/schedule.js
// GET    /api/schedule?date=YYYY-MM-DD  → list meetings for a date
// POST   /api/schedule                  → add a new meeting
// DELETE /api/schedule?row=N            → delete meeting at sheet row N

const { requireAuth } = require('./_auth');
const { getClient } = require('./_sheets');

const SHEET = 'Schedule';
// Sheet columns: A=Date, B=Time, C=Title, D=Location, E=Notes, F=Priority, G=RowID

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const { sheets, SPREADSHEET_ID } = getClient();

  // ─── GET: list meetings for a given date ───────────────────────
  if (req.method === 'GET') {
    const date = req.query.date || '';
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET}!A2:G`,
      });

      const rows = response.data.values || [];
      const meetings = rows
        .map((row, idx) => ({
          sheetRow: idx + 2, // 1-indexed, row 1 is header
          date: row[0] || '',
          time: row[1] || '',
          title: row[2] || '',
          location: row[3] || '',
          notes: row[4] || '',
          priority: row[5] || 'Normal',
          id: row[6] || '',
        }))
        .filter(m => !date || m.date === date)
        .sort((a, b) => a.time.localeCompare(b.time));

      return res.status(200).json({ meetings });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to read schedule' });
    }
  }

  // ─── POST: add a new meeting ────────────────────────────────────
  if (req.method === 'POST') {
    const { date, time, title, location, notes, priority } = req.body || {};
    if (!date || !time || !title) {
      return res.status(400).json({ error: 'date, time, and title are required' });
    }

    const id = `SCH-${Date.now()}`;
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET}!A:G`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[date, time, title, location || '', notes || '', priority || 'Normal', id]],
        },
      });
      return res.status(201).json({ success: true, id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to add meeting' });
    }
  }

  // ─── DELETE: remove a row by sheet row number ───────────────────
  if (req.method === 'DELETE') {
    const rowNum = parseInt(req.query.row, 10);
    if (!rowNum || rowNum < 2) {
      return res.status(400).json({ error: 'Valid row number required' });
    }

    try {
      // Get sheet ID for the Schedule tab
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sheetMeta = meta.data.sheets.find(s => s.properties.title === SHEET);
      if (!sheetMeta) return res.status(404).json({ error: 'Sheet tab not found' });

      const sheetId = sheetMeta.properties.sheetId;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowNum - 1, // 0-indexed
                endIndex: rowNum,
              },
            },
          }],
        },
      });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete meeting' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
