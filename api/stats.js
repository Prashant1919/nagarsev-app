// api/stats.js
// GET /api/stats → summary counts for the dashboard header

const { requireAuth } = require('./_auth');
const { getClient } = require('./_sheets');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const { sheets, SPREADSHEET_ID } = getClient();
  const today = new Date().toISOString().split('T')[0];

  try {
    const [schedRes, recRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Schedule!A2:G' }),
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Records!A2:L' }),
    ]);

    const schedRows = schedRes.data.values || [];
    const recRows   = recRes.data.values   || [];

    const todayMeetings   = schedRows.filter(r => r[0] === today).length;
    const totalGrievances = recRows.length;
    const openGrievances  = recRows.filter(r => (r[7] || 'Open') === 'Open').length;
    const inProgress      = recRows.filter(r => r[7] === 'In Progress').length;
    const resolved        = recRows.filter(r => r[7] === 'Resolved' || r[7] === 'Closed').length;

    return res.status(200).json({
      todayMeetings,
      totalGrievances,
      openGrievances,
      inProgress,
      resolved,
      date: today,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
};
